'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from './Lang';

const DUR = 6000;
const two = (n) => String(n).padStart(2, '0');

export default function HeroSlider({ slides = [] }) {
  const { lang, pick } = useLang();
  const n = slides.length;
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [paused, setPaused] = useState(false);
  const st = useRef({ x: 0, y: 0, on: false, moved: false, lock: null });
  const box = useRef(null);

  const go = useCallback((k) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused || drag) return;
    const t = setTimeout(() => go(i + 1), DUR);
    return () => clearTimeout(t);
  }, [i, n, paused, drag, go]);

  if (!n) return null;

  const down = (e) => { st.current = { x: e.clientX, y: e.clientY, on: true, moved: false, lock: null }; };
  const move = (e) => {
    const s = st.current; if (!s.on) return;
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y;
    if (!s.lock) { if (Math.abs(ddx) > 8 || Math.abs(ddy) > 8) s.lock = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'; else return; }
    if (s.lock === 'y') { s.on = false; setDrag(false); setDx(0); return; }
    s.moved = true; setDrag(true);
    const edge = (i === 0 && ddx > 0) || (i === n - 1 && ddx < 0);
    setDx(edge ? ddx * 0.35 : ddx);
  };
  const up = () => {
    const s = st.current; if (!s.on) { setDrag(false); setDx(0); return; }
    s.on = false;
    const w = box.current?.offsetWidth || 1;
    if (Math.abs(dx) > Math.min(70, w * 0.16)) go(i + (dx < 0 ? 1 : -1));
    setDrag(false); setDx(0);
  };

  return (
    <section className="hero" ref={box} aria-roledescription="carousel" aria-label="Featured"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClickCapture={(e) => { if (st.current.moved) { e.preventDefault(); e.stopPropagation(); st.current.moved = false; } }}>
      <div className={'track' + (drag ? ' drag' : '')} style={{ transform: `translateX(calc(${-i * 100}% + ${dx}px))` }}>
        {slides.map((s, k) => {
          const badge = pick(s, 'badge'), title = pick(s, 'title'), sub = pick(s, 'sub'), cta = pick(s, 'cta') || 'Shop Now';
          return (
            <div key={k} className={'slide v' + (k % 3) + (k === i ? ' on' : '') + (s.image ? ' hasimg' : '')} aria-hidden={k !== i}>
              {s.image && <div className="bgimg d" style={{ backgroundImage: `url(${s.image})` }} />}
              {(s.imageMobile || s.image) && <div className="bgimg m" style={{ backgroundImage: `url(${s.imageMobile || s.image})` }} />}
              {!s.image && <div className="wm" aria-hidden="true"><img src="/brand/mark.png" alt="" /></div>}
              <div className="shade" />
              <div className="sc">
                {badge && <span className="sbadge">{badge}</span>}
                <h2>{title}</h2>
                {sub && <p>{sub}</p>}
                <a href={s.link || '/'} className="scta" tabIndex={k === i ? 0 : -1}>{cta} <span>→</span></a>
              </div>
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <>
          <button type="button" className="arr l" aria-label="Previous" onClick={() => go(i - 1)}>‹</button>
          <button type="button" className="arr r" aria-label="Next" onClick={() => go(i + 1)}>›</button>
          <div className="cnt" aria-hidden="true"><b>{two(i + 1)}</b> / {two(n)}</div>
          <div className="dots">{slides.map((_, k) => <button type="button" key={k} aria-label={'Slide ' + (k + 1)} className={k === i ? 'on' : ''} onClick={() => go(k)}><u key={k === i ? i : 'x'} style={k === i && !paused ? { animationDuration: DUR + 'ms' } : undefined} /></button>)}</div>
        </>
      )}
    </section>
  );
}
