const IC = {
  facebook: <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3C16.4 4.2 15.5 4 14.4 4c-2.3 0-3.9 1.4-3.9 4v2.4H8v3h2.5V21z" />,
  youtube: <><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8z" /><path d="m10 15 5-3-5-3z" fill="var(--navy)" /></>,
  tiktok: <path d="M16.6 3a4.8 4.8 0 0 0 3.8 4.2v3.1a8 8 0 0 1-3.8-1.1v6.1a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.2a2.5 2.5 0 1 0 1.7 2.3V3z" />,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="16.8" cy="7.2" r="1.1" /></>,
  whatsapp: <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm4.6 12.3c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.1.1.3 0 .4-.1.2-.1.3-.3.5l-.4.5c-.1.1-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1l1.8.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" />,
};
const NAME = { facebook: 'Facebook', youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram' };

export default function Social({ social = {}, whatsapp = '' }) {
  const list = Object.keys(NAME).filter((k) => /^https?:\/\//i.test(social[k] || ''));
  if (whatsapp) list.push('whatsapp');
  if (!list.length) return null;
  return (
    <div className="soc">
      {list.map((k) => (
        <a key={k} href={k === 'whatsapp' ? 'https://wa.me/' + whatsapp : social[k]} target="_blank" rel="noopener noreferrer" aria-label={k === 'whatsapp' ? 'WhatsApp' : NAME[k]} title={k === 'whatsapp' ? 'WhatsApp' : NAME[k]}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{IC[k]}</svg>
        </a>
      ))}
    </div>
  );
}
