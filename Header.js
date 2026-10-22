'use client';
import { useCart } from './Cart';
import { useLang, LangSwitch } from './Lang';
import SearchBar from './SearchBar';
import Logo from './Logo';

export default function Header({ settings, categories }) {
  const { count } = useCart();
  const { t, lang, pick } = useLang();
  const ann = lang === 'bn' ? settings.announceBn || settings.announce : settings.announce || settings.announceBn;
  return (
    <>
      <div className="topbar"><div className="wrap"><span className="tl">{ann}</span><span className="tr">☎ {settings.phone}{settings.hotline ? <> <em>•</em> {t('hotline')} {settings.hotline}</> : null}</span></div></div>
      <header className="h">
        <div className="wrap hrow">
          <Logo name={settings.storeName} logo={settings.logo} tagline={settings.tagline} />
          <SearchBar />
          <div className="hact">
            <LangSwitch />
            <a href="/track-order" className="hide" title={t('trackOrder')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></svg>
              <span>{t('trackOrder')}</span>
            </a>
            <a href="/cart" className="cartb" aria-label={t('cart')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
              <span className="hide">{t('cart')}</span>{count > 0 && <i>{count}</i>}
            </a>
          </div>
        </div>
        <nav className="cats"><div className="wrap">
          <a href="/products">{t('allProducts')}</a>
          {categories.map((c) => <a key={c.slug} href={'/products?category=' + c.slug}>{pick(c, 'name')}</a>)}
          <a href="/products?flag=newArrival">{t('newIn')}</a>
          <a href="/products?flag=deals" className="hot">{t('hotDeals')}</a>
        </div></nav>
      </header>
    </>
  );
}
