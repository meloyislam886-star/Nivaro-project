import { CartProvider } from '@/components/Cart';
import { LangProvider } from '@/components/Lang';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import Logo from '@/components/Logo';
import Social from '@/components/Social';
import Tracking from '@/components/Tracking';
import { readDb as getDb } from '@/lib/db';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || '';

export async function generateMetadata() {
  const { settings } = await getDb();
  const { lang } = await getT();
  const tag = settings.tagline || 'Elevate Your Style';
  const desc = lang === 'bn'
    ? `${settings.storeName} — প্রিমিয়াম পাঞ্জাবির ব্র্যান্ড। সেরা ফেব্রিক, নিখুঁত ফিটিং, সারাদেশে ক্যাশ অন ডেলিভারি।`
    : `${settings.storeName} — premium panjabi brand in Bangladesh. Finest fabric, perfect fit, cash on delivery nationwide.`;
  return {
    metadataBase: SITE ? new URL(SITE) : undefined,
    title: { default: `${settings.storeName} | ${tag} — Premium Panjabi Bangladesh`, template: `%s | ${settings.storeName}` },
    description: desc,
    openGraph: { siteName: settings.storeName, type: 'website', title: `${settings.storeName} | ${tag}`, description: desc },
  };
}

export default async function ShopLayout({ children }) {
  const { settings, categories } = await getDb();
  const { lang, t } = await getT();
  const hex = /^#[0-9a-fA-F]{6}$/.test(settings.brandColor || '') ? settings.brandColor : '#050724';
  const addr = (lang === 'bn' && settings.addressBn) || settings.address;
  return (
    <LangProvider lang={lang}>
      <style>{`:root{--brand:${hex}}`}</style>
      <Tracking tracking={settings.tracking} />
      <CartProvider>
        <Header settings={settings} categories={categories} />
        <main className="wrap">{children}</main>
        <footer className="ft">
          <div className="wrap cols">
            <div className="fb">
              <img className="fmark" src="/brand/mark.png" alt="" />
              <Logo name={settings.storeName} logo={settings.logo} tagline={settings.tagline} />
              <p>{t('ftAbout')}</p>
              <h5>{t('followUs')}</h5>
              <Social social={settings.social} whatsapp={settings.whatsapp} />
            </div>
            <div><h5>{t('ftShop')}</h5><a href="/products">{t('allProducts')}</a>{categories.map((c) => <a key={c.slug} href={'/products?category=' + c.slug}>{(lang === 'bn' && c.nameBn) || c.name}</a>)}</div>
            <div><h5>{t('ftHelp')}</h5><a href="/track-order">{t('trackOrder')}</a><a href="/products?flag=newArrival">{t('newIn')}</a><a href="/products?flag=deals">{t('hotDeals')}</a><a href="/cart">{t('cart')}</a></div>
            <div><h5>{t('ftContact')}</h5>
              <a href={'tel:' + settings.phone}>☎ {settings.phone}</a>
              {settings.hotline ? <a href={'tel:' + settings.hotline}>☎ {settings.hotline} · {t('hotline')}</a> : null}
              <a href={'https://wa.me/' + settings.whatsapp} target="_blank" rel="noreferrer">WhatsApp: +{settings.whatsapp}</a>
              {settings.email ? <a href={'mailto:' + settings.email}>✉ {settings.email}</a> : null}
              {settings.website ? <a href={'https://' + String(settings.website).replace(/^https?:\/\//, '')} target="_blank" rel="noreferrer">🌐 {settings.website}</a> : null}
              <span>📍 {addr}</span></div>
          </div>
          <div className="wrap copy">© {new Date().getFullYear()} {settings.storeName}. {t('rights')}</div>
        </footer>
        <MobileNav phone={settings.phone} />
        <a className="wa" href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent('Hello ' + settings.storeName + ', I need help.')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.700 13.600L3 21l4.500-1.200A9 9 0 1 0 12 3zm4.600 12.300c-.2.600-1.200 1.100-1.700 1.200-.4.100-1 .1-1.600-.1-.4-.1-.9-.3-1.500-.6-2.600-1.100-4.300-3.700-4.400-3.900-.1-.2-1-1.300-1-2.500s.6-1.800.9-2c.2-.2.500-.3.700-.3h.5c.2 0 .4 0 .6.500.2.500.7 1.700.8 1.800.1.100.1.300 0 .4-.1.200-.1.300-.3.500l-.4.500c-.1.100-.3.300-.1.600.2.300.7 1.200 1.500 1.900 1 .9 1.900 1.200 2.200 1.300.3.100.4.100.6-.1.200-.2.700-.8.900-1.100.2-.3.400-.2.600-.1l1.800.9c.3.100.5.200.5.300.1.200.1.700-.1 1.300z" /></svg><span>WhatsApp</span></a>
      </CartProvider>
    </LangProvider>
  );
}
