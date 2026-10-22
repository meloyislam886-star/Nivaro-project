'use client';
import { useEffect } from 'react';
import { ev } from '@/lib/track';

export default function ViewTrack({ product }) {
  useEffect(() => { ev.viewItem(product); }, [product]);
  return null;
}
