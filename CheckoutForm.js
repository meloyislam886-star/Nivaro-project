'use client';
import { useEffect, useRef, useState } from 'react';
import { useCart, readBuyNow } from './Cart';
import { useLang } from './Lang';
import { ev } from '@/lib/track';

const taka = (n) => '৳' + Number(n || 0).toLocaleString('en-US');

export default function CheckoutForm({ settings }) {
  const cart = useCart();
  const { t, lang } = useLang();
  const [direct, setDirect] = useState(null); // Order Now: single-item order, cart untouched
  const [f, setF] = useState({ name: '', phone: '', address: '', zone: 'dhaka', note: '', payment: 'cod', trxId: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fired = useRef(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const phoneNorm = (v) => String(v || '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/\D/g, '').replace(/^(880|88)/, '').replace(/^1/, '01').slice(0, 11);

  useEffect(() => { if (new URLSearchParams(window.location.search).get('now') === '1') { const b = readBuyNow(); if (b.length) setDirect(b); } }, []);
  const items = direct || cart.items;
  const subtotal = items.reduce((s, x) => s + x.qty * x.price, 0);
  const ship = settings.freeShipOver > 0 && subtotal >= settings.freeShipOver ? 0 : f.zone === 'dhaka' ? settings.shipDhaka : settings.shipOutside;
  const total = subtotal + ship;

  useEffect(() => {
    if (!cart.ready || fired.current || !items.length) return;
    fired.current = true;
    ev.beginCheckout(items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, size: i.size })), subtotal);
  }, [cart.ready, items, subtotal]);

  if (!cart.ready) return <div className="box" style={{ margin: '20px 0' }}>{t('loading')}</div>;
  if (!items.length) return <div className="box" style={{ margin: '20px 0', textAlign: 'center', padding: 44 }}>{t('cartEmpty')} <a href="/products" style={{ color: 'var(--brand)', fontWeight: 600 }}>{t('startShopping')}</a></div>;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!/^01[3-9]\d{8}$/.test(phoneNorm(f.phone))) return setErr(t('errPhone'));
    if (f.name.trim().length < 2) return setErr(t('errName'));
    if (f.address.trim().length < 8) return setErr(t('errAddr'));
    if (f.payment !== 'cod' && f.trxId.trim().length < 4) return setErr(t('errTrx'));
    setBusy(true);
    try {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...f, phone: phoneNorm(f.phone), items: items.map((i) => ({ id: i.id, qty: i.qty, size: i.size || '' })) }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t('errOrder'));
      try { sessionStorage.setItem('lastOrder', JSON.stringify({ orderNo: d.orderNo, total: d.total ?? total, shipping: d.shipping ?? ship, items: (d.items || items).map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, size: i.size || '' })) })); } catch {}
      if (direct) { try { localStorage.removeItem('buynow'); } catch {} } else cart.clear();
      window.location.assign('/order/' + d.orderNo);
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="co">
      <div className="box f">
        <h1 className="ptitle sm">{t('deliveryInfo')}</h1>
        {err && <div className="err">{err}</div>}
        <div className="two">
          <label>{t('yourName')} *<input value={f.name} onChange={set('name')} autoComplete="name" required /></label>
          <label>{t('mobile')} *<input value={f.phone} onChange={set('phone')} inputMode="numeric" maxLength={14} placeholder="01XXXXXXXXX" autoComplete="tel" required /></label>
        </div>
        <label>{t('address')} *<textarea rows={3} value={f.address} onChange={set('address')} placeholder={t('addressPh')} required /></label>
        <label>{t('zone')}
          <select value={f.zone} onChange={set('zone')}>
            <option value="dhaka">{t('inDhaka')} ({taka(settings.shipDhaka)})</option>
            <option value="outside">{t('outDhaka')} ({taka(settings.shipOutside)})</option>
          </select></label>
        <label>{t('payment')}
          <select value={f.payment} onChange={set('payment')}>
            <option value="cod">{t('cod')}</option>
            {settings.bkashNumber && <option value="bkash">bKash</option>}
            {settings.nagadNumber && <option value="nagad">Nagad</option>}
          </select></label>
        {f.payment !== 'cod' && (
          <div className="okb">{f.payment === 'bkash' ? 'bKash' : 'Nagad'} {t('sendMoneyTo')}: <b>{f.payment === 'bkash' ? settings.bkashNumber : settings.nagadNumber}</b> — {taka(total)} {t('sendAndEnter')}
            <input style={{ marginTop: 8, padding: 10, width: '100%', border: '1.5px solid #bbf7d0', borderRadius: 9 }} value={f.trxId} onChange={set('trxId')} placeholder={t('trxId')} /></div>
        )}
        <label>{t('note')}<input value={f.note} onChange={set('note')} /></label>
      </div>
      <div className="box cosum">
        <h2>{t('summary')}</h2>
        {items.map((i) => <div key={i.key || i.id + i.size} className="sl"><span>{(lang === 'bn' && i.nameBn) || i.name}{i.size ? ` (${i.size})` : ''} × {i.qty}</span><b>{taka(i.price * i.qty)}</b></div>)}
        <div className="sum" style={{ marginTop: 10 }}>
          <div><span>{t('subtotal')}</span><span>{taka(subtotal)}</span></div>
          <div><span>{t('delivery')}</span><span>{ship ? taka(ship) : t('free')}</span></div>
          <div className="t"><span>{t('grand')}</span><span>{taka(total)}</span></div>
        </div>
        <button className="btn p big" disabled={busy} style={{ width: '100%', marginTop: 14 }}>{busy ? t('ordering') : t('confirmOrder')}</button>
      </div>
    </form>
  );
}
