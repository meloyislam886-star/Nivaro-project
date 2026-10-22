'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Logo from './Logo';

const taka = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const STATUS = { pending: 'অপেক্ষমাণ', confirmed: 'কনফার্মড', processing: 'প্রসেসিং', shipped: 'শিপড', delivered: 'ডেলিভার্ড', cancelled: 'বাতিল', returned: 'রিটার্ন' };
const FLAGS = { deals: 'হট ডিল', featured: 'ফিচার্ড', bestSeller: 'বেস্ট সেলার', newArrival: 'নতুন', trending: 'ট্রেন্ডিং' };
const PAY = { cod: 'COD', bkash: 'bKash', nagad: 'Nagad' };
const fmt = (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function exportCsv(list) {
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['Order', 'Date', 'Name', 'Phone', 'Address', 'Zone', 'Items', 'Subtotal', 'Shipping', 'Total', 'Payment', 'TrxID', 'Status', 'Note']];
  list.forEach((o) => rows.push([o.orderNo, o.createdAt, o.name, o.phone, o.address, o.zone, o.items.map((i) => i.name + (i.size ? ' [' + i.size + ']' : '') + ' x' + i.qty).join('; '), o.subtotal, o.shipping, o.total, o.payment, o.trxId, o.status, o.adminNote]));
  download('orders-' + new Date().toISOString().slice(0, 10) + '.csv', '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\n'), 'text/csv;charset=utf-8');
}
async function upload(file) {
  const fd = new FormData(); fd.append('file', file);
  const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'আপলোড ব্যর্থ');
  return d.url;
}

async function api(action, body) {
  const r = await fetch('/api/admin/' + action, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
  if (!r.ok) throw new Error(d.error || 'ব্যর্থ');
  return d;
}

export default function AdminApp() {
  const [db, setDb] = useState(null);
  const [tab, setTab] = useState('dash');
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => { try { setDb(await api('data')); } catch (e) { setMsg(e.message); } }, []);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, ok) => { try { setMsg(''); await fn(); await load(); if (ok) { setMsg('✓ ' + ok); setTimeout(() => setMsg(''), 2500); } } catch (e) { setMsg('❌ ' + e.message); } };

  if (!db) return <div style={{ padding: 30 }}>{msg || 'লোড হচ্ছে…'}</div>;
  const me = db.me, P = me.perms || {}, isSuper = me.role === 'super';
  const pending = db.orders.filter((o) => o.status === 'pending').length;
  const tabs = [
    P.dash && ['dash', '📊 ড্যাশবোর্ড'],
    P.orders && ['orders', `📦 অর্ডার${pending ? ' (' + pending + ')' : ''}`],
    P.products && ['products', '🛍️ প্রডাক্ট'],
    P.cats && ['cats', '🗂️ ক্যাটাগরি'],
    P.settings && ['settings', '⚙️ সেটিংস'],
    isSuper && ['staff', '👥 স্টাফ ও পারমিশন'],
    isSuper && ['log', '🧾 অ্যাক্টিভিটি লগ'],
  ].filter(Boolean);
  const cur = tabs.find(([k]) => k === tab) ? tab : tabs[0]?.[0];
  return (
    <div className="adm">
      <aside>
        <div className="who">
          <Logo name={db.settings.storeName} logo={db.settings.logo} size="sm" />
          <small>{me.name || me.username}</small>
          <span className={'role' + (isSuper ? '' : ' st')}>{isSuper ? 'SUPER ADMIN' : 'STAFF'}</span>
        </div>
        {tabs.map(([k, l]) => <button key={k} className={cur === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        <button onClick={() => window.open('/', '_blank')}>🌐 সাইট দেখুন</button>
        <button onClick={async () => { await api('logout', {}); window.location.href = '/admin/login'; }}>🚪 লগআউট</button>
      </aside>
      <main>
        {msg && <div className={msg.startsWith('✓') ? 'okb' : 'err'} style={{ marginBottom: 12 }}>{msg}</div>}
        {!cur && <div className="box">আপনার কোনো মডিউলের অনুমতি নেই। সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।</div>}
        {cur === 'dash' && <Dash db={db} go={setTab} isSuper={isSuper} />}
        {cur === 'orders' && <Orders db={db} run={run} isSuper={isSuper} />}
        {cur === 'products' && <Products db={db} run={run} />}
        {cur === 'cats' && <Cats db={db} run={run} />}
        {cur === 'settings' && <Settings db={db} run={run} isSuper={isSuper} />}
        {cur === 'staff' && isSuper && <Staff db={db} run={run} />}
        {cur === 'log' && isSuper && <Log db={db} />}
      </main>
    </div>
  );
}

function Dash({ db, go, isSuper }) {
  const live = db.orders.filter((o) => !['cancelled', 'returned'].includes(o.status));
  const today = new Date().toDateString();
  const todays = live.filter((o) => new Date(o.createdAt).toDateString() === today);
  const rev = live.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const low = db.products.filter((p) => p.stock <= 5);
  const day = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(Date.now() - (6 - k) * 864e5); return { k: day(d), l: d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short' }), v: 0 }; });
  live.forEach((o) => { const w = week.find((x) => x.k === day(o.createdAt)); if (w) w.v += o.total; });
  const maxV = Math.max(1, ...week.map((w) => w.v));
  const sold = {}; live.forEach((o) => o.items.forEach((i) => { sold[i.name] = (sold[i.name] || 0) + i.qty; }));
  const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <>
      <h1 style={{ marginTop: 0 }}>ড্যাশবোর্ড</h1>
      {isSuper && <div className="box" style={{ marginBottom: 14 }}>
        <b>⚡ সুপার অ্যাডমিন — দ্রুত কন্ট্রোল</b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <button className="btn p" onClick={() => go('orders')}>📦 অর্ডার</button>
          <button className="btn" onClick={() => go('products')}>🛍️ প্রডাক্ট ও স্টক</button>
          <button className="btn" onClick={() => go('cats')}>🗂️ ক্যাটাগরি</button>
          <button className="btn" onClick={() => go('settings')}>⚙️ স্লাইডার / সোশ্যাল / ট্র্যাকিং</button>
          <button className="btn" onClick={() => go('staff')}>👥 স্টাফ ও পারমিশন</button>
          <button className="btn" onClick={() => go('log')}>🧾 লগ</button>
        </div>
      </div>}
      <div className="stats">
        <div className="stat"><small>আজকের অর্ডার</small><b>{todays.length}</b></div>
        <div className="stat"><small>আজকের বিক্রি</small><b>{taka(todays.reduce((s, o) => s + o.total, 0))}</b></div>
        <div className="stat"><small>পেন্ডিং অর্ডার</small><b>{db.orders.filter((o) => o.status === 'pending').length}</b></div>
        <div className="stat"><small>ডেলিভার্ড আয়</small><b>{taka(rev)}</b></div>
        <div className="stat"><small>মোট অর্ডার</small><b>{db.orders.length}</b></div>
        <div className="stat"><small>প্রডাক্ট</small><b>{db.products.length}</b></div>
        <div className="stat dark"><small>মোট বিক্রি (বাতিল বাদে)</small><b>{taka(live.reduce((s, o) => s + o.total, 0))}</b></div>
      </div>
      <div className="box" style={{ marginBottom: 14 }}>
        <b>📈 গত ৭ দিনের বিক্রি</b>
        <div className="bars">{week.map((d) => <div key={d.k}><b>{d.v ? taka(d.v) : ''}</b><i style={{ height: Math.max(3, (d.v / maxV) * 100) + '%' }} /><span>{d.l}</span></div>)}</div>
      </div>
      {top.length > 0 && <div className="box" style={{ marginBottom: 14 }}>
        <b>🏆 সবচেয়ে বেশি বিক্রি হওয়া প্রডাক্ট</b>
        <table className="tbl"><tbody>{top.map(([n, q]) => <tr key={n}><td>{n}</td><td style={{ textAlign: 'right' }}><b>{q}</b> পিস</td></tr>)}</tbody></table>
      </div>}
      <div className="box" style={{ marginBottom: 14 }}>
        <b>⚠️ লো স্টক (৫ বা কম)</b>
        {low.length ? <table className="tbl"><tbody>{low.map((p) => <tr key={p.id}><td>{p.name}</td><td style={{ color: p.stock ? 'var(--ok)' : 'var(--bad)' }}><b>{p.stock}</b></td></tr>)}</tbody></table> : <p style={{ color: 'var(--mut)' }}>সব প্রডাক্টের স্টক ঠিক আছে।</p>}
      </div>
      <div className="box">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>সাম্প্রতিক অর্ডার</b><a href="#" onClick={(e) => { e.preventDefault(); go('orders'); }} style={{ color: 'var(--brand)' }}>সব দেখুন →</a></div>
        <div className="scroll"><table className="tbl"><tbody>{db.orders.slice(0, 6).map((o) => <tr key={o.orderNo}><td><b>{o.orderNo}</b></td><td>{o.name}</td><td>{taka(o.total)}</td><td><span className={'pill ' + o.status}>{STATUS[o.status]}</span></td></tr>)}</tbody></table></div>
        {!db.orders.length && <p style={{ color: 'var(--mut)' }}>এখনও কোনো অর্ডার আসেনি।</p>}
      </div>
    </>
  );
}

function Orders({ db, run, isSuper }) {
  const [st, setSt] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const list = useMemo(() => db.orders.filter((o) => (st === 'all' || o.status === st) && (!q || (o.orderNo + o.name + o.phone).toLowerCase().includes(q.toLowerCase()))), [db.orders, st, q]);
  const cur = open && db.orders.find((o) => o.orderNo === open);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ margin: '0 0 12px' }}>অর্ডার ম্যানেজমেন্ট</h1>
        <button className="btn" onClick={() => exportCsv(list)}>⬇️ CSV এক্সপোর্ট</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {['all', ...Object.keys(STATUS)].map((k) => <button key={k} className={'btn' + (st === k ? ' p' : ' g')} onClick={() => setSt(k)}>{k === 'all' ? 'সব' : STATUS[k]} ({k === 'all' ? db.orders.length : db.orders.filter((o) => o.status === k).length})</button>)}
      </div>
      <input className="box" style={{ width: '100%', marginBottom: 10 }} placeholder="অর্ডার নম্বর / নাম / ফোন দিয়ে খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="box scroll">
        <table className="tbl">
          <thead><tr><th>অর্ডার</th><th>সময়</th><th>কাস্টমার</th><th>মোট</th><th>পেমেন্ট</th><th>স্ট্যাটাস</th></tr></thead>
          <tbody>{list.map((o) => (
            <tr key={o.orderNo} style={{ cursor: 'pointer' }} onClick={() => setOpen(o.orderNo)}>
              <td><b>{o.orderNo}</b></td><td>{fmt(o.createdAt)}</td><td>{o.name}<br /><small>{o.phone}</small></td><td>{taka(o.total)}</td><td>{PAY[o.payment]}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <select value={o.status} onChange={(e) => run(() => api('order', { orderNo: o.orderNo, status: e.target.value }), 'স্ট্যাটাস আপডেট হয়েছে')}>
                  {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></td>
            </tr>))}</tbody>
        </table>
        {!list.length && <p style={{ textAlign: 'center', color: 'var(--mut)' }}>কোনো অর্ডার নেই</p>}
      </div>
      {cur && <OrderModal o={cur} close={() => setOpen(null)} run={run} isSuper={isSuper} />}
    </>
  );
}

function OrderModal({ o, close, run, isSuper }) {
  const [note, setNote] = useState(o.adminNote || '');
  return (
    <div className="modal" onClick={close}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>{o.orderNo}</h2><button className="btn g" onClick={close}>✕</button></div>
        <p style={{ margin: '8px 0' }}><span className={'pill ' + o.status}>{STATUS[o.status]}</span> · {fmt(o.createdAt)}</p>
        <div className="sum" style={{ fontSize: 14, marginBottom: 10 }}>
          <div><span>নাম</span><b>{o.name}</b></div>
          <div><span>ফোন</span><b><a href={'tel:' + o.phone}>{o.phone}</a> · <a href={'https://wa.me/88' + o.phone} target="_blank" rel="noreferrer">WhatsApp</a></b></div>
          <div><span>ঠিকানা</span><b style={{ textAlign: 'right', maxWidth: '70%' }}>{o.address}</b></div>
          <div><span>এলাকা</span><b>{o.zone === 'dhaka' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'}</b></div>
          <div><span>পেমেন্ট</span><b>{PAY[o.payment]}{o.trxId ? ' · ' + o.trxId : ''}</b></div>
          {o.note && <div><span>কাস্টমার নোট</span><b>{o.note}</b></div>}
        </div>
        <table className="tbl"><tbody>{o.items.map((i, k) => <tr key={k}><td>{i.name}{i.size ? <b> · {i.size}</b> : null}</td><td>× {i.qty}</td><td>{taka(i.price * i.qty)}</td></tr>)}</tbody></table>
        <div className="sum" style={{ margin: '10px 0' }}><div><span>সাবটোটাল</span><span>{taka(o.subtotal)}</span></div><div><span>ডেলিভারি</span><span>{taka(o.shipping)}</span></div><div className="t"><span>মোট (COD হলে কালেক্ট করুন)</span><span>{taka(o.total)}</span></div></div>
        <div className="f"><label>অ্যাডমিন নোট (কুরিয়ার ID ইত্যাদি)<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn p" onClick={() => run(() => api('order', { orderNo: o.orderNo, adminNote: note }), 'নোট সেভ হয়েছে')}>নোট সেভ</button>
          <button className="btn" onClick={() => window.print()}>🖨️ প্রিন্ট</button>
          {isSuper && <button className="btn d" onClick={() => { if (confirm('অর্ডারটি মুছে ফেলবেন?')) run(() => api('order-delete', { orderNo: o.orderNo }), 'মুছে ফেলা হয়েছে').then(close); }}>মুছুন</button>}
        </div>
      </div>
    </div>
  );
}

function Products({ db, run }) {
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const list = db.products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>প্রডাক্ট ({db.products.length})</h1>
        <button className="btn p big" onClick={() => setEdit({ name: '', category: db.categories[0]?.slug || '', price: 0, oldPrice: 0, stock: 10, image: '', images: [], sizes: ['M', 'L', 'XL', 'XXL'], nameBn: '', descBn: '', desc: '', tags: [], brand: 'Nivaro', flags: { featured: true, newArrival: true } })}>+ নতুন প্রডাক্ট</button>
      </div>
      <input className="box" style={{ width: '100%', margin: '12px 0' }} placeholder="প্রডাক্ট খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="box scroll">
        <table className="tbl">
          <thead><tr><th /><th>নাম</th><th>ক্যাটাগরি</th><th>দাম</th><th>স্টক</th><th /></tr></thead>
          <tbody>{list.map((p) => (
            <tr key={p.id}>
              <td style={{ width: 48 }}>{p.image ? <img src={p.image} alt="" width={40} height={40} style={{ objectFit: 'cover', borderRadius: 6 }} /> : '🛍️'}</td>
              <td>{p.name}<br /><small style={{ color: 'var(--mut)' }}>{p.brand}</small></td>
              <td>{db.categories.find((c) => c.slug === p.category)?.name || '—'}</td>
              <td>{taka(p.price)}{p.oldPrice > p.price && <><br /><s style={{ color: 'var(--mut)' }}>{taka(p.oldPrice)}</s></>}</td>
              <td style={{ color: p.stock <= 0 ? 'var(--bad)' : undefined }}><b>{p.stock}</b></td>
              <td style={{ whiteSpace: 'nowrap' }}><button className="btn" onClick={() => setEdit({ ...p, tags: p.tags || [] })}>এডিট</button> <button className="btn d" onClick={() => { if (confirm('প্রডাক্টটি মুছবেন?')) run(() => api('product-delete', { id: p.id }), 'মুছে ফেলা হয়েছে'); }}>🗑</button></td>
            </tr>))}</tbody>
        </table>
      </div>
      {edit && <ProductForm init={edit} cats={db.categories} close={() => setEdit(null)} run={run} />}
    </>
  );
}

function ProductForm({ init, cats, close, run }) {
  const [f, setF] = useState({ ...init, tags: Array.isArray(init.tags) ? init.tags.join(', ') : init.tags, sizes: Array.isArray(init.sizes) ? init.sizes.join(', ') : init.sizes || '', images: init.images || [], flags: init.flags || {} });
  const [up, setUp] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const onMain = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUp(true);
    try { const u = await upload(file); setF((s) => ({ ...s, image: u })); } catch (x) { alert(x.message); }
    setUp(false); e.target.value = '';
  };
  const onMore = async (e) => {
    const files = [...(e.target.files || [])]; if (!files.length) return;
    setUp(true);
    try { for (const file of files) { const u = await upload(file); setF((s) => ({ ...s, images: [...s.images, u].slice(0, 8) })); } } catch (x) { alert(x.message); }
    setUp(false); e.target.value = '';
  };
  return (
    <div className="modal" onClick={close}>
      <form className="box f" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); run(() => api('product', f), 'প্রডাক্ট সেভ হয়েছে').then(close); }}>
        <h2 style={{ margin: 0 }}>{f.id ? 'প্রডাক্ট এডিট' : 'নতুন প্রডাক্ট'}</h2>
        <div className="two">
          <label>নাম (English) *<input value={f.name} onChange={set('name')} required /></label>
          <label>নাম (বাংলা)<input value={f.nameBn || ''} onChange={set('nameBn')} /></label>
        </div>
        <div className="two">
          <label>ব্র্যান্ড<input value={f.brand} onChange={set('brand')} /></label>
          <label>ক্যাটাগরি<select value={f.category} onChange={set('category')}>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}{c.nameBn ? ' / ' + c.nameBn : ''}</option>)}</select></label>
        </div>
        <div className="two">
          <label>দাম (৳) *<input type="number" min="0" value={f.price} onChange={set('price')} required /></label>
          <label>আগের দাম (ডিসকাউন্টের জন্য)<input type="number" min="0" value={f.oldPrice} onChange={set('oldPrice')} /></label>
        </div>
        <div className="two">
          <label>স্টক<input type="number" min="0" value={f.stock} onChange={set('stock')} /></label>
          <label>সাইজ (কমা দিয়ে, যেমন M, L, XL, XXL)<input value={f.sizes} onChange={set('sizes')} placeholder="M, L, XL, XXL" /></label>
        </div>
        <label>মূল ছবি (আপলোড বা URL)
          <input value={f.image} onChange={set('image')} placeholder="https://…" />
          <input type="file" accept="image/*" onChange={onMain} />{up && <small>আপলোড হচ্ছে…</small>}
          {f.image && <img src={f.image} alt="" style={{ width: 90, height: 112, objectFit: 'cover', borderRadius: 8 }} />}
        </label>
        <label>আরও ছবি (গ্যালারি, সর্বোচ্চ ৮টি — প্রথমটি হোভারে দেখাবে)
          <input type="file" accept="image/*" multiple onChange={onMore} />
          {f.images.length > 0 && <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{f.images.map((u, k) => <span key={k} style={{ position: 'relative' }}><img src={u} alt="" style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 8 }} /><button type="button" onClick={() => setF((s) => ({ ...s, images: s.images.filter((_, j) => j !== k) }))} style={{ position: 'absolute', top: -6, right: -6, border: 0, borderRadius: '50%', width: 20, height: 20, background: '#c81e1e', color: '#fff', cursor: 'pointer' }}>×</button></span>)}</span>}
        </label>
        <label>বিবরণ (English)<textarea rows={3} value={f.desc} onChange={set('desc')} /></label>
        <label>বিবরণ (বাংলা)<textarea rows={3} value={f.descBn || ''} onChange={set('descBn')} /></label>
        <label>ট্যাগ / সার্চ কীওয়ার্ড (কমা দিয়ে, বাংলা-ইংরেজি দুটোই)<input value={f.tags} onChange={set('tags')} placeholder="navy panjabi, নেভি পাঞ্জাবি, cotton" /></label>
        {f.id && <label>URL slug<input value={f.slug || ''} onChange={set('slug')} /></label>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(FLAGS).map(([k, l]) => <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 500 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!f.flags[k]} onChange={(e) => setF((s) => ({ ...s, flags: { ...s.flags, [k]: e.target.checked } }))} />{l}</label>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn p big" disabled={up}>সেভ করুন</button><button type="button" className="btn g big" onClick={close}>বাতিল</button></div>
      </form>
    </div>
  );
}

function Cats({ db, run }) {
  const [edit, setEdit] = useState(null);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>ক্যাটাগরি</h1>
        <button className="btn p big" onClick={() => setEdit({ name: '', nameBn: '', image: '' })}>+ নতুন ক্যাটাগরি</button>
      </div>
      <p style={{ color: 'var(--mut)' }}>হোমপেজে ক্যাটাগরি ছবিসহ টাইলে দেখায়। ছবি (পোর্ট্রেট ৩:৪, যেমন ৮০০×১০৬৭) দিলে অনেক সুন্দর দেখায়। ↑↓ দিয়ে ক্রম বদলান।</p>
      <div className="box scroll"><table className="tbl"><tbody>{db.categories.map((c, i) => (
        <tr key={c.slug}>
          <td style={{ width: 60 }}>{c.image ? <img src={c.image} alt="" width={48} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} /> : <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 64, borderRadius: 8, background: 'var(--navy)', color: '#fff' }}>🗂</span>}</td>
          <td><b>{c.name}</b>{c.nameBn ? ' · ' + c.nameBn : ''}<br /><small style={{ color: 'var(--mut)' }}>/{c.slug}</small></td>
          <td>{db.products.filter((p) => p.category === c.slug).length} প্রডাক্ট</td>
          <td style={{ whiteSpace: 'nowrap' }}>
            <button className="btn g" disabled={i === 0} onClick={() => run(() => api('category-move', { slug: c.slug, dir: -1 }))}>↑</button>{' '}
            <button className="btn g" disabled={i === db.categories.length - 1} onClick={() => run(() => api('category-move', { slug: c.slug, dir: 1 }))}>↓</button>{' '}
            <button className="btn" onClick={() => setEdit({ ...c, oldSlug: c.slug })}>এডিট</button>{' '}
            <button className="btn d" onClick={() => { if (confirm('ক্যাটাগরি মুছবেন? (প্রডাক্ট মুছবে না)')) run(() => api('category-delete', { slug: c.slug }), 'মুছে ফেলা হয়েছে'); }}>🗑</button></td></tr>))}</tbody></table></div>
      {edit && <CatForm init={edit} close={() => setEdit(null)} run={run} />}
    </>
  );
}

function CatForm({ init, close, run }) {
  const [f, setF] = useState(init);
  const [up, setUp] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const onImg = async (e) => { const file = e.target.files?.[0]; if (!file) return; setUp(true); try { const u = await upload(file); setF((s) => ({ ...s, image: u })); } catch (x) { alert(x.message); } setUp(false); e.target.value = ''; };
  return (
    <div className="modal" onClick={close}>
      <form className="box f" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); run(() => api('category', f), 'ক্যাটাগরি সেভ হয়েছে').then(close); }}>
        <h2 style={{ margin: 0 }}>{f.oldSlug ? 'ক্যাটাগরি এডিট' : 'নতুন ক্যাটাগরি'}</h2>
        <label>নাম (English) *<input value={f.name} onChange={set('name')} required /></label>
        <label>নাম (বাংলা)<input value={f.nameBn || ''} onChange={set('nameBn')} /></label>
        <label>ক্যাটাগরি ছবি
          <input type="file" accept="image/*" onChange={onImg} />{up && <small>আপলোড হচ্ছে…</small>}
          {f.image && <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><img src={f.image} alt="" style={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 10 }} /><button type="button" className="btn d" onClick={() => setF((s) => ({ ...s, image: '' }))}>সরান</button></span>}
        </label>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn p big" disabled={up}>সেভ করুন</button><button type="button" className="btn g big" onClick={close}>বাতিল</button></div>
      </form>
    </div>
  );
}

function Settings({ db, run, isSuper }) {
  const base = db.settings;
  const [s, setS] = useState({ bkashNumber: '', nagadNumber: '', freeShipOver: 0, logo: '', announce: '', announceBn: '', brandColor: '#050724', ...base, social: { facebook: '', youtube: '', tiktok: '', instagram: '', ...(base.social || {}) }, tracking: { gtmId: '', gtmDomain: '', ga4Id: '', fbPixelId: '', tiktokPixelId: '', ...(base.tracking || {}) }, heroSlides: base.heroSlides || [] });
  const [sub, setSub] = useState('brand');
  const [busy, setBusy] = useState('');
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }));
  const setIn = (g, k) => (e) => setS((x) => ({ ...x, [g]: { ...x[g], [k]: e.target.value } }));
  const slide = (i, k) => (e) => setS((x) => ({ ...x, heroSlides: x.heroSlides.map((h, j) => (j === i ? { ...h, [k]: e.target.value } : h)) }));
  const up = async (e, apply, key) => { const f = e.target.files?.[0]; if (!f) return; setBusy(key); try { apply(await upload(f)); } catch (x) { alert(x.message); } setBusy(''); e.target.value = ''; };
  const move = (i, d) => setS((x) => { const a = [...x.heroSlides]; const j = i + d; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, heroSlides: a }; });
  const tabs = [['brand', '🎨 ব্র্যান্ড'], ['contact', '📞 যোগাযোগ'], ['ship', '🚚 ডেলিভারি ও পেমেন্ট'], ['slides', '🖼️ হোম স্লাইডার'], isSuper && ['social', '🔗 সোশ্যাল লিংক'], isSuper && ['track', '📈 ট্র্যাকিং ও ডাটা লেয়ার']].filter(Boolean);
  const ImgUp = ({ label, value, onUrl, k, h = 72 }) => (
    <label>{label}
      <input type="file" accept="image/*" onChange={(e) => up(e, onUrl, k)} />{busy === k && <small>আপলোড হচ্ছে…</small>}
      {value && <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><img src={value} alt="" style={{ height: h, maxWidth: 220, objectFit: 'cover', background: '#050724', padding: 4, borderRadius: 8 }} /><button type="button" className="btn d" onClick={() => onUrl('')}>সরান</button></span>}
    </label>
  );
  return (
    <form className="f" style={{ maxWidth: 820 }} onSubmit={(e) => { e.preventDefault(); run(() => api('settings', s), 'সেটিংস সেভ হয়েছে'); }}>
      <h1 style={{ margin: 0 }}>সেটিংস</h1>
      <div className="tabs2">{tabs.map(([k, l]) => <button type="button" key={k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)}>{l}</button>)}</div>

      {sub === 'brand' && <div className="box f">
        <b>ব্র্যান্ডিং</b>
        <div className="two"><label>স্টোরের নাম<input value={s.storeName} onChange={set('storeName')} /></label><label>ট্যাগলাইন<input value={s.tagline || ''} onChange={set('tagline')} /></label></div>
        <ImgUp label="কাস্টম লোগো ছবি (ঐচ্ছিক — না দিলে Nivaro-র ডিফল্ট লোগো দেখাবে; সাদা/ট্রান্সপারেন্ট PNG ভালো)" value={s.logo} onUrl={(u) => setS((x) => ({ ...x, logo: u }))} k="logo" h={48} />
        <label>মূল ব্র্যান্ড কালার (বাটন, দাম, হাইলাইট)<span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><input type="color" value={s.brandColor} onChange={set('brandColor')} style={{ width: 60, height: 40, padding: 2 }} /><code>{s.brandColor}</code><button type="button" className="btn g" onClick={() => setS((x) => ({ ...x, brandColor: '#050724' }))}>লোগোর নেভি (ডিফল্ট)</button></span></label>
        <label>টপ বারের ঘোষণা (English)<input value={s.announce} onChange={set('announce')} /></label>
        <label>টপ বারের ঘোষণা (বাংলা)<input value={s.announceBn || ''} onChange={set('announceBn')} /></label>
      </div>}

      {sub === 'contact' && <div className="box f">
        <b>যোগাযোগ (ওয়েবসাইটের হেডার, ফুটার ও WhatsApp বাটনে দেখায়)</b>
        <div className="two"><label>ফোন<input value={s.phone} onChange={set('phone')} /></label><label>হটলাইন (ঐচ্ছিক)<input value={s.hotline || ''} onChange={set('hotline')} /></label></div>
        <div className="two"><label>WhatsApp নম্বর (দেশ কোডসহ, যেমন 8801XXXXXXXXX)<input value={s.whatsapp} onChange={set('whatsapp')} /></label><label>ইমেইল<input value={s.email || ''} onChange={set('email')} /></label></div>
        <label>ওয়েবসাইট<input value={s.website || ''} onChange={set('website')} placeholder="nivaro.bd" /></label>
        <label>ঠিকানা (English)<input value={s.address} onChange={set('address')} /></label>
        <label>ঠিকানা (বাংলা)<input value={s.addressBn || ''} onChange={set('addressBn')} /></label>
      </div>}

      {sub === 'ship' && <div className="box f">
        <b>ডেলিভারি ও পেমেন্ট</b>
        <div className="two"><label>ঢাকার ভেতরে চার্জ (৳)<input type="number" value={s.shipDhaka} onChange={set('shipDhaka')} /></label><label>ঢাকার বাইরে চার্জ (৳)<input type="number" value={s.shipOutside} onChange={set('shipOutside')} /></label></div>
        <label>এর বেশি কিনলে ফ্রি ডেলিভারি (৳, ০ = বন্ধ)<input type="number" value={s.freeShipOver} onChange={set('freeShipOver')} /></label>
        <div className="two"><label>bKash নম্বর (খালি রাখলে অপশন লুকানো থাকবে)<input value={s.bkashNumber} onChange={set('bkashNumber')} /></label><label>Nagad নম্বর<input value={s.nagadNumber} onChange={set('nagadNumber')} /></label></div>
      </div>}

      {sub === 'slides' && <div className="box f">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>হোমপেজ স্লাইডার ({s.heroSlides.length}/8)</b>
          <button type="button" className="btn p" disabled={s.heroSlides.length >= 8} onClick={() => setS((x) => ({ ...x, heroSlides: [...x.heroSlides, { badge: 'NEW', badgeBn: 'নতুন', title: 'New Offer', titleBn: 'নতুন অফার', sub: '', subBn: '', cta: 'Shop Now', ctaBn: 'কিনুন', link: '/products', image: '', imageMobile: '' }] }))}>+ স্লাইড যোগ</button></div>
        <small style={{ color: 'var(--mut)' }}>ডেস্কটপ ছবি: ১৬০০×৬০০ (ল্যান্ডস্কেপ)। মোবাইল ছবি: ৮০০×১০০০ (পোর্ট্রেট) — না দিলে ডেস্কটপ ছবিই কাটা হয়ে দেখাবে। ছবি না দিলে নেভি-লোগো ডিজাইন দেখাবে। টেক্সট ছবির বাম/নিচের দিকে বসে, তাই মডেল ডানদিকে রাখলে ভালো।</small>
        {s.heroSlides.map((h, i) => (
          <div key={i} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>স্লাইড {i + 1}</b>
              <span style={{ display: 'flex', gap: 6 }}><button type="button" className="btn g" onClick={() => move(i, -1)}>↑</button><button type="button" className="btn g" onClick={() => move(i, 1)}>↓</button><button type="button" className="btn d" onClick={() => setS((x) => ({ ...x, heroSlides: x.heroSlides.filter((_, j) => j !== i) }))}>🗑</button></span></div>
            <div className="two"><label>ব্যাজ (English)<input value={h.badge || ''} onChange={slide(i, 'badge')} /></label><label>ব্যাজ (বাংলা)<input value={h.badgeBn || ''} onChange={slide(i, 'badgeBn')} /></label></div>
            <div className="two"><label>টাইটেল (English)<input value={h.title || ''} onChange={slide(i, 'title')} /></label><label>টাইটেল (বাংলা)<input value={h.titleBn || ''} onChange={slide(i, 'titleBn')} /></label></div>
            <div className="two"><label>সাবটাইটেল (English)<input value={h.sub || ''} onChange={slide(i, 'sub')} /></label><label>সাবটাইটেল (বাংলা)<input value={h.subBn || ''} onChange={slide(i, 'subBn')} /></label></div>
            <div className="two"><label>বাটন (English)<input value={h.cta || ''} onChange={slide(i, 'cta')} /></label><label>বাটন (বাংলা)<input value={h.ctaBn || ''} onChange={slide(i, 'ctaBn')} /></label></div>
            <label>লিংক (যেমন /products?category=exclusive)<input value={h.link || ''} onChange={slide(i, 'link')} /></label>
            <div className="two">
              <ImgUp label="ডেস্কটপ ব্যানার ছবি" value={h.image} onUrl={(u) => setS((x) => ({ ...x, heroSlides: x.heroSlides.map((hh, j) => (j === i ? { ...hh, image: u } : hh)) }))} k={'sd' + i} h={64} />
              <ImgUp label="মোবাইল ব্যানার ছবি (ঐচ্ছিক)" value={h.imageMobile} onUrl={(u) => setS((x) => ({ ...x, heroSlides: x.heroSlides.map((hh, j) => (j === i ? { ...hh, imageMobile: u } : hh)) }))} k={'sm' + i} h={64} />
            </div>
          </div>))}
      </div>}

      {sub === 'social' && isSuper && <div className="box f">
        <b>সোশ্যাল মিডিয়া লিংক</b>
        <small style={{ color: 'var(--mut)' }}>এখানে লিংক বসালে ওয়েবসাইটের ফুটারে আইকন দেখাবে। খালি রাখলে ওই আইকন লুকানো থাকবে।</small>
        <label>Facebook পেজ লিংক<input value={s.social.facebook} onChange={setIn('social', 'facebook')} placeholder="https://facebook.com/…" /></label>
        <label>YouTube চ্যানেল লিংক<input value={s.social.youtube} onChange={setIn('social', 'youtube')} placeholder="https://youtube.com/@…" /></label>
        <label>TikTok লিংক<input value={s.social.tiktok} onChange={setIn('social', 'tiktok')} placeholder="https://tiktok.com/@…" /></label>
        <label>Instagram লিংক (ঐচ্ছিক)<input value={s.social.instagram} onChange={setIn('social', 'instagram')} placeholder="https://instagram.com/…" /></label>
      </div>}

      {sub === 'track' && isSuper && <div className="box f">
        <b>ট্র্যাকিং ও ডাটা লেয়ার</b>
        <div className="okb" style={{ fontSize: 13.5 }}>ওয়েবসাইট সবসময় <code>window.dataLayer</code>-এ GA4 ই-কমার্স ইভেন্ট পাঠায়: <code>view_item</code>, <code>add_to_cart</code>, <code>begin_checkout</code>, <code>purchase</code>, <code>search</code> (প্রতিটিতে <code>event_id</code> থাকে — Meta CAPI/সার্ভার-সাইডে ডিডুপের জন্য)। নিচে ID দিলে সংশ্লিষ্ট ট্যাগ চালু হবে।</div>
        <label>Google Tag Manager ID (GTM-XXXXXXX)<input value={s.tracking.gtmId} onChange={setIn('tracking', 'gtmId')} placeholder="GTM-XXXXXXX" /></label>
        <label>GTM কাস্টম ডোমেইন (সার্ভার-সাইড ট্র্যাকিং হলে, ঐচ্ছিক — যেমন sst.nivaro.bd)<input value={s.tracking.gtmDomain} onChange={setIn('tracking', 'gtmDomain')} placeholder="www.googletagmanager.com" /></label>
        <small style={{ color: 'var(--mut)' }}>GTM দিলে অন্য ট্যাগ (GA4/Meta/TikTok) GTM-এর ভেতর থেকে চালাতে হবে — নিচের সরাসরি ID গুলো তখন ব্যবহার হবে না (ডুপ্লিকেট ইভেন্ট এড়াতে)।</small>
        <label>GA4 Measurement ID (G-XXXXXXXXXX) — GTM ছাড়া সরাসরি<input value={s.tracking.ga4Id} onChange={setIn('tracking', 'ga4Id')} /></label>
        <label>Meta (Facebook) Pixel ID — GTM ছাড়া সরাসরি<input value={s.tracking.fbPixelId} onChange={setIn('tracking', 'fbPixelId')} inputMode="numeric" /></label>
        <label>TikTok Pixel ID — GTM ছাড়া সরাসরি<input value={s.tracking.tiktokPixelId} onChange={setIn('tracking', 'tiktokPixelId')} /></label>
      </div>}

      <button className="btn p big">সেটিংস সেভ করুন</button>
    </form>
  );
}

const PERM_L = { dash: 'ড্যাশবোর্ড', orders: 'অর্ডার', products: 'প্রডাক্ট', cats: 'ক্যাটাগরি', settings: 'সেটিংস' };

function Staff({ db, run }) {
  const [edit, setEdit] = useState(null);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>স্টাফ ও পারমিশন</h1>
        <button className="btn p big" onClick={() => setEdit({ isNew: true, name: '', username: '', password: '', active: true, perms: { dash: true, orders: true } })}>+ নতুন স্টাফ</button>
      </div>
      <p style={{ color: 'var(--mut)' }}>আপনি সুপার অ্যাডমিন — সব কিছুতে আপনার পূর্ণ নিয়ন্ত্রণ। স্টাফকে শুধু সেটুকু অনুমতি দিন যা তার কাজে লাগবে। অর্ডার ডিলিট, স্টাফ ম্যানেজ ও লগ শুধু আপনিই দেখতে পারবেন।</p>
      <div className="box scroll">
        <table className="tbl">
          <thead><tr><th>নাম</th><th>ইউজারনেম</th><th>অনুমতি</th><th>স্ট্যাটাস</th><th /></tr></thead>
          <tbody>
            {db.staff.map((st) => (
              <tr key={st.username}>
                <td><b>{st.name}</b></td><td>{st.username}</td>
                <td>{Object.keys(PERM_L).filter((k) => st.perms?.[k]).map((k) => PERM_L[k]).join(', ') || '—'}</td>
                <td><span className={'pill ' + (st.active === false ? 'cancelled' : 'delivered')}>{st.active === false ? 'বন্ধ' : 'চালু'}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}><button className="btn" onClick={() => setEdit({ ...st, password: '' })}>এডিট</button> <button className="btn d" onClick={() => { if (confirm(st.name + ' কে মুছবেন?')) run(() => api('staff-delete', { username: st.username }), 'স্টাফ মুছে ফেলা হয়েছে'); }}>🗑</button></td>
              </tr>))}
          </tbody>
        </table>
        {!db.staff.length && <p style={{ textAlign: 'center', color: 'var(--mut)' }}>কোনো স্টাফ নেই। শুধু আপনিই অ্যাডমিন।</p>}
      </div>
      <div className="box" style={{ marginTop: 14 }}>
        <b>💾 ব্যাকআপ</b>
        <p style={{ color: 'var(--mut)', margin: '6px 0 10px' }}>প্রডাক্ট, ক্যাটাগরি, অর্ডার ও সেটিংসের পুরো কপি ডাউনলোড করে নিরাপদ জায়গায় রাখুন।</p>
        <button className="btn" onClick={() => download('nivaro-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ settings: db.settings, categories: db.categories, products: db.products, orders: db.orders }, null, 1), 'application/json')}>⬇️ ব্যাকআপ ডাউনলোড</button>
      </div>
      {edit && <StaffForm init={edit} close={() => setEdit(null)} run={run} />}
    </>
  );
}

function StaffForm({ init, close, run }) {
  const [f, setF] = useState(init);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <div className="modal" onClick={close}>
      <form className="box f" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); run(() => api('staff-save', f), 'স্টাফ সেভ হয়েছে').then(close); }}>
        <h2 style={{ margin: 0 }}>{f.isNew ? 'নতুন স্টাফ' : 'স্টাফ এডিট'}</h2>
        <label>নাম *<input value={f.name} onChange={set('name')} required /></label>
        <label>ইউজারনেম * (ইংরেজি ছোট হাতের, ৩+ অক্ষর)<input value={f.username} onChange={set('username')} disabled={!f.isNew} required /></label>
        <label>{f.isNew ? 'পাসওয়ার্ড * (৬+ অক্ষর)' : 'নতুন পাসওয়ার্ড (বদলাতে চাইলে লিখুন)'}<input type="text" value={f.password} onChange={set('password')} required={f.isNew} autoComplete="off" /></label>
        <div><b style={{ fontSize: 13 }}>কী কী করতে পারবে</b>
          <div className="chips" style={{ marginTop: 6 }}>{Object.entries(PERM_L).map(([k, l]) => <label key={k}><input type="checkbox" checked={!!f.perms?.[k]} onChange={(e) => setF((s) => ({ ...s, perms: { ...s.perms, [k]: e.target.checked } }))} />{l}</label>)}</div></div>
        <div className="chips"><label><input type="checkbox" checked={f.active !== false} onChange={(e) => setF((s) => ({ ...s, active: e.target.checked }))} />অ্যাকাউন্ট চালু</label></div>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn p big">সেভ করুন</button><button type="button" className="btn g big" onClick={close}>বাতিল</button></div>
      </form>
    </div>
  );
}

function Log({ db }) {
  return (
    <>
      <h1 style={{ marginTop: 0 }}>অ্যাক্টিভিটি লগ</h1>
      <p style={{ color: 'var(--mut)' }}>কে কখন কী পরিবর্তন করেছে (সর্বশেষ ২০০টি)।</p>
      <div className="box scroll"><table className="tbl"><thead><tr><th>সময়</th><th>কে</th><th>কাজ</th><th>বিস্তারিত</th></tr></thead>
        <tbody>{db.log.map((l, i) => <tr key={i}><td style={{ whiteSpace: 'nowrap' }}>{fmt(l.t)}</td><td>{l.u}</td><td>{l.a}</td><td>{l.d}</td></tr>)}</tbody></table>
        {!db.log.length && <p style={{ textAlign: 'center', color: 'var(--mut)' }}>এখনও কোনো লগ নেই।</p>}</div>
    </>
  );
}
