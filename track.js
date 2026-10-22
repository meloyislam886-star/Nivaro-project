'use client';
// Tracking data layer. Every storefront event is pushed to window.dataLayer in
// GA4 e-commerce format (GTM-ready, incl. server-side GTM / Meta CAPI via event_id).
// When no GTM container is configured, GA4 / Meta Pixel / TikTok Pixel (if set) are fired directly.

const cur = 'BDT';
const item = (p, i = 0) => ({ item_id: p.id, item_name: p.name, price: Number(p.price) || 0, quantity: p.qty || 1, item_variant: p.size || undefined, item_category: p.category || undefined, index: i });

export const eid = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function track(event, ecommerce = {}, extra = {}) {
  if (typeof window === 'undefined') return;
  const event_id = extra.event_id || eid();
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({ event, event_id, ecommerce: { currency: cur, ...ecommerce }, ...extra.data });
  } catch {}
  if (window.__gtm) return; // GTM handles the tags
  const items = ecommerce.items || [];
  const value = ecommerce.value ?? items.reduce((s, x) => s + x.price * x.quantity, 0);
  try {
    if (window.gtag) window.gtag('event', event, { currency: cur, ...ecommerce });
    if (window.fbq) {
      const ids = items.map((x) => x.item_id);
      const base = { content_ids: ids, content_type: 'product', currency: cur, value, num_items: items.reduce((s, x) => s + x.quantity, 0) };
      const m = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase', search: 'Search' }[event];
      if (m) window.fbq('track', m, m === 'Search' ? { search_string: extra.data?.search_term || '' } : base, { eventID: event_id });
    }
    if (window.ttq) {
      const m = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'CompletePayment', search: 'Search' }[event];
      if (m) window.ttq.track(m, { contents: items.map((x) => ({ content_id: x.item_id, content_name: x.item_name, quantity: x.quantity, price: x.price })), content_type: 'product', currency: cur, value }, { event_id });
    }
  } catch {}
  return event_id;
}

export const ev = {
  viewItem: (p) => track('view_item', { value: p.price, items: [item(p)] }),
  addToCart: (p, qty = 1, size) => track('add_to_cart', { value: p.price * qty, items: [item({ ...p, qty, size })] }),
  beginCheckout: (items, value) => track('begin_checkout', { value, items: items.map((p, i) => item(p, i)) }),
  purchase: (o) => track('purchase', { transaction_id: o.orderNo, value: o.total, shipping: o.shipping, items: o.items.map((p, i) => item(p, i)) }, { event_id: o.orderNo }),
  search: (q) => track('search', {}, { data: { search_term: q } }),
};
