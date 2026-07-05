import { handleAuthApiRequest, handleAuthLogin } from './auth';
import { handleBarApiRequest } from './bar';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/auth/')) {
      return handleAuthApiRequest(request);
    }

    if (url.pathname === '/auth/login') {
      return handleAuthLogin(request);
    }

    if (url.pathname.startsWith('/api/bar/')) {
      return handleBarApiRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
