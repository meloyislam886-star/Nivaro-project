import { cookies } from 'next/headers';
import { makeT } from './i18n';

export async function getLang() {
  try { const v = (await cookies()).get('lang')?.value; return v === 'en' ? 'en' : 'bn'; } catch { return 'bn'; }
}
export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
