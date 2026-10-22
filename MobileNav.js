'use client';
import { useEffect, useState } from 'react';
import { useCart } from './Cart';
import { useLang } from './Lang';

const I = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  shop: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
  cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.1L21 7H6" /></>,
  track: <><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>,
  call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
};

export default function MobileNav({ phone }) {
  const { count } = useCart();
  const { t } = useLang();
  const [path, setPath] = useState('');
  useEffect(() => setPath(window.location.pathname), []);
  const it = (href, icon, label, extra) => (
    <a href={href} className={path === href || (href !== '/' && path.startsWith(href)) ? 'on' : ''}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[icon]}</svg>
      <span>{label}</span>{extra}
    </a>
  );
  return (
    <nav className="mnav" aria-label="Main">
      {it('/', 'home', t('home'))}
      {it('/products', 'shop', t('shop'))}
      {it('/cart', 'cart', t('cart'), count > 0 && <i>{count}</i>)}
      {it('/track-order', 'track', t('track'))}
      {it('tel:' + phone, 'call', t('call'))}
    </nav>
  );
}
