'use client';
import { useEffect } from 'react';
import { ev } from '@/lib/track';

// Fires the GA4/Meta "purchase" event once per order (event_id = order number for server-side dedup).
export default function PurchaseTrack({ orderNo }) {
  useEffect(() => {
    try {
      const k = 'tracked_' + orderNo;
      if (localStorage.getItem(k)) return;
      const o = JSON.parse(sessionStorage.getItem('lastOrder') || 'null');
      if (!o || o.orderNo !== orderNo) return;
      ev.purchase(o);
      localStorage.setItem(k, '1');
    } catch {}
  }, [orderNo]);
  return null;
}
