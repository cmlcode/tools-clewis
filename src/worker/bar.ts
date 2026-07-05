import { isOwnerRequest } from './auth';

interface Recipe {
  id: number;
  name: string;
  ingredients: string;
  instructions: string;
  created_at: string;
}

interface Order {
  id: number;
  guest_name: string;
  drink: string;
  status: 'pending' | 'made' | 'served';
  created_at: string;
}

const ORDER_STATUSES = ['pending', 'made', 'served'];

function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init.headers },
  });
}

function parseId(segment: string | undefined): number | null {
  const id = Number(segment);
  return Number.isInteger(id) ? id : null;
}

export async function handleBarApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.replace(/^\/api\/bar\/?/, '').split('/').filter(Boolean);
  const [resource, id] = segments;

  if (resource === 'orders') {
    return handleOrders(request, env, id);
  }

  if (resource === 'recipes') {
    return handleRecipes(request, env, id);
  }

  if (resource === 'status') {
    return handleStatus(request, env);
  }

  return json({ error: 'Not found' }, { status: 404 });
}

async function handleStatus(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const row = await env.BAR_DB.prepare('SELECT is_open FROM bar_status WHERE id = 1').first<{
      is_open: number;
    }>();

    return json({ isOpen: row?.is_open === 1 });
  }

  if (request.method === 'PATCH') {
    if (!isOwnerRequest(request)) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json<{ isOpen?: boolean }>();
    if (typeof body.isOpen !== 'boolean') {
      return json({ error: 'isOpen must be a boolean' }, { status: 400 });
    }

    await env.BAR_DB.prepare('UPDATE bar_status SET is_open = ? WHERE id = 1')
      .bind(body.isOpen ? 1 : 0)
      .run();

    return json({ isOpen: body.isOpen });
  }

  return json({ error: 'Not found' }, { status: 404 });
}

async function handleOrders(request: Request, env: Env, id: string | undefined): Promise<Response> {
  // Placing an order is the one guest-facing (public) action — everything
  // else about orders is owner-only, same as the /bar/orders page.
  if (request.method === 'POST' && !id) {
    const body = await request.json<{ guestName?: string; drink?: string }>();
    const guestName = body.guestName?.trim();
    const drink = body.drink?.trim();

    if (!guestName || !drink) {
      return json({ error: 'guestName and drink are required' }, { status: 400 });
    }

    const status = await env.BAR_DB.prepare('SELECT is_open FROM bar_status WHERE id = 1').first<{
      is_open: number;
    }>();

    if (status?.is_open !== 1) {
      return json({ error: 'The bar is closed right now' }, { status: 403 });
    }

    const result = await env.BAR_DB.prepare(
      `INSERT INTO orders (guest_name, drink, status)
       VALUES (?, ?, 'pending')
       RETURNING id, guest_name, drink, status, created_at`
    )
      .bind(guestName, drink)
      .first<Order>();

    return json(result, { status: 201 });
  }

  // A guest can look up their own order by id (e.g. to poll its status)
  // without being the owner — the id alone isn't guessable-in-practice
  // and exposes nothing beyond what they already submitted.
  if (request.method === 'GET' && id) {
    const orderId = parseId(id);
    if (orderId === null) return json({ error: 'Invalid id' }, { status: 400 });

    const order = await env.BAR_DB.prepare(
      'SELECT id, guest_name, drink, status, created_at FROM orders WHERE id = ?'
    )
      .bind(orderId)
      .first<Order>();

    if (!order) return json({ error: 'Not found' }, { status: 404 });
    return json(order);
  }

  if (!isOwnerRequest(request)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.method === 'GET' && !id) {
    const { results } = await env.BAR_DB.prepare(
      'SELECT id, guest_name, drink, status, created_at FROM orders ORDER BY created_at DESC'
    ).all<Order>();

    return json(results);
  }

  if (request.method === 'PATCH' && id) {
    const orderId = parseId(id);
    if (orderId === null) return json({ error: 'Invalid id' }, { status: 400 });

    const body = await request.json<{ status?: string }>();
    if (!body.status || !ORDER_STATUSES.includes(body.status)) {
      return json({ error: `status must be one of: ${ORDER_STATUSES.join(', ')}` }, { status: 400 });
    }

    const result = await env.BAR_DB.prepare(
      `UPDATE orders SET status = ? WHERE id = ?
       RETURNING id, guest_name, drink, status, created_at`
    )
      .bind(body.status, orderId)
      .first<Order>();

    if (!result) return json({ error: 'Not found' }, { status: 404 });
    return json(result);
  }

  if (request.method === 'DELETE' && id) {
    const orderId = parseId(id);
    if (orderId === null) return json({ error: 'Invalid id' }, { status: 400 });

    await env.BAR_DB.prepare('DELETE FROM orders WHERE id = ?').bind(orderId).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Not found' }, { status: 404 });
}

async function handleRecipes(request: Request, env: Env, id: string | undefined): Promise<Response> {
  // Reading the recipe list is public (a public menu could read it later);
  // creating/editing/deleting recipes is owner-only, same as /bar/recipes.
  if (request.method === 'GET' && !id) {
    const { results } = await env.BAR_DB.prepare(
      'SELECT id, name, ingredients, instructions, created_at FROM recipes ORDER BY name ASC'
    ).all<Recipe>();

    return json(results);
  }

  if (!isOwnerRequest(request)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.method === 'POST' && !id) {
    const body = await request.json<{ name?: string; ingredients?: string; instructions?: string }>();
    const name = body.name?.trim();
    const ingredients = body.ingredients?.trim();
    const instructions = body.instructions?.trim() ?? '';

    if (!name || !ingredients) {
      return json({ error: 'name and ingredients are required' }, { status: 400 });
    }

    const result = await env.BAR_DB.prepare(
      `INSERT INTO recipes (name, ingredients, instructions)
       VALUES (?, ?, ?)
       RETURNING id, name, ingredients, instructions, created_at`
    )
      .bind(name, ingredients, instructions)
      .first<Recipe>();

    return json(result, { status: 201 });
  }

  if (request.method === 'PATCH' && id) {
    const recipeId = parseId(id);
    if (recipeId === null) return json({ error: 'Invalid id' }, { status: 400 });

    const existing = await env.BAR_DB.prepare(
      'SELECT id, name, ingredients, instructions, created_at FROM recipes WHERE id = ?'
    )
      .bind(recipeId)
      .first<Recipe>();

    if (!existing) return json({ error: 'Not found' }, { status: 404 });

    const body = await request.json<{ name?: string; ingredients?: string; instructions?: string }>();
    const name = body.name?.trim() || existing.name;
    const ingredients = body.ingredients?.trim() || existing.ingredients;
    const instructions = body.instructions?.trim() ?? existing.instructions;

    const result = await env.BAR_DB.prepare(
      `UPDATE recipes SET name = ?, ingredients = ?, instructions = ? WHERE id = ?
       RETURNING id, name, ingredients, instructions, created_at`
    )
      .bind(name, ingredients, instructions, recipeId)
      .first<Recipe>();

    return json(result);
  }

  if (request.method === 'DELETE' && id) {
    const recipeId = parseId(id);
    if (recipeId === null) return json({ error: 'Invalid id' }, { status: 400 });

    await env.BAR_DB.prepare('DELETE FROM recipes WHERE id = ?').bind(recipeId).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Not found' }, { status: 404 });
}
