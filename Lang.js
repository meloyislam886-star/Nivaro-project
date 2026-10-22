'use client';
import { createContext, useContext, useMemo } from 'react';
import { makeT, pick } from '@/lib/i18n';

const Ctx = createContext({ lang: 'bn', t: makeT('bn'), pick: (o, f) => pick(o, f, 'bn') });
export const useLang = () => useContext(Ctx);

export function LangProvider({ lang, children }) {
  const v = useMemo(() => ({ lang, t: makeT(lang), pick: (o, f) => pick(o, f, lang) }), [lang]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function LangSwitch() {
  const { lang } = useLang();
  const set = (l) => {
    if (l === lang) return;
    try { document.cookie = 'lang=' + l + ';path=/;max-age=31536000;samesite=lax'; } catch {}
    window.location.reload();
  };
  return (
    <div className="lsw" role="group" aria-label="Language">
      <button type="button" className={lang === 'bn' ? 'on' : ''} onClick={() => set('bn')} aria-pressed={lang === 'bn'}>বাং</button>
      <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => set('en')} aria-pressed={lang === 'en'}>EN</button>
    </div>
  );
}
