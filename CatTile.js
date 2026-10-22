export default function CatTile({ c, lang, label }) {
  const name = (lang === 'bn' && c.nameBn) || c.name;
  return (
    <a href={'/products?category=' + c.slug} className="ctile" style={c.image ? { '--ci': `url(${c.image})` } : undefined}>
      <span className={'cimg' + (c.image ? ' has' : '')}>{!c.image && <img src="/brand/mark.png" alt="" />}</span>
      <span className="cl"><b>{name}</b><em>{label} →</em></span>
    </a>
  );
}
