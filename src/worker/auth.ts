const SESSION_COOKIE = 'tc_owner';
const NO_STORE = 'no-store';

export function getCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function setCookie(name: string, value: string, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires.toUTCString()}; path=/`;
}

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function setSessionCookie(value: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

/** Whether this request carries a valid owner session cookie. */
export function isOwnerRequest(request: Request): boolean {
  const cookies = parseCookies(request.headers.get('Cookie'));
  return cookies[SESSION_COOKIE] === '1';
}

export async function handleAuthApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get('Cookie'));

  if (url.pathname === '/api/auth/status') {
    return Response.json(
      { loggedIn: cookies[SESSION_COOKIE] === '1' },
      { headers: { 'Cache-Control': NO_STORE } }
    );
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    return Response.json(
      { loggedIn: false },
      { headers: { 'Set-Cookie': setSessionCookie('', 0), 'Cache-Control': NO_STORE } }
    );
  }

  return new Response('Not found', { status: 404, headers: { 'Cache-Control': NO_STORE } });
}

export function handleAuthLogin(request: Request): Response {
  const redirectTo = new URL('/', request.url).toString();

  const isLocal = request.url.includes("localhost");

  if (isLocal) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
        "Set-Cookie": setSessionCookie("1", 60 * 60 * 24 * 30),
        "Cache-Control": "no-store",
      },
    });
  }

  const email = request.headers.get('Cf-Access-Authenticated-User-Email');

  if (!email) {
    return new Response(null, {
      status: 302,
      headers: { Location: redirectTo, 'Cache-Control': NO_STORE },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      'Set-Cookie': setSessionCookie('1', 60 * 60 * 24 * 30),
      'Cache-Control': NO_STORE,
    },
  });
}
