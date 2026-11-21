// worker/password.ts
// Works in Workers and in Node 20+ (for the seed script).
const ITER = 100_000; // Workers WebCrypto maximum
const enc = new TextEncoder();

export const toHex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

async function derive(password: string, salt: BufferSource, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  );
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITER}$${toHex(salt)}$${toHex(await derive(password, salt, ITER))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, iter, salt, hash] = stored.split('$');
  if (alg !== 'pbkdf2-sha256') return false;
  const got = await derive(password, fromHex(salt), Number(iter));
  const want = fromHex(hash);
  let diff = got.length ^ want.length; // constant-time compare
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ (want[i] ?? 0);
  return diff === 0;
}
