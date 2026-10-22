import crypto from 'crypto';
import { cookies } from 'next/headers';

const secret = () => process.env.ADMIN_PASSWORD || '';
const sha = (s) => crypto.createHash('sha256').update(s).digest();
const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (payload) => crypto.createHmac('sha256', secret() + '|session2').update(payload).digest('base64url');

export const ALL_PERMS = ['dash', 'orders', 'products', 'cats', 'settings'];

export function checkSuper(p) {
  if (!secret()) return false;
  return crypto.timingSafeEqual(sha(String(p || '')), sha(secret()));
}

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
}
export function verifyPassword(pw, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const a = Buffer.from(crypto.scryptSync(String(pw || ''), salt, 32).toString('hex'));
  const b = Buffer.from(h);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// cookie value: base64url(json).signature
export function makeCookie(u, role) {
  const payload = b64(JSON.stringify({ u, role, e: Date.now() + 7 * 864e5 }));
  return payload + '.' + sign(payload);
}

export async function getSession() {
  if (!secret()) return null;
  const c = (await cookies()).get('adm');
  if (!c) return null;
  const [payload, sig] = c.value.split('.');
  if (!payload || !sig) return null;
  const good = sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!d.e || d.e < Date.now()) return null;
    return { username: d.u, role: d.role };
  } catch { return null; }
}

export async function isAdmin() { return !!(await getSession()); }
