import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getDb, saveDb } from '@/lib/db';
import { checkSuper, getSession, makeCookie, hashPassword, verifyPassword, ALL_PERMS } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const json = (d, status = 200) => NextResponse.json(d, { status, headers: { 'cache-control': 'no-store' } });
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : d; };
const txt = (v, n) => String(v ?? '').trim().slice(0, n);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

const permsOf = (me) => (me.role === 'super' ? Object.fromEntries(ALL_PERMS.map((k) => [k, true])) : me.perms || {});
const logAct = (db, me, a, d = '') => { db.log.unshift({ t: new Date().toISOString(), u: me.username, a, d: String(d).slice(0, 160) }); db.log = db.log.slice(0, 200); };

// Resolve the signed-in user; staff are re-checked against the DB on every call
// so disabling/deleting an account takes effect immediately.
async function whoami(db) {
  const ses = await getSession();
  if (!ses) return null;
  if (ses.role === 'super') return { username: 'super', name: 'Super Admin', role: 'super' };
  const st = (db || (await getDb())).staff.find((x) => x.username === ses.username && x.active !== false);
  if (!st) return null;
  return { username: st.username, name: st.name, role: 'staff', perms: st.perms || {} };
}

export async function GET(req, { params }) {
  const { action } = await params;
  if (action !== 'data') return json({ error: 'Not found' }, 404);
  let db;
  try { db = await getDb(); } catch { return json({ error: 'ডাটাবেস লোড হয়নি, আবার চেষ্টা করুন' }, 503); }
  const me = await whoami(db);
  if (!me) return json({ error: 'Unauthorized' }, 401);
  const perms = permsOf(me);
  const out = {
    me: { ...me, perms }, settings: db.settings, categories: db.categories, products: db.products,
    orders: perms.orders || perms.dash ? db.orders : [],
    staff: me.role === 'super' ? db.staff.map(({ pass, ...r }) => r) : [],
    log: me.role === 'super' ? db.log : [],
  };
  return json(out);
}

export async function POST(req, { params }) {
  const { action } = await params;

  if (action === 'login') {
    const b = await req.json().catch(() => ({}));
    const user = txt(b.username, 40).toLowerCase();
    let role = null, uname = null;
    if (!user || user === 'super' || user === 'admin' || user === 'superadmin') {
      if (checkSuper(b.password)) { role = 'super'; uname = 'super'; }
    } else {
      let db; try { db = await getDb(); } catch { return json({ error: 'ডাটাবেস লোড হয়নি, আবার চেষ্টা করুন' }, 503); }
      const st = db.staff.find((x) => x.username === user && x.active !== false);
      if (st && verifyPassword(b.password, st.pass)) { role = 'staff'; uname = st.username; }
    }
    if (!role) { await new Promise((r) => setTimeout(r, 800)); return json({ error: 'ইউজারনেম বা পাসওয়ার্ড ভুল' }, 401); }
    const res = json({ ok: true });
    res.cookies.set('adm', makeCookie(uname, role), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return res;
  }
  if (action === 'logout') { const res = json({ ok: true }); res.cookies.set('adm', '', { path: '/', maxAge: 0 }); return res; }

  let db;
  try { db = await getDb(); } catch { return json({ error: 'ডাটাবেস লোড হয়নি, আবার চেষ্টা করুন' }, 503); }
  const me = await whoami(db);
  if (!me) return json({ error: 'Unauthorized' }, 401);
  const P = permsOf(me);
  const need = (k) => (P[k] ? null : json({ error: 'এই কাজের অনুমতি আপনার নেই' }, 403));
  const superOnly = () => (me.role === 'super' ? null : json({ error: 'শুধু সুপার অ্যাডমিন এটা করতে পারবেন' }, 403));

  if (action === 'upload') {
    if (!P.products && !P.settings) return json({ error: 'অনুমতি নেই' }, 403);
    const fd = await req.formData().catch(() => null);
    const file = fd?.get('file');
    if (!file || typeof file === 'string') return json({ error: 'ফাইল দিন' }, 400);
    if (file.size > 4 * 1024 * 1024) return json({ error: 'ছবি ৪MB এর কম হতে হবে' }, 400);
    if (!/^image\//.test(file.type)) return json({ error: 'শুধু ছবি আপলোড করুন' }, 400);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
      const r = await put('uploads/' + safe, file, { access: 'public', addRandomSuffix: true });
      return json({ url: r.url });
    } catch (e) { return json({ error: 'আপলোড ব্যর্থ: ' + e.message }, 500); }
  }

  const b = await req.json().catch(() => ({}));

  if (action === 'product') {
    { const d = need('products'); if (d) return d; }
    const name = txt(b.name, 200);
    if (!name) return json({ error: 'প্রডাক্টের নাম দিন' }, 400);
    const flags = { deals: false, featured: false, bestSeller: false, newArrival: false, trending: false };
    for (const k of Object.keys(flags)) flags[k] = !!b.flags?.[k];
    const data = {
      name, nameBn: txt(b.nameBn, 200), brand: txt(b.brand, 60), category: txt(b.category, 60), price: num(b.price), oldPrice: num(b.oldPrice), stock: num(b.stock),
      image: txt(b.image, 500), images: (Array.isArray(b.images) ? b.images : []).map((u) => txt(u, 500)).filter(Boolean).slice(0, 8),
      sizes: (Array.isArray(b.sizes) ? b.sizes : String(b.sizes || '').split(',')).map((x) => txt(x, 12)).filter(Boolean).slice(0, 12),
      desc: txt(b.desc, 4000), descBn: txt(b.descBn, 4000), flags,
      tags: (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map((t) => txt(t, 40)).filter(Boolean).slice(0, 20),
    };
    let p = b.id && db.products.find((x) => x.id === b.id);
    if (p) { Object.assign(p, data); if (b.slug) p.slug = slugify(b.slug) || p.slug; }
    else {
      const id = 'p' + Date.now().toString(36);
      let slug = slugify(b.slug || name) || id;
      if (db.products.some((x) => x.slug === slug)) slug += '-' + id.slice(-4);
      p = { id, slug, ...data };
      db.products.unshift(p);
    }
    logAct(db, me, 'প্রডাক্ট সেভ', p.name);
    await saveDb(db);
    return json({ ok: true, product: p });
  }
  if (action === 'product-delete') {
    { const d = need('products'); if (d) return d; }
    logAct(db, me, 'প্রডাক্ট ডিলিট', b.id);
    db.products = db.products.filter((x) => x.id !== b.id);
    await saveDb(db);
    return json({ ok: true });
  }

  if (action === 'category') {
    { const d = need('cats'); if (d) return d; }
    const name = txt(b.name, 80);
    if (!name) return json({ error: 'নাম দিন' }, 400);
    const c = b.oldSlug && db.categories.find((x) => x.slug === b.oldSlug);
    if (c) { c.name = name; c.nameBn = txt(b.nameBn, 80); c.image = txt(b.image, 500); }
    else {
      let slug = slugify(b.slug || name) || 'cat-' + Date.now().toString(36);
      if (db.categories.some((x) => x.slug === slug)) slug += '-' + Date.now().toString(36).slice(-3);
      db.categories.push({ slug, name, nameBn: txt(b.nameBn, 80), image: txt(b.image, 500) });
    }
    if (Array.isArray(b.order)) {
      const pos = new Map(b.order.map((s2, i) => [s2, i]));
      db.categories.sort((x, y) => (pos.get(x.slug) ?? 99) - (pos.get(y.slug) ?? 99));
    }
    logAct(db, me, 'ক্যাটাগরি সেভ', name);
    await saveDb(db);
    return json({ ok: true });
  }
  if (action === 'category-move') {
    { const d = need('cats'); if (d) return d; }
    const i = db.categories.findIndex((x) => x.slug === b.slug), j = i + (b.dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= db.categories.length) return json({ ok: true });
    [db.categories[i], db.categories[j]] = [db.categories[j], db.categories[i]];
    await saveDb(db);
    return json({ ok: true });
  }
  if (action === 'category-delete') {
    { const d = need('cats'); if (d) return d; }
    db.categories = db.categories.filter((x) => x.slug !== b.slug);
    await saveDb(db);
    return json({ ok: true });
  }

  if (action === 'order') {
    { const d = need('orders'); if (d) return d; }
    const o = db.orders.find((x) => x.orderNo === b.orderNo);
    if (!o) return json({ error: 'অর্ডার পাওয়া যায়নি' }, 404);
    if (b.status && STATUSES.includes(b.status)) {
      const dead = ['cancelled', 'returned'].includes(b.status);
      if (dead && !o.restocked) { o.items.forEach((l) => { const p = db.products.find((x) => x.id === l.id); if (p) p.stock += l.qty; }); o.restocked = true; }
      else if (!dead && o.restocked) { o.items.forEach((l) => { const p = db.products.find((x) => x.id === l.id); if (p) p.stock = Math.max(0, p.stock - l.qty); }); o.restocked = false; }
      if (o.status !== b.status) logAct(db, me, 'অর্ডার স্ট্যাটাস', `${o.orderNo}: ${o.status} → ${b.status}`);
      o.status = b.status;
    }
    if (typeof b.adminNote === 'string') o.adminNote = txt(b.adminNote, 500);
    await saveDb(db);
    return json({ ok: true, order: o });
  }
  if (action === 'order-delete') {
    { const d = superOnly(); if (d) return d; }
    logAct(db, me, 'অর্ডার ডিলিট', b.orderNo);
    db.orders = db.orders.filter((x) => x.orderNo !== b.orderNo);
    await saveDb(db);
    return json({ ok: true });
  }

  if (action === 'settings') {
    { const d = need('settings'); if (d) return d; }
    logAct(db, me, 'সেটিংস আপডেট');
    const s = db.settings;
    for (const k of ['storeName', 'tagline', 'phone', 'hotline', 'whatsapp', 'email', 'website', 'address', 'addressBn', 'bkashNumber', 'nagadNumber', 'announce', 'announceBn', 'logo']) if (k in b) s[k] = txt(b[k], 240);
    for (const k of ['shipDhaka', 'shipOutside', 'freeShipOver']) if (k in b) s[k] = num(b[k]);
    if (typeof b.brandColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(b.brandColor)) s.brandColor = b.brandColor;
    if (Array.isArray(b.heroSlides)) s.heroSlides = b.heroSlides.slice(0, 8).map((x) => ({ badge: txt(x.badge, 40), badgeBn: txt(x.badgeBn, 40), title: txt(x.title, 120), titleBn: txt(x.titleBn, 120), sub: txt(x.sub, 180), subBn: txt(x.subBn, 180), cta: txt(x.cta, 40), ctaBn: txt(x.ctaBn, 40), link: txt(x.link, 200) || '/', image: txt(x.image, 500), imageMobile: txt(x.imageMobile, 500) }));
    // Social links & tracking IDs are super-admin only
    if (me.role === 'super') {
      if (b.social && typeof b.social === 'object') for (const k of ['facebook', 'youtube', 'tiktok', 'instagram']) { const v = txt(b.social[k], 300); s.social = { ...(s.social || {}), [k]: v && !/^https?:\/\//i.test(v) ? 'https://' + v : v }; }
      if (b.tracking && typeof b.tracking === 'object') for (const k of ['gtmId', 'gtmDomain', 'ga4Id', 'fbPixelId', 'tiktokPixelId']) s.tracking = { ...(s.tracking || {}), [k]: txt(b.tracking[k], 80) };
    }
    await saveDb(db);
    return json({ ok: true });
  }

  if (action === 'staff-save') {
    { const d = superOnly(); if (d) return d; }
    const name = txt(b.name, 60);
    const username = txt(b.username, 30).toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (!name || username.length < 3) return json({ error: 'নাম ও ইউজারনেম (কমপক্ষে ৩ অক্ষর, ইংরেজিতে) দিন' }, 400);
    if (['super', 'admin', 'superadmin'].includes(username)) return json({ error: 'এই ইউজারনেম ব্যবহার করা যাবে না' }, 400);
    const perms = {};
    for (const k of ALL_PERMS) perms[k] = !!b.perms?.[k];
    let st = db.staff.find((x) => x.username === username);
    if (b.isNew && st) return json({ error: 'এই ইউজারনেম আগে থেকেই আছে' }, 400);
    if (!st) {
      if (String(b.password || '').length < 6) return json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন' }, 400);
      st = { username, createdAt: new Date().toISOString() };
      db.staff.push(st);
    }
    st.name = name; st.perms = perms; st.active = b.active !== false;
    if (b.password) {
      if (String(b.password).length < 6) return json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন' }, 400);
      st.pass = hashPassword(String(b.password));
    }
    logAct(db, me, 'স্টাফ সেভ', username);
    await saveDb(db);
    return json({ ok: true });
  }
  if (action === 'staff-delete') {
    { const d = superOnly(); if (d) return d; }
    db.staff = db.staff.filter((x) => x.username !== b.username);
    logAct(db, me, 'স্টাফ ডিলিট', b.username);
    await saveDb(db);
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}
