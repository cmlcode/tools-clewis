// worker/bar.ts
import type { User } from './auth';
import { invalid, json, parseId, readJson } from './http';
import {
  CreateOrderBody,
  CreateDrinkBody,
  UpdateOrderBody,
  UpdateDrinkBody,
  UpdateStatusBody,
  type BarStatusDto,
  type OrderDto,
  type PublicOrderDto,
  type DrinkDto,
} from '../shared/bar';
import type { Family, DrinkChange } from '../shared/families';

// ---- DB row shapes (snake_case, internal only) -----------------------------

interface OrderRow {
  id: number;
  guest_name: string;
  drink: string;
  status: OrderDto['status'];
  created_at: string;
}

interface DrinkRow {
  id: number;
  name: string;
  ingredients: string;
  instructions: string;
  description: string;
  family: Family | null;
  parent_id: number | null;
  hidden: number;
  changes: string; // JSON text
  created_at: string;
}

const ORDER_COLUMNS = 'id, guest_name, drink, status, created_at';
const DRINK_COLUMNS =
  'id, name, description, ingredients, instructions, family, parent_id, hidden, changes, created_at';

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

// changes is stored as JSON text; never let a bad value break the whole drinks list.
function parseChanges(raw: string | null): DrinkChange[] {
  try {
    const value = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? (value as DrinkChange[]) : [];
  } catch {
    return [];
  }
}

const toDrinkDto = (r: DrinkRow): DrinkDto => ({
  id: r.id,
  name: r.name,
  description: r.description ?? '',
  ingredients: r.ingredients,
  instructions: r.instructions,
  family: r.family,
  parentId: r.parent_id,
  changes: parseChanges(r.changes),
  hidden: r.hidden === 1,
  createdAt: r.created_at,
});

// ---- Helpers ----------------------------------------------------------------

/**
 * Who may do the "owner" actions (see all orders, change status, edit drinks,
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
  if (resource === 'drinks') return handleDrinks(request, env, idSegment, user);
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

// ---- Drinks ----------------------------------------------------------------

/**
 * Works out the parent and family to store. With a parent, the family is copied from it
 * (so it's set once and never disagrees with the tree). Rejects unknown parents and cycles.
 */
async function resolveLineage(
  env: Env,
  parentId: number | null,
  family: Family | null,
  selfId: number | null
): Promise<{ parentId: number | null; family: Family | null } | Response> {
  if (parentId === null) return { parentId: null, family };

  if (selfId !== null && parentId === selfId) {
    return json({ error: 'A drink cannot be its own parent' }, { status: 400 });
  }

  const load = (id: number) =>
    env.BAR_DB.prepare('SELECT id, family, parent_id FROM drinks WHERE id = ?')
      .bind(id)
      .first<{ id: number; family: Family | null; parent_id: number | null }>();

  const parent = await load(parentId);
  if (!parent) return json({ error: 'Parent drink not found' }, { status: 400 });

  // Walk up from the parent: if we meet this drink, the move would create a loop.
  if (selfId !== null) {
    let cur: typeof parent | null = parent;
    for (let i = 0; cur && i < 50; i++) {
      if (cur.id === selfId) {
        return json({ error: 'A drink cannot descend from one of its own variations' }, { status: 400 });
      }
      cur = cur.parent_id === null ? null : await load(cur.parent_id);
    }
  }

  const inherited = parent.family ?? family;
  if (!inherited) return json({ error: 'The parent drink has no family yet' }, { status: 400 });
  return { parentId, family: inherited };
}

async function handleDrinks(
  request: Request,
  env: Env,
  drinkIdSegment: string | undefined,
  user: User | null
): Promise<Response> {
  // PUBLIC: reading the drink list.
  if (request.method === 'GET' && !drinkIdSegment) {
    const { results } = await env.BAR_DB.prepare(
      `SELECT ${DRINK_COLUMNS} FROM drinks ORDER BY name ASC`
    ).all<DrinkRow>();

    return json(results.map(toDrinkDto));
  }

  // Creating / editing / deleting drinks requires an owner.
  const d = denied(user);
  if (d) return d;

  if (request.method === 'POST' && !drinkIdSegment) {
    const parsed = CreateDrinkBody.safeParse(await readJson(request));
    if (!parsed.success) return invalid(parsed.error);
    const b = parsed.data;

    const lineage = await resolveLineage(env, b.parentId ?? null, b.family ?? null, null);
    if (lineage instanceof Response) return lineage;

    const row = await env.BAR_DB.prepare(
      `INSERT INTO drinks 
         (name, description, ingredients, instructions, family, parent_id, hidden, changes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING ${DRINK_COLUMNS}`
    )
      .bind(
        b.name,
        b.description,
        b.ingredients,
        b.instructions,
        lineage.family,
        lineage.parentId,
        b.hidden ? 1 : 0,
        JSON.stringify(b.changes)
      )
      .first<DrinkRow>();

    if (!row) return json({ error: 'Could not create drink' }, { status: 500 });
    return json(toDrinkDto(row), { status: 201 });
  }

  if (request.method === 'PATCH' && drinkIdSegment) {
    const drinkId = parseId(drinkIdSegment);
    if (drinkId === null) return json({ error: 'Invalid id' }, { status: 400 });

    const parsed = UpdateDrinkBody.safeParse(await readJson(request));
    if (!parsed.success) return invalid(parsed.error);
    const b = parsed.data;

    const existing = await env.BAR_DB.prepare(
      `SELECT ${DRINK_COLUMNS} FROM drinks WHERE id = ?`
    )
      .bind(drinkId)
      .first<DrinkRow>();

    if (!existing) return json({ error: 'Not found' }, { status: 404 });

    // Omitted fields keep their current value.
    const lineage = await resolveLineage(
      env,
      b.parentId !== undefined ? b.parentId : existing.parent_id,
      b.family !== undefined ? b.family : existing.family,
      drinkId
    );
    if (lineage instanceof Response) return lineage;

    const row = await env.BAR_DB.prepare(
      `UPDATE drinks 
         SET name = ?, description = ?, ingredients = ?, instructions = ?,
             family = ?, parent_id = ?, hidden = ?, changes = ?
       WHERE id = ?
       RETURNING ${DRINK_COLUMNS}`
    )
      .bind(
        b.name ?? existing.name,
        b.description ?? existing.description ?? '',
        b.ingredients ?? existing.ingredients,
        b.instructions ?? existing.instructions,
        lineage.family,
        lineage.parentId,
        (b.hidden ?? existing.hidden === 1) ? 1 : 0,
        JSON.stringify(b.changes ?? parseChanges(existing.changes)),
        drinkId
      )
      .first<DrinkRow>();

    if (!row) return json({ error: 'Not found' }, { status: 404 });

    // If the family changed, every descendant moves with it (family is stored on each drink).
    if (lineage.family !== existing.family) {
      await env.BAR_DB.prepare(
        `WITH RECURSIVE sub(id) AS (
           SELECT id FROM drinks WHERE parent_id = ?
           UNION ALL
           SELECT r.id FROM drinks r JOIN sub ON r.parent_id = sub.id
         )
         UPDATE drinks SET family = ? WHERE id IN (SELECT id FROM sub)`
      )
        .bind(drinkId, lineage.family)
        .run();
    }

    return json(toDrinkDto(row));
  }

  if (request.method === 'DELETE' && drinkIdSegment) {
    const drinkId = parseId(drinkIdSegment);
    if (drinkId === null) return json({ error: 'Invalid id' }, { status: 400 });

    // Variations of this drink keep their family but lose their parent link.
    await env.BAR_DB.batch([
      env.BAR_DB.prepare('UPDATE drinks SET parent_id = NULL WHERE parent_id = ?').bind(drinkId),
      env.BAR_DB.prepare('DELETE FROM drinks WHERE id = ?').bind(drinkId),
    ]);
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Not found' }, { status: 404 });
}
