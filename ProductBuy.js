'use client';
import { useRef, useState } from 'react';
import CardButtons from './CardButtons';
import { useLang } from './Lang';

const taka = (n) => '৳' + Number(n || 0).toLocaleString('en-US');

export default function ProductBuy({ product }) {
  const { t } = useLang();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState('');
  const [err, setErr] = useState(false);
  const ref = useRef(null);
  const max = product.stock > 0 ? product.stock : 1;
  const sizes = product.sizes || [];
  const need = () => { setErr(true); ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  return (
    <div>
      {sizes.length > 0 && product.stock > 0 && (
        <div ref={ref} className={'sizebox' + (err && !size ? ' err' : '')}>
          <div className="sz-h"><b>{t('size')}</b>{err && !size && <em>{t('pickSizeErr')}</em>}</div>
          <div className="sizes">{sizes.map((s) => <button type="button" key={s} className={size === s ? 'on' : ''} onClick={() => { setSize(s); setErr(false); }}>{s}</button>)}</div>
        </div>
      )}
      {product.stock > 0 && (
        <div className="qrow">
          <span>{t('qty')}</span>
          <div className="qty">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−">−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="+">+</button>
          </div>
        </div>
      )}
      <CardButtons product={product} qty={qty} size={size} onNeedSize={need} big />
      <div className="buybar">
        <div className="bp"><small>{t('total')}</small><b>{taka(product.price * qty)}</b></div>
        <CardButtons product={product} qty={qty} size={size} onNeedSize={need} bar />
      </div>
    </div>
  );
}
