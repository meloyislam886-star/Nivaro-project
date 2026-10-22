export default function Logo({ name = 'Nivaro', logo = '', size = '', tagline = '' }) {
  if (logo) return <a href="/" className={'logo img ' + size} aria-label={name}><img src={logo} alt={name} /></a>;
  return (
    <a href="/" className={'logo ' + size} aria-label={name}>
      <img className="lm" src="/brand/mark.png" alt="" width="56" height="36" />
      <span className="lt"><b>{name}</b>{tagline && size !== 'sm' ? <small>{tagline}</small> : null}</span>
    </a>
  );
}
