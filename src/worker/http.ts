// worker/http.ts
// Small response/request helpers shared by auth.ts and bar.ts.

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init.headers },
  });
}

/** Bad JSON becomes null, which then fails schema validation with a 400 (not a 500). */
export const readJson = (request: Request): Promise<unknown> => request.json().catch(() => null);

/** 400 listing which fields failed, without echoing user input back. */
export function invalid(error: { issues: { path: PropertyKey[] }[] }): Response {
  const fields = [...new Set(error.issues.map((i) => i.path.map(String).join('.') || '(body)'))];
  return json({ error: 'Invalid request', fields }, { status: 400 });
}

export function parseId(segment: string | undefined): number | null {
  const id = Number(segment);
  return Number.isInteger(id) && id > 0 ? id : null;
}
