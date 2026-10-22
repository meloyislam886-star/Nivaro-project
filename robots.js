export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || '';
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/checkout', '/cart'] }], sitemap: base ? base + '/sitemap.xml' : undefined };
}
