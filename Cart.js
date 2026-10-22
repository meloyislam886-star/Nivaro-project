'use client';
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useLang } from './Lang';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

const rd = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const wr = (k, items) => { try { localStorage.setItem(k, JSON.stringify(items)); } catch {} };
export const readBuyNow = () => rd('buynow');

const keyOf = (p, size) => p.id + '|' + (size || '');
const line = (p, qty, size) => ({ key: keyOf(p, size), id: p.id, slug: p.slug, name: p.name, nameBn: p.nameBn, price: p.price, image: p.image, stock: p.stock, size: size || '', qty: Math.min(p.stock > 0 ? p.stock : 99, qty) });

function merge(cur, p, qty, size) {
  const max = p.stock > 0 ? p.stock : 99;
  const k = keyOf(p, size);
  const i = cur.findIndex((x) => (x.key || keyOf(x, x.size)) === k);
  if (i >= 0) { const n = [...cur]; n[i] = { ...n[i], stock: p.stock, price: p.price, qty: Math.min(max, n[i].qty + qty) }; return n; }
  return [...cur, line(p, qty, size)];
}

export function CartProvider({ children }) {
  const { t, lang } = useLang();
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);
  const ref = useRef([]);
  const timer = useRef(null);

  useEffect(() => { const c = rd('cart'); ref.current = c; setItems(c); setReady(true); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === 'cart') { const c = rd('cart'); ref.current = c; setItems(c); } };
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  const commit = useCallback((next) => { ref.current = next; setItems(next); wr('cart', next); }, []);

  const add = useCallback((p, qty = 1, size = '') => {
    commit(merge(ref.current, p, qty, size));
    clearTimeout(timer.current);
    setToast({ p, size, k: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, [commit]);
  // Order Now: a separate one-item "direct" order so the shopper's cart is untouched.
  const buyNow = useCallback((p, qty = 1, size = '') => { wr('buynow', [line(p, qty, size)]); }, []);
  const setQty = useCallback((key, qty) => commit(ref.current.map((x) => ((x.key || keyOf(x, x.size)) === key ? { ...x, qty: Math.max(1, Math.min(x.stock || 99, qty)) } : x))), [commit]);
  const remove = useCallback((key) => commit(ref.current.filter((x) => (x.key || keyOf(x, x.size)) !== key)), [commit]);
  const clear = useCallback(() => commit([]), [commit]);
  const count = items.reduce((s, x) => s + x.qty, 0);
  const subtotal = items.reduce((s, x) => s + x.qty * x.price, 0);

  return (
    <Ctx.Provider value={{ items, add, buyNow, setQty, remove, clear, count, subtotal, ready }}>
      {children}
      {toast && (
        <div className="toast" key={toast.k} role="status">
          <span className="tk">✓</span>
          <span className="tt"><b>{t('addedToCart')}</b><small>{(lang === 'bn' && toast.p.nameBn) || toast.p.name}{toast.size ? ' · ' + toast.size : ''}</small></span>
          <a href="/cart">{t('viewCart')}</a>
        </div>
      )}
    </Ctx.Provider>
  );
}
