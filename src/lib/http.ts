// src/lib/http.ts
// Tiny fetch wrapper for the JSON API.

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function call<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401) {
      return { ok: false, error: "Your session expired. Please log in again." };
    }
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: j?.error ?? "Something went wrong." };
    }
    return { ok: true, data: res.status === 204 ? (undefined as T) : ((await res.json()) as T) };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
