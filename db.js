import fs from 'fs';
import crypto from 'crypto';
import { put, list } from '@vercel/blob';
import { SEED } from './seed';

const KEY = `nivaro-store-${process.env.DB_KEY || 'v1'}.json`;
const LOCAL = `/tmp/${KEY}`;
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

function withDefaults(db) {
  db.settings = { ...SEED.settings, ...(db.settings || {}) };
  db.settings.social = { ...SEED.settings.social, ...(db.settings.social || {}) };
  db.settings.tracking = { ...SEED.settings.tracking, ...(db.settings.tracking || {}) };
  db.staff = db.staff || [];
  db.log = db.log || [];
  db.orders = db.orders || [];
  db.products = db.products || [];
  db.categories = db.categories || [];
  return db;
}

// The blob is publicly addressable, so the database (orders, staff hashes) is
// AES-256-GCM encrypted with DB_SECRET when that env var is set.
const keyOf = () => (process.env.DB_SECRET ? crypto.scryptSync(process.env.DB_SECRET, 'nivaro-db', 32) : null);
function encode(obj) {
  const body = JSON.stringify(obj);
  const key = keyOf();
  if (!key) return body;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(body, 'utf8'), c.final()]);
  return 'enc1:' + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
function decode(text) {
  if (text.startsWith('enc1:')) {
    const key = keyOf();
    if (!key) throw new Error('DB_SECRET missing');
    const raw = Buffer.from(text.slice(5), 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8'));
  }
  return JSON.parse(text); // legacy plaintext (re-encrypted on next save)
}

// Strict read: throws on any storage error so a failed read can never be
// followed by a save that wipes real data. Used by every write path.
export async function getDb() {
  let db;
  if (useBlob()) {
    const { blobs } = await list({ prefix: KEY, limit: 1 });
    if (blobs[0]) {
      const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('db fetch ' + r.status);
      db = decode(await r.text());
    }
  } else if (fs.existsSync(LOCAL)) {
    db = decode(fs.readFileSync(LOCAL, 'utf8'));
  }
  return withDefaults(db || structuredClone(SEED));
}

// Tolerant read for public pages: falls back to seed data instead of erroring.
export async function readDb() {
  try { return await getDb(); } catch (e) { console.error('readDb failed', e); return withDefaults(structuredClone(SEED)); }
}

export async function saveDb(db) {
  const body = encode(db);
  if (useBlob()) {
    await put(KEY, body, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain', cacheControlMaxAge: 60 });
  } else {
    fs.writeFileSync(LOCAL, body);
  }
}

export const taka = (n) => `৳${Number(n || 0).toLocaleString('en-US')}`;
export const pub = (p) => ({ id: p.id, slug: p.slug, name: p.name, nameBn: p.nameBn, brand: p.brand, category: p.category, price: p.price, oldPrice: p.oldPrice, stock: p.stock, image: p.image });
