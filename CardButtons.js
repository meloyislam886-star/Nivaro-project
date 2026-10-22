'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from './Cart';
import { useLang } from './Lang';
import { ev } from '@/lib/track';

const CartIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>;
const BoltIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>;

export default function CardButtons({ product, qty = 1, size = '', onNeedSize, big = false, bar = false }) {
  const { add, buyNow } = useCart();
  const { t, lang } = useLang();
  const [done, setDone] = useState(false);
  const [going, setGoing] = useState(false);
  const [sheet, setSheet] = useState(null); // 'cart' | 'order' | null
  const [pick, setPick] = useState('');
  const out = product.stock <= 0;
  const sizes = product.sizes || [];
  const sz = big ? ' big' : '';

  const run = (kind, s) => {
    if (kind === 'cart') {
      add(product, qty, s);
      ev.addToCart(product, qty, s);
      setDone(true); setTimeout(() => setDone(false), 1500);
    } else {
      if (going) return;
      setGoing(true);
      buyNow(product, qty, s);
      ev.addToCart(product, qty, s);
      window.location.assign('/checkout?now=1');
      setTimeout(() => setGoing(false), 5000);
    }
  };
  const click = (kind) => {
    if (out) return;
    if (sizes.length && !size) {
      if (onNeedSize) return onNeedSize();
      setPick(''); return setSheet(kind);
    }
    run(kind, size);
  };

  return (
    <>
      <div className={'btns' + (bar ? ' bar' : '')} style={big ? { padding: 0, marginTop: 18 } : undefined}>
        <button type="button" className={'btn cart' + sz + (done ? ' done' : '')} disabled={out} onClick={() => click('cart')}>
          {done ? <>✓ {t('added')}</> : <><CartIcon /> {t('addToCart')}</>}
        </button>
        <button type="button" className={'btn p order' + sz} disabled={out} onClick={() => click('order')}>
          {going ? t('wait') : out ? t('outOfStockBtn') : <><BoltIcon /> {t('orderNow')}</>}
        </button>
      </div>
      {sheet && typeof document !== 'undefined' && createPortal(
        <div className="sheetbg" onClick={() => setSheet(null)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="sh-h"><b>{t('chooseSize')}</b><button type="button" aria-label={t('cancel')} onClick={() => setSheet(null)}>✕</button></div>
            <div className="sh-n">{(lang === 'bn' && product.nameBn) || product.name}</div>
            <div className="sizes">{sizes.map((s) => <button type="button" key={s} className={pick === s ? 'on' : ''} onClick={() => setPick(s)}>{s}</button>)}</div>
            <button type="button" className="btn p big" style={{ width: '100%' }} disabled={!pick} onClick={() => { const k = sheet; setSheet(null); run(k, pick); }}>
              {sheet === 'order' ? t('orderNow') : t('addToCart')}
            </button>
          </div>
        </div>, document.body)}
    </>
  );
}
