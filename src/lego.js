// 在 lego.com Pick a Brick 頁面執行：只有當背景程式把這個分頁標記為「同步用分頁」時才會抓資料。
// 抓法沿用 PAB 網站自己的 GraphQL（/api/graphql/PickABrickQuery），只讀，不加入購物車、不登入。
(() => {
  const api = globalThis.browser || globalThis.chrome;
  const PER_PAGE = 400;
  const QUERY = `query PickABrickQuery($input: ElementQueryInput!) { searchElements(input: $input) { results { id designId name deliveryChannel availability maxOrderQuantity price { centAmount currencyCode } facets { color { name key } colorFamily { name } } } total count } }`;
  const LOCALES = { US: 'en-US', NL: 'nl-NL' };

  async function page(locale, p) {
    let last;
    for (let t = 0; t < 4; t++) {
      try {
        const r = await fetch('/api/graphql/PickABrickQuery', {
          method: 'POST', credentials: 'include',
          headers: { 'content-type': 'application/json', 'x-locale': locale },
          body: JSON.stringify({ operationName: 'PickABrickQuery', query: QUERY, variables: { input: {
            availability: ['AVAILABLE', 'OUT_OF_STOCK'], page: p, perPage: PER_PAGE, sort: { key: 'RELEVANCE', direction: 'DESC' } } } }),
        });
        const j = await r.json();
        if (j && j.data && j.data.searchElements) return j.data.searchElements;
        last = new Error('GraphQL 沒有回傳資料' + (j && j.errors ? '：' + j.errors.map(e => e.message).join('; ') : ''));
      } catch (e) { last = e; }
      await new Promise(r => setTimeout(r, 2000 * (t + 1)));
    }
    throw last;
  }

  async function sync(site) {
    const locale = LOCALES[site];
    const seen = {}; let total = 0;
    for (let p = 1; p <= 100; p++) {
      const s = await page(locale, p);
      total = s.total;
      for (const e of s.results) seen[e.id] = e;
      api.runtime.sendMessage({ type: 'syncProgress', site, done: Object.keys(seen).length, total }).catch(() => {});
      if (s.results.length < PER_PAGE || Object.keys(seen).length >= total) break;
    }
    const colors = {}, d = {}, currencies = new Set(); let available = 0;
    const CH = { pab: 'P', bap: 'B' };
    for (const e of Object.values(seen)) {
      const f = e.facets || {}, c = f.color || {};
      if (c.key != null && !colors[c.key]) colors[c.key] = [c.name || '', (f.colorFamily && f.colorFamily.name) || ''];
      if (e.price) currencies.add(e.price.currencyCode);
      const av = e.availability === 'AVAILABLE'; if (av) available++;
      const g = d[e.designId] || (d[e.designId] = { n: e.name, e: [] });
      const row = [Number(e.id), c.key != null ? Number(c.key) : null, e.price ? e.price.centAmount : null, av ? 1 : 0, CH[e.deliveryChannel] || '', e.maxOrderQuantity || null];
      if (e.name !== g.n) row.push(e.name);
      g.e.push(row);
    }
    const cur = [...currencies];
    return { site, ts: Date.now(), currency: cur.length === 1 ? cur[0] : cur.join('/'), total, count: Object.keys(seen).length, available, colors, d };
  }

  api.runtime.sendMessage({ type: 'legoReady' }).then(async (job) => {
    if (!job || !job.site) return;            // 一般瀏覽，不做任何事
    try {
      const data = await sync(job.site);
      await api.storage.local.set({ ['pab_' + job.site]: data });
      await api.runtime.sendMessage({ type: 'syncDone', site: job.site, count: data.count, available: data.available, currency: data.currency });
    } catch (e) {
      await api.runtime.sendMessage({ type: 'syncDone', site: job.site, error: String(e && e.message || e) });
    }
  }).catch(() => {});
})();
