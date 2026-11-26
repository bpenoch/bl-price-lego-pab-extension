// 共用：用 LEGO 網站自己的 GraphQL 抓 Pick a Brick 全部零件，壓縮成擴充功能存的格式。
// background.js（直接連線）與 lego.js（在 lego.com 分頁裡）都用這支。
const BLPAB_LOCALES = { US: 'en-US', NL: 'nl-NL' };
const BLPAB_PER_PAGE = 400;
const BLPAB_QUERY = `query PickABrickQuery($input: ElementQueryInput!) { searchElements(input: $input) { results { id designId name deliveryChannel availability maxOrderQuantity price { centAmount currencyCode } facets { color { name key } colorFamily { name } } } total count } }`;

async function blpabFetchPage(url, locale, p, retries) {
  let last;
  for (let t = 0; t < retries; t++) {
    try {
      const r = await fetch(url, {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ operationName: 'PickABrickQuery', query: BLPAB_QUERY, variables: { input: {
          availability: ['AVAILABLE', 'OUT_OF_STOCK'], page: p, perPage: BLPAB_PER_PAGE, sort: { key: 'RELEVANCE', direction: 'DESC' } } } }),
      });
      const j = await r.json();
      if (j && j.data && j.data.searchElements) return j.data.searchElements;
      last = new Error('GraphQL 沒有回傳資料' + (j && j.errors ? '：' + j.errors.map((e) => e.message).join('; ') : '（HTTP ' + r.status + '）'));
    } catch (e) { last = e; }
    if (t < retries - 1) await new Promise((r) => setTimeout(r, 2000 * (t + 1)));
  }
  throw last;
}

// url：GraphQL 位址；firstPageRetries 設 1 可以讓「直接連線」失敗時很快改用分頁模式
async function blpabFetchSite(site, url, onProgress, firstPageRetries = 4) {
  const locale = BLPAB_LOCALES[site];
  const seen = {}; let total = 0;
  for (let p = 1; p <= 100; p++) {
    const s = await blpabFetchPage(url, locale, p, p === 1 ? firstPageRetries : 4);
    total = s.total;
    for (const e of s.results) seen[e.id] = e;
    if (onProgress) onProgress(Object.keys(seen).length, total);
    if (s.results.length < BLPAB_PER_PAGE || Object.keys(seen).length >= total) break;
  }
  const colors = {}, d = {}, currencies = new Set(); let available = 0, withMax = 0;
  const CH = { pab: 'P', bap: 'B' };
  for (const e of Object.values(seen)) {
    const f = e.facets || {}, c = f.color || {};
    if (c.key != null && !colors[c.key]) colors[c.key] = [c.name || '', (f.colorFamily && f.colorFamily.name) || ''];
    if (e.price) currencies.add(e.price.currencyCode);
    const av = e.availability === 'AVAILABLE'; if (av) available++;
    if (e.maxOrderQuantity) withMax++;
    const g = d[e.designId] || (d[e.designId] = { n: e.name, e: [] });
    const row = [Number(e.id), c.key != null ? Number(c.key) : null, e.price ? e.price.centAmount : null, av ? 1 : 0, CH[e.deliveryChannel] || '', e.maxOrderQuantity || null];
    if (e.name !== g.n) row.push(e.name);
    g.e.push(row);
  }
  const cur = [...currencies];
  return { site, ts: Date.now(), currency: cur.length === 1 ? cur[0] : cur.join('/'), total, count: Object.keys(seen).length, available, withMax, colors, d };
}
