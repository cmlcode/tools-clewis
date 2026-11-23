// src/worker/bar.ts
import type { User } from './auth';
import { invalid, json, parseId, readJson } from './http';
import {
  CreateOrderBody,
  CreateRecipeBody,
  UpdateOrderBody,
  UpdateRecipeBody,
  UpdateStatusBody,
  type BarStatusDto,
  type OrderDto,
  type PublicOrderDto,
  type RecipeDto,
} from '../shared/bar';
import type { RecipeChange } from '../shared/families';

// ---- DB row shapes (snake_case, internal only) -----------------------------

interface OrderRow {
  id: number;
  guest_name: string;
  drink: string;
  status: OrderDto['status'];
  created_at: string;
}

interface RecipeRow {
  id: number;
  name: string;
  ingredients: string;
  instructions: string;
  description: string;
  family: RecipeDto['family'];
  parent_id: number | null;
  /** JSON-encoded RecipeChange[]. */
  changes: string;
  change_note: string;
  created_at: string;
}

const ORDER_COLUMNS = 'id, guest_name, drink, status, created_at';
const RECIPE_COLUMNS =
  'id, name, ingredients, instructions, description, family, parent_id, changes, change_note, created_at';

// ---- Row -> DTO mappers -----------------------------------------------------

const toOrderDto = (r: OrderRow): OrderDto => ({
  id: r.id,
  guestName: r.guest_name,
  drink: r.drink,
  status: r.status,
  createdAt: r.created_at,
});

const toPublicOrderDto = (r: OrderRow): PublicOrderDto => ({
  id: r.id,
  drink: r.drink,
  status: r.status,
});

/** The changes column is JSON text; fall back to "no changes" if it is empty or malformed. */
function parseChanges(raw: string | null): RecipeChange[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as RecipeChange[]) : [];
  } catch {
    return [];
  }
}

const toRecipeDto = (r: RecipeRow): RecipeDto => ({
  id: r.id,
  name: r.name,
  ingredients: r.ingredients,
  instructions: r.instructions,
  description: r.description,
  family: r.family,
  parentId: r.parent_id,
  changes: parseChanges(r.changes),
  changeNote: r.change_note ?? '',
  createdAt: r.created_at,
});

// ---- Helpers ----------------------------------------------------------------

/**
 * Who may do the "owner" actions (see all orders, change status, edit recipes,
 * open/close the bar). Returns a Response to send back, or null if allowed.
 * Tighten here (e.g. admin only) to restrict managers.
 */
function denied(user: User | null): Response | null {
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'manager') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

// ---- Router -----------------------------------------------------------------

export async function handleBarApiRequest(
  request: Request,
  env: Env,
  user: User | null
): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.replace(/^\/api\/bar\/?/, '').split('/').filter(Boolean);
  const [resource, idSegment] = segments;

  if (resource === 'orders') return handleOrders(request, env, idSegment, user);
  if (resource === 'recipes') return handleRecipes(request, env, idSegment, user);
  if (resource === 'status') return handleStatus(request, env, user);

  return json({ error: 'Not found' }, { status: 404 });
}

// ---- Status -----------------------------------------------------------------

async function handleStatus(request: Request, env: Env, user: User | null): Promise<Response> {
  if (request.method === 'GET') {
    const row = await env.BAR_DB.prepare('SELECT is_open FROM bar_status WHERE id = 1').first<{
      is_open: number;
    }>();

    return json({ isOpen: row?.is_open === 1 } satisfies BarStatusDto);
  }

  if (request.method === 'PATCH') {
    const d = denied(user);
    if (d) return d;

    const parsed = UpdateStatusBody.safeParse(await readJson(request));
    if (!parsed.success) return invalid(parsed.error);
    const { isOpen } = parsed.data;

    await env.BAR_DB.prepare('UPDATE bar_status SET is_open = ? WHERE id = 1')
      .bind(isOpen ? 1 : 0)
      .run();

    return json({ isOpen } satisfies BarStatusDto);
  }

  return json({ error: 'Not found' }, { status: 404 });
}

// ---- Orders -----------------------------------------------------------------

async function handleOrders(
  request: Request,
  env: Env,
  orderIdSegment: string | undefined,
  user: User | null
): Promise<Response> {
  // PUBLIC: placing an order is the one guest-facing write.
  if (request.method === 'POST' && !orderIdSegment) {
    const parsed = CreateOrderBody.safeParse(await readJson(request));
    if (!parsed.success) return invalid(parsed.error);
    const { guestName, drink } = parsed.data;

    const status = await env.BAR_DB.prepare('SELECT is_open FROM bar_status WHERE id = 1').first<{
      is_open: number;
    }>();

    if (status?.is_open !== 1) {
      return json({ error: 'The bar is closed right now', code: 'bar_closed' }, { status: 403 });
    }

    const row = await env.BAR_DB.prepare(
      `INSERT INTO orders (guest_name, drink, status)
       VALUES (?, ?, 'pending')
       RETURNING ${ORDER_COLUMNS}`
    )
      .bind(guestName, drink)
      .first<OrderRow>();

    if (!row) return json({ error: 'Could not place order' }, { status: 500 });
    return json(toPublicOrderDto(row), { status: 201 });
  }

  // PUBLIC: a guest polls an order by id. Returns drink + status only (no guest name).
  if (request.method === 'GET' && orderIdSegment) {
    const orderId = parseId(orderIdSegment);
    if (orderId === null) return json({ error: 'Invalid id' }, { status: 400 });

    const row = await env.BAR_DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`)
      .bind(orderId)
      .first<OrderRow>();

    if (!row) return json({ error: 'Not found' }, { status: 404 });
    return json(toPublicOrderDto(row));
  }

  // Everything below requires an owner (manager / admin).
  const d = denied(user);
  if (d) return d;

  if (request.method === 'GET' && !orderIdSegment) {
    const { results } = await env.BAR_DB.prepare(
      `SELECT ${ORDER_COLUMNS} FROM orders ORDER BY created_at DESC`
    ).all<OrderRow>();

    return json(results.map(toOrderDto));
  }

  if (request.method === 'PATCH' && orderIdSegment) {
    const orderId = parseId(orderIdSegment);
    if (orderId === null) return json({ error: 'Invalid id' }, { status: 400 });

    const parsed = UpdateOrderBody.safeParse(await readJson(request));
    if (!parsed.success) return invalid(parsed.error);

    const row = await env.BAR_DB.prepare(
      `UPDATE orders SET status = ? WHERE id = ?
       RETURNING ${ORDER_COLUMNS}`
    )
      .bind(parsed.data.status, orderId)
      .first<OrderRow>();

    if (!row) return json({ error: 'Not found' }, { status: 404 });
    return json(toOrderDto(row));
  }

  if (request.method === 'DELETE' && orderIdSegment) {
    const orderId = parseId(orderIdSegment);
    if (orderId === null) return json({ error: 'Invalid id' }, { status: 400 });

    await env.BAR_DB.prepare('DELETE FROM orders WHERE id = ?').bind(orderId).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Not found' }, { status: 404 });
}

// ---- Recipes ----------------------------------------------------------------

async function handleRecipes(
  request: Request,
  env: Env,
  recipeIdSegment: string | undefined,
  user: User | null
): Promise<Response> {
  // PUBLIC: reading the recipe list.
  if (request.method === 'GET' && !recipeIdSegment) {
    const { results } = await env.BAR_DB.prepare(
      `SELECT ${RECIPE_COLUMNS} FROM recipes ORDER BY name ASC`
    ).all<RecipeRow>();

    return json(results.map(toRecipeDto));
  }

  // Creating / editing / deleting recipes requires an owner.
  const d = denied(user);
  if (d) return d;

  if (request.method === 'POST' && !recipeIdSegment) {
    const parsed = CreateRecipeBody.safeParse(await readJson(request));
    if (!parsed.success) return invalid(parsed.error);
    const { name, ingredients, instructions, description, changes, changeNote } = parsed.data;
    const parentId = parsed.data.parentId ?? null;
    let family = parsed.data.family ?? null;

    // A derived drink inherits its parent's family unless one was given.
    if (parentId !== null) {
      const parent = await env.BAR_DB.prepare('SELECT family FROM recipes WHERE id = ?')
        .bind(parentId)
        .first<{ family: RecipeDto['family'] }>();
      if (!parent) return json({ error: 'Parent drink not found' }, { status: 400 });
      family = family ?? parent.family;
    }

    const row = await env.BAR_DB.prepare(
      `INSERT INTO recipes (name, ingredients, instructions, description, family, parent_id, changes, change_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING ${RECIPE_COLUMNS}`
    )
      .bind(name, ingredients, instructions, description, family, parentId, JSON.stringify(changes), changeNote)
      .first<RecipeRow>();

    if (!row) return json({ error: 'Could not create recipe' }, { status: 500 });
    return json(toRecipeDto(row), { status: 201 });
  }

  if (request.method === 'PATCH' && recipeIdSegment) {
    const recipeId = parseId(recipeIdSegment);
    if (recipeId === null) return json({ error: 'Invalid id' }, { status: 400 });

    const parsed = UpdateRecipeBody.safeParse(await readJson(request));
    if (!parsed.success) return invalid(parsed.error);

    const existing = await env.BAR_DB.prepare(
      `SELECT ${RECIPE_COLUMNS} FROM recipes WHERE id = ?`
    )
      .bind(recipeId)
      .first<RecipeRow>();

    if (!existing) return json({ error: 'Not found' }, { status: 404 });

    // Omitted fields keep their current value.
    const {
      name = existing.name,
      ingredients = existing.ingredients,
      instructions = existing.instructions,
      description = existing.description,
      family = existing.family,
      parentId = existing.parent_id,
      changes = parseChanges(existing.changes),
      changeNote = existing.change_note,
    } = parsed.data;

    if (parentId === recipeId) {
      return json({ error: 'A drink cannot be its own parent' }, { status: 400 });
    }

    const row = await env.BAR_DB.prepare(
      `UPDATE recipes
       SET name = ?, ingredients = ?, instructions = ?, description = ?, family = ?,
           parent_id = ?, changes = ?, change_note = ?
       WHERE id = ?
       RETURNING ${RECIPE_COLUMNS}`
    )
      .bind(
        name,
        ingredients,
        instructions,
        description,
        family,
        parentId,
        JSON.stringify(changes),
        changeNote,
        recipeId
      )
      .first<RecipeRow>();

    if (!row) return json({ error: 'Not found' }, { status: 404 });
    return json(toRecipeDto(row));
  }

  if (request.method === 'DELETE' && recipeIdSegment) {
    const recipeId = parseId(recipeIdSegment);
    if (recipeId === null) return json({ error: 'Invalid id' }, { status: 400 });

    await env.BAR_DB.prepare('DELETE FROM recipes WHERE id = ?').bind(recipeId).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Not found' }, { status: 404 });
}
