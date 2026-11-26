// src/features/recipes/server/index.ts
// /api/recipes: reading is public (like the bar menu); creating, editing and deleting
// need a manager or admin. Uses the RECIPES_DB binding, and PHOTOS once the R2 bucket is added.
import { invalid, json, readJson } from '../../../worker/http';
import type { User } from '../../../worker/auth';
import { PHOTO_MAX_BYTES } from '../shared/photo';
import {
  RecipeBody,
  RESERVED_SLUGS,
  type IngredientDto,
  type RecipeBodyInput,
  type RecipeDto,
  type RecipeSummaryDto,
  type StepDto,
} from '../shared/recipes';

// The photo bucket is optional: until a PHOTOS binding exists in wrangler.jsonc everything else still works.
const photoBucket = (env: Env): R2Bucket | null => (env as { PHOTOS?: R2Bucket }).PHOTOS ?? null;
const noPhotos = () => json({ error: 'Photos are not set up yet' }, { status: 503 });

// ---- Rows and mappers -------------------------------------------------------

type RecipeRow = {
  id: number;
  slug: string;
  title: string;
  category: RecipeDto['category'];
  cook_minutes: number;
  servings: number;
  tint: string;
  photo_bytes: number;
  photo_version: number;
  created_at: string;
  updated_at: string;
};

type IngredientRow = { recipe_id: number; qty: number | null; unit: string | null; name: string };
type StepRow = { recipe_id: number; phase: StepDto['phase']; body: string; minutes: number | null };

const RECIPE_COLUMNS = `id, slug, title, category, cook_minutes,
  servings, tint, photo_bytes, photo_version, created_at, updated_at`;

function toSummary(row: RecipeRow): RecipeSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    cookMinutes: row.cook_minutes,
    servings: row.servings,
    tint: row.tint,
    photoUrl: row.photo_bytes > 0 ? `/api/recipes/${encodeURIComponent(row.slug)}/photo?v=${row.photo_version}` : null,
  };
}

function toRecipe(row: RecipeRow, ingredients: IngredientDto[], steps: StepDto[]): RecipeDto {
  return { ...toSummary(row), ingredients, steps, createdAt: row.created_at, updatedAt: row.updated_at };
}

const toIngredient = (r: IngredientRow): IngredientDto => ({ qty: r.qty, unit: r.unit, name: r.name });
const toStep = (r: StepRow): StepDto => ({ phase: r.phase, body: r.body, minutes: r.minutes });

/** Groups child rows by recipe id, keeping the order the query returned them in. */
function groupBy<T extends { recipe_id: number }, U>(rows: T[], map: (r: T) => U): Map<number, U[]> {
  const out = new Map<number, U[]>();
  for (const r of rows) {
    const list = out.get(r.recipe_id);
    if (list) list.push(map(r));
    else out.set(r.recipe_id, [map(r)]);
  }
  return out;
}

// ---- Helpers ----------------------------------------------------------------

/** Who may create, edit and delete recipes. Returns a Response to send, or null if allowed. */
function denied(user: User | null): Response | null {
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'manager') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

// Plate colors for recipes that don't have one, picked from the slug so it's stable.
const TINTS = ['#8fa65c', '#c48a4e', '#e0b878', '#dd9c58', '#c44a35', '#d8c27e', '#e07840', '#d8b080', '#e8c850'];
function pickTint(slug: string): string {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return base || 'recipe';
}

async function uniqueSlug(env: Env, title: string): Promise<string> {
  const base = slugify(title);
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if ((RESERVED_SLUGS as readonly string[]).includes(slug)) continue;
    const taken = await env.RECIPES_DB.prepare('SELECT 1 AS x FROM recipes WHERE slug = ?')
      .bind(slug)
      .first();
    if (!taken) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Inserts rows in chunks so no statement goes over D1's 100 bound-parameter limit. */
function childInserts(env: Env, recipeId: number, body: RecipeBodyInput): D1PreparedStatement[] {
  const stmts: D1PreparedStatement[] = [];
  const CHUNK = 15;

  for (let i = 0; i < body.ingredients.length; i += CHUNK) {
    const rows = body.ingredients.slice(i, i + CHUNK);
    const placeholders = rows.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = rows.flatMap((r, j) => [recipeId, i + j, r.qty, r.unit || null, r.name]);
    stmts.push(
      env.RECIPES_DB.prepare(
        `INSERT INTO recipe_ingredients (recipe_id, position, qty, unit, name) VALUES ${placeholders}`
      ).bind(...params)
    );
  }

  for (let i = 0; i < body.steps.length; i += CHUNK) {
    const rows = body.steps.slice(i, i + CHUNK);
    const placeholders = rows.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = rows.flatMap((r, j) => [recipeId, i + j, r.phase, r.body, r.minutes]);
    stmts.push(
      env.RECIPES_DB.prepare(
        `INSERT INTO recipe_steps (recipe_id, position, phase, body, minutes) VALUES ${placeholders}`
      ).bind(...params)
    );
  }

  return stmts;
}

async function loadRecipes(env: Env, where: string, binds: unknown[]): Promise<RecipeDto[]> {
  const { results: rows } = await env.RECIPES_DB.prepare(
    `SELECT ${RECIPE_COLUMNS} FROM recipes ${where} ORDER BY title COLLATE NOCASE ASC`
  )
    .bind(...binds)
    .all<RecipeRow>();
  if (rows.length === 0) return [];

  // One query per child table for the whole set, instead of two per recipe.
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(', ');
  const [ing, stp] = await env.RECIPES_DB.batch<IngredientRow | StepRow>([
    env.RECIPES_DB.prepare(
      `SELECT recipe_id, qty, unit, name FROM recipe_ingredients WHERE recipe_id IN (${marks}) ORDER BY recipe_id, position`
    ).bind(...ids),
    env.RECIPES_DB.prepare(
      `SELECT recipe_id, phase, body, minutes FROM recipe_steps WHERE recipe_id IN (${marks}) ORDER BY recipe_id, position`
    ).bind(...ids),
  ]);
  const ingredients = groupBy(ing.results as IngredientRow[], toIngredient);
  const steps = groupBy(stp.results as StepRow[], toStep);

  return rows.map((r) => toRecipe(r, ingredients.get(r.id) ?? [], steps.get(r.id) ?? []));
}

// ---- Router -----------------------------------------------------------------

export async function handleRecipesApiRequest(
  request: Request,
  env: Env,
  user: User | null,
  ctx?: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const [slug, action] = url.pathname.replace(/^\/api\/recipes\/?/, '').split('/').filter(Boolean);

  // /api/recipes
  if (!slug) {
    if (request.method === 'GET') return listRecipes(env);
    if (request.method === 'POST') return createRecipe(request, env, user);
    return json({ error: 'Not found' }, { status: 404 });
  }

  // /api/recipes/:slug/photo
  if (action === 'photo') {
    if (request.method === 'GET') return getPhoto(request, env, ctx, slug);
    if (request.method === 'PUT') return putPhoto(request, env, user, slug);
    if (request.method === 'DELETE') return deletePhoto(request, env, user, slug);
    return json({ error: 'Not found' }, { status: 404 });
  }

  if (action) return json({ error: 'Not found' }, { status: 404 });

  // /api/recipes/:slug
  if (request.method === 'GET') {
    const [recipe] = await loadRecipes(env, 'WHERE slug = ?', [slug]);
    return recipe ? json(recipe) : json({ error: 'Not found' }, { status: 404 });
  }
  if (request.method === 'PUT') return replaceRecipe(request, env, user, slug);
  if (request.method === 'DELETE') return deleteRecipe(env, user, slug);

  return json({ error: 'Not found' }, { status: 404 });
}

// ---- Handlers ---------------------------------------------------------------

async function listRecipes(env: Env): Promise<Response> {
  const { results } = await env.RECIPES_DB.prepare(
    `SELECT ${RECIPE_COLUMNS}
     FROM recipes
     ORDER BY title COLLATE NOCASE ASC`
  ).all<RecipeRow>();

  return json(results.map(toSummary));
}

async function createRecipe(request: Request, env: Env, user: User | null): Promise<Response> {
  const d = denied(user);
  if (d) return d;

  const parsed = RecipeBody.safeParse(await readJson(request));
  if (!parsed.success) return invalid(parsed.error);
  const b = parsed.data;

  const slug = await uniqueSlug(env, b.title);
  const row = await env.RECIPES_DB.prepare(
    `INSERT INTO recipes (slug, title, category, cook_minutes,
                          servings, tint)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING id`
  )
    .bind(slug, b.title, b.category, b.cookMinutes,
          b.servings, (b.tint ?? pickTint(slug)).toLowerCase())
    .first<{ id: number }>();
  if (!row) return json({ error: 'Could not create recipe' }, { status: 500 });

  const children = childInserts(env, row.id, b);
  if (children.length > 0) {
    try {
      await env.RECIPES_DB.batch(children);
    } catch {
      // Don't leave a recipe with no ingredients or steps behind.
      await env.RECIPES_DB.prepare('DELETE FROM recipes WHERE id = ?').bind(row.id).run();
      return json({ error: 'Could not create recipe' }, { status: 500 });
    }
  }

  const [recipe] = await loadRecipes(env, 'WHERE id = ?', [row.id]);
  return json(recipe, { status: 201 });
}

async function replaceRecipe(request: Request, env: Env, user: User | null, slug: string): Promise<Response> {
  const d = denied(user);
  if (d) return d;

  const parsed = RecipeBody.safeParse(await readJson(request));
  if (!parsed.success) return invalid(parsed.error);
  const b = parsed.data;

  const existing = await env.RECIPES_DB.prepare('SELECT id FROM recipes WHERE slug = ?')
    .bind(slug)
    .first<{ id: number }>();
  if (!existing) return json({ error: 'Not found' }, { status: 404 });
  const id = existing.id;

  // One batch, so a failure part-way leaves the old recipe untouched. The slug never changes.
  await env.RECIPES_DB.batch([
    env.RECIPES_DB.prepare(
      `UPDATE recipes SET title = ?, category = ?, cook_minutes = ?,
              servings = ?, tint = COALESCE(?, tint),
              updated_at = datetime('now')
       WHERE id = ?`
    ).bind(b.title, b.category, b.cookMinutes,
           b.servings, b.tint?.toLowerCase() ?? null, id),
    env.RECIPES_DB.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').bind(id),
    env.RECIPES_DB.prepare('DELETE FROM recipe_steps WHERE recipe_id = ?').bind(id),
    ...childInserts(env, id, b),
  ]);

  const [recipe] = await loadRecipes(env, 'WHERE id = ?', [id]);
  return json(recipe);
}

async function deleteRecipe(env: Env, user: User | null, slug: string): Promise<Response> {
  const d = denied(user);
  if (d) return d;

  const existing = await env.RECIPES_DB.prepare('SELECT id FROM recipes WHERE slug = ?')
    .bind(slug)
    .first<{ id: number }>();
  if (!existing) return json({ error: 'Not found' }, { status: 404 });

  await photoBucket(env)?.delete(photoKey(existing.id)); // no-op when there is no photo

  // Children are removed explicitly too, in case foreign keys are ever off.
  await env.RECIPES_DB.batch([
    env.RECIPES_DB.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').bind(existing.id),
    env.RECIPES_DB.prepare('DELETE FROM recipe_steps WHERE recipe_id = ?').bind(existing.id),
    env.RECIPES_DB.prepare('DELETE FROM recipes WHERE id = ?').bind(existing.id),
  ]);
  return new Response(null, { status: 204 });
}

// ---- Photos -----------------------------------------------------------------
// One photo per recipe, in the shared private photos bucket. The bucket has no public link: every read and write
// goes through here, so the limits below always apply.

// Keys are grouped by tool, so the bar (or anything else) can share this bucket later as `bar/...`.
const photoKey = (recipeId: number) => `recipes/${recipeId}`;

type PhotoRow = { id: number; photo_bytes: number; photo_version: number };

/** Works out the real image type from the first bytes, so a lying Content-Type can't get through. */
function sniffImageType(b: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Reads the request body but gives up (null) as soon as it goes past `max` bytes. */
async function readCapped(request: Request, max: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/** Drops the old version of a photo from this location's edge cache, so a replaced or deleted photo stops being served here at once. */
async function forgetCachedPhoto(request: Request, slug: string, version: number): Promise<void> {
  const cache = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;
  if (!cache || version === 0) return;
  const url = new URL(`/api/recipes/${encodeURIComponent(slug)}/photo?v=${version}`, request.url);
  await cache.delete(new Request(url, { method: 'GET' }));
}

async function getPhoto(request: Request, env: Env, ctx: ExecutionContext | undefined, slug: string): Promise<Response> {
  // Cloudflare's edge cache answers repeat views, so most reads never reach R2 or the database.
  // (Caches only work on a real domain, not workers.dev or local dev; elsewhere this is skipped.)
  const cache = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;
  const cacheKey = new Request(request.url, { method: 'GET' });
  const hit = await cache?.match(cacheKey);
  if (hit) return hit;

  const row = await env.RECIPES_DB.prepare('SELECT id, photo_bytes, photo_version FROM recipes WHERE slug = ?')
    .bind(slug)
    .first<PhotoRow>();
  if (!row || row.photo_bytes === 0) return json({ error: 'Not found' }, { status: 404 });

  // The URL carries the photo's version. A wrong version is a 404, so changing ?v= can't be used to
  // dodge the cache and make the Worker read R2 over and over.
  const v = new URL(request.url).searchParams.get('v');
  if (v !== String(row.photo_version)) return json({ error: 'Not found' }, { status: 404 });

  const bucket = photoBucket(env);
  if (!bucket) return noPhotos();
  const object = await bucket.get(photoKey(row.id));
  if (!object) return json({ error: 'Not found' }, { status: 404 });

  const res = new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Length': String(row.photo_bytes),
      // The URL changes whenever the photo does, so browsers and the edge can keep it for a year.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
  if (cache && ctx) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

async function putPhoto(request: Request, env: Env, user: User | null, slug: string): Promise<Response> {
  const d = denied(user);
  if (d) return d;
  const bucket = photoBucket(env);
  if (!bucket) return noPhotos();

  const row = await env.RECIPES_DB.prepare('SELECT id, photo_bytes, photo_version FROM recipes WHERE slug = ?')
    .bind(slug)
    .first<PhotoRow>();
  if (!row) return json({ error: 'Not found' }, { status: 404 });

  const bytes = await readCapped(request, PHOTO_MAX_BYTES);
  if (bytes === null) {
    return json({ error: `Photo is too large (the limit is ${PHOTO_MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });
  }
  const type = sniffImageType(bytes);
  if (!type) return json({ error: 'Photo must be a JPEG, PNG or WebP image' }, { status: 415 });

  await bucket.put(photoKey(row.id), bytes, { httpMetadata: { contentType: type } });
  const version = row.photo_version + 1;
  await env.RECIPES_DB.prepare('UPDATE recipes SET photo_bytes = ?, photo_version = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(bytes.byteLength, version, row.id)
    .run();

  await forgetCachedPhoto(request, slug, row.photo_version);
  return json({ photoUrl: `/api/recipes/${encodeURIComponent(slug)}/photo?v=${version}` });
}

async function deletePhoto(request: Request, env: Env, user: User | null, slug: string): Promise<Response> {
  const d = denied(user);
  if (d) return d;
  const bucket = photoBucket(env);
  if (!bucket) return noPhotos();

  const row = await env.RECIPES_DB.prepare('SELECT id, photo_bytes, photo_version FROM recipes WHERE slug = ?')
    .bind(slug)
    .first<PhotoRow>();
  if (!row) return json({ error: 'Not found' }, { status: 404 });

  await bucket.delete(photoKey(row.id));
  // Keep counting versions up so an old cached URL can never match a later photo.
  await env.RECIPES_DB.prepare('UPDATE recipes SET photo_bytes = 0, photo_version = ? WHERE id = ?')
    .bind(row.photo_version + 1, row.id)
    .run();
  await forgetCachedPhoto(request, slug, row.photo_version);
  return new Response(null, { status: 204 });
}
