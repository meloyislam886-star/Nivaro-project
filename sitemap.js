import { readDb as getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const { products, categories } = await getDb();
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: base + '/products', changeFrequency: 'daily', priority: 0.8 },
    ...categories.map((c) => ({ url: `${base}/products?category=${c.slug}`, changeFrequency: 'weekly', priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, changeFrequency: 'weekly', priority: 0.9 })),
  ];
}
