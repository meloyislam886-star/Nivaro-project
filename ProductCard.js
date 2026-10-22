'use client';
import CardButtons from './CardButtons';
import { useLang } from './Lang';

const taka = (n) => '৳' + Number(n || 0).toLocaleString('en-US');

export default function ProductCard({ p }) {
  const { t, lang } = useLang();
  const name = (lang === 'bn' && p.nameBn) || p.name;
  const off = p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  const slim = { id: p.id, slug: p.slug, name: p.name, nameBn: p.nameBn, price: p.price, image: p.image, stock: p.stock, sizes: p.sizes || [], category: p.category };
  const second = p.images && p.images[0];
  return (
    <div className="card">
      {p.stock <= 0 ? <span className="badge oos">{t('oos')}</span> : off > 0 ? <span className="badge">-{off}%</span> : null}
      <a href={'/product/' + p.slug} className={'im' + (second ? ' two' : '')} aria-label={name}>
        {p.image ? <img src={p.image} alt={name} loading="lazy" /> : <span className="ph"><img src="/brand/mark.png" alt="" /></span>}
        {p.image && second ? <img className="alt" src={second} alt="" loading="lazy" /> : null}
      </a>
      <div className="bd">
        <h3><a href={'/product/' + p.slug}>{name}</a></h3>
        <div className="price">{taka(p.price)}{off > 0 && <s>{taka(p.oldPrice)}</s>}</div>
      </div>
      <CardButtons product={slim} />
    </div>
  );
}
