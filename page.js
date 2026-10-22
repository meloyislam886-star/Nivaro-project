import { readDb as getDb } from '@/lib/db';
import { getT } from '@/lib/lang';
import ProductCard from '@/components/ProductCard';
import HeroSlider from '@/components/HeroSlider';
import CatTile from '@/components/CatTile';

export default async function Home() {
  const { products, categories, settings } = await getDb();
  const { lang, t } = await getT();
  const SECTIONS = [
    ['newArrival', t('secNew'), t('secNewS')],
    ['bestSeller', t('secBest'), t('secBestS')],
    ['deals', t('secDeals'), t('secDealsS')],
    ['featured', t('secFeatured'), ''],
    ['trending', t('secTrend'), ''],
  ];
  return (
    <>
      <HeroSlider slides={settings.heroSlides || []} />
      <div className="perks">
        {[['🚚', 'perk1'], ['💳', 'perk2'], ['🔄', 'perk3'], ['✨', 'perk4']].map(([ic, k]) => <div key={k}><em>{ic}</em><span><b>{t(k)}</b>{t(k + 's')}</span></div>)}
      </div>
      <div className="sech"><h2>{t('shopByCat')}</h2><p>{t('shopByCatSub')}</p></div>
      <div className="catg">{categories.map((c) => <CatTile key={c.slug} c={c} lang={lang} label={t('explore')} />)}</div>
      {SECTIONS.map(([flag, title, sub], idx) => {
        const list = products.filter((p) => p.flags?.[flag]).slice(0, 10);
        if (!list.length) return null;
        return (
          <section key={flag}>
            <div className="sech row"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div><a href={'/products?flag=' + flag}>{t('viewAll')} →</a></div>
            <div className="grid rail">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
            {idx === 1 && (
              <div className="banner">
                <img className="bm" src="/brand/mark.png" alt="" />
                <div><h3>{t('bannerT')}</h3><p>{t('bannerS')}</p></div>
                <a className="btn p big" href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent('Hello ' + settings.storeName)}`} target="_blank" rel="noreferrer">{t('bannerCta')}</a>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
