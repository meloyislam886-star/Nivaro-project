// Smart product search: Bangla/English aliases, partial words, model codes (JY-1881 == jy1881), typo tolerance.
const ALIAS = {
  'পাঞ্জাবি': ['panjabi'], 'পাঞ্জাবী': ['panjabi'], 'পাঞ্জাবিতে': ['panjabi'], 'punjabi': ['panjabi'], 'panjabee': ['panjabi'], 'punjabee': ['panjabi'], 'kurta': ['panjabi'], 'কুর্তা': ['panjabi'],
  'ওয়েস্টকোট': ['waistcoat'], 'ওয়াস্কট': ['waistcoat'], 'কোট': ['waistcoat', 'coat'], 'জ্যাকেট': ['jacket'],
  'সাদা': ['white'], 'কালো': ['black'], 'নেভি': ['navy'], 'নীল': ['blue', 'navy'], 'সবুজ': ['green'], 'ক্রিম': ['cream'], 'আইভরি': ['ivory'], 'ধূসর': ['grey', 'charcoal'], 'চারকোল': ['charcoal'], 'লাল': ['red', 'maroon'],
  'কটন': ['cotton'], 'জ্যাকার্ড': ['jacquard'], 'এমব্রয়ডারি': ['embroidered', 'embroidery'], 'কম্বো': ['combo', 'combined'], 'কম্বাইন্ড': ['combined', 'combo'], 'সেট': ['set'],
  'ট্র্যাডিশনাল': ['traditional'], 'এক্সক্লুসিভ': ['exclusive'], 'রেগুলার': ['regular'], 'বিয়ে': ['wedding'], 'ঈদ': ['eid', 'festive'], 'উৎসব': ['festive'], 'জুম্মা': ['jummah'],
};

export function norm(s = '') {
  return String(s).toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
const compact = (s) => norm(s).replace(/\s/g, '');

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function expand(token) {
  const out = new Set([token]);
  for (const k of Object.keys(ALIAS)) if (token.includes(k)) ALIAS[k].forEach((x) => out.add(x));
  return [...out];
}

function tokenScore(variants, words, hayCompact) {
  let best = 0;
  for (const t of variants) {
    const tc = t.replace(/\s/g, '');
    for (const w of words) {
      if (w === t) best = Math.max(best, 10);
      else if (w.startsWith(t)) best = Math.max(best, 8);
      else if (t.length >= 3 && w.includes(t)) best = Math.max(best, 5);
      else if (t.length >= 4) {
        const max = t.length >= 7 ? 2 : 1;
        if (lev(t, w.slice(0, Math.max(t.length, 1) + 1), max) <= max || lev(t, w, max) <= max) best = Math.max(best, 3);
      }
    }
    if (tc.length >= 3 && hayCompact.includes(tc)) best = Math.max(best, 6);
  }
  return best;
}

export function searchProducts(products, categories, q, limit = 8) {
  const nq = norm(q);
  if (!nq) return [];
  const catName = Object.fromEntries(categories.map((c) => [c.slug, c.name + ' ' + (c.nameBn || '')]));
  const tokens = nq.split(' ').filter(Boolean);
  const scored = [];
  for (const p of products) {
    const nameW = norm(p.name + ' ' + (p.nameBn || '')).split(' ');
    const otherW = norm([p.brand, catName[p.category], ...(p.tags || [])].join(' ')).split(' ');
    const words = [...nameW, ...otherW];
    const hayC = compact(p.name + (p.nameBn || '') + p.brand + (p.tags || []).join(''));
    let total = 0, matched = 0;
    for (const tk of tokens) {
      const v = expand(tk);
      const nameScore = tokenScore(v, nameW, compact(p.name + (p.nameBn || '')));
      const allScore = tokenScore(v, words, hayC);
      const s = nameScore ? nameScore * 2 : allScore;
      if (s > 0) { matched++; total += s; }
    }
    if (matched === 0) continue;
    scored.push({ p, total, all: matched === tokens.length, inStock: p.stock > 0 });
  }
  let res = scored.filter((x) => x.all);
  if (!res.length) res = scored; // fall back to partial matches instead of "no results"
  res.sort((a, b) => b.total - a.total || Number(b.inStock) - Number(a.inStock));
  return res.slice(0, limit).map((x) => x.p);
}
