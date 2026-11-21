// src/worker/index.ts  (the Worker entry: plain .ts, no JSX)
import { api } from '../routes/paths';
import {
  getUser,
  handleChangePassword,
  handleCreateUser,
  handleDeleteUser,
  handleListUsers,
  handleLogin,
  handleLogout,
  handleStatus,
  handleUpdateUser,
  type Role,
} from './auth';
import { handleBarApiRequest } from './bar';
import { json } from './http';

// Reachable without a session
const PUBLIC = new Set<string>([api.auth.login, api.auth.logout, api.auth.status]);

// Extra role requirements. First match wins. Anything else under /api/ just needs a login.
const ROLE_RULES: { prefix: string; methods?: string[]; roles: Role[] }[] = [
  { prefix: '/api/admin/', roles: ['admin'] },
];

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;

    // Static files / SPA pages are served by the assets layer; this Worker only owns /api/*
    if (!p.startsWith('/api/')) return json({ error: 'Not found' }, { status: 404 });

    // Central CSRF check: state-changing requests must come from our own origin
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.get('Origin') !== url.origin) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Public auth endpoints
    if (PUBLIC.has(p)) {
      if (p === api.auth.status) return handleStatus(req, env);
      if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
      return p === api.auth.login ? handleLogin(req, env) : handleLogout(req, env);
    }

    // 2. Bar API: has public guest endpoints, so bar.ts decides per request (deny by default there)
    if (p.startsWith('/api/bar/')) {
      return handleBarApiRequest(req, env, await getUser(req, env));
    }

    // 3. Everything else under /api/ requires a valid session
    const user = await getUser(req, env);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const rule = ROLE_RULES.find(
      (r) => p.startsWith(r.prefix) && (!r.methods || r.methods.includes(req.method))
    );
    if (rule && !rule.roles.includes(user.role)) {
      return new Response('Not found', { status: 404 }); // don't reveal admin routes exist
    }

    // 4. Routes for logged-in users
    if (p === api.auth.changePassword && req.method === 'POST') {
      return handleChangePassword(req, env, user);
    }

    if (p === api.admin.users) {
      if (req.method === 'GET') return handleListUsers(env, user);
      if (req.method === 'POST') return handleCreateUser(req, env, user);
    }
    if (p.startsWith(api.admin.users + '/')) {
      const idSegment = p.slice(api.admin.users.length + 1);
      if (req.method === 'PATCH') return handleUpdateUser(req, env, user, idSegment);
      if (req.method === 'DELETE') return handleDeleteUser(req, env, user, idSegment);
    }

    return json({ error: 'Not found' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
