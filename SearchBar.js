'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from './Lang';
import { ev } from '@/lib/track';

const taka = (n) => '৳' + Number(n || 0).toLocaleString('en-US');

export default function SearchBar() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [act, setAct] = useState(-1);
  const box = useRef(null);
  const seq = useRef(0);

  // live suggestions (debounced, race-safe)
  useEffect(() => {
    const term = q.trim();
    if (!term) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/search?q=' + encodeURIComponent(term), { cache: 'no-store' });
        const d = await r.json();
        if (my === seq.current) { setItems(d.items || []); setAct(-1); setLoading(false); }
      } catch { if (my === seq.current) setLoading(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, []);

  const go = (e) => {
    e?.preventDefault();
    setOpen(false);
    if (act >= 0 && items[act]) router.push('/product/' + items[act].slug);
    else if (q.trim()) { ev.search(q.trim()); router.push('/products?q=' + encodeURIComponent(q.trim())); }
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setAct((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(-1, a - 1)); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="sbox" ref={box}>
      <form onSubmit={go} role="search">
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          placeholder={t('searchPh')} aria-label="Search products" autoComplete="off" />
        <button type="submit" aria-label={t('searchBtn')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><span>{t('searchBtn')}</span></button>
      </form>
      {open && q.trim() && (
        <div className="sugg">
          {items.map((p, i) => (
            <a key={p.id} href={'/product/' + p.slug} className={i === act ? 'act' : ''} onClick={() => setOpen(false)}>
              <div className="th">{p.image ? <img src={p.image} alt="" /> : <img className="phm" src="/brand/mark.png" alt="" />}</div>
              <div className="nm">{(lang === 'bn' && p.nameBn) || p.name}</div>
              <div className="pr">{taka(p.price)}</div>
            </a>
          ))}
          {!items.length && !loading && <div className="none">{t('searchNone', { q })}</div>}
          {loading && !items.length && <div className="none">{t('searching')}</div>}
          {items.length > 0 && <a className="all" href={'/products?q=' + encodeURIComponent(q.trim())} onClick={() => setOpen(false)}>{t('searchAll')}</a>}
        </div>
      )}
    </div>
  );
}
