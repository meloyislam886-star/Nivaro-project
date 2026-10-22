'use client';
import { useState } from 'react';

export default function ProductGallery({ images = [], name = '' }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="big"><img className="phm" src="/brand/mark.png" alt="" /></div>;
  return (
    <div className="gal">
      <div className="big"><img key={i} src={images[i]} alt={name} /></div>
      {images.length > 1 && <div className="thumbs">{images.map((u, k) => <button type="button" key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={'Image ' + (k + 1)}><img src={u} alt="" /></button>)}</div>}
    </div>
  );
}
