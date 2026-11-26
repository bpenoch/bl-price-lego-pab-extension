// 讀取已同步的 PAB 資料，並依 BrickLink 零件編號查出 lego.com 上所有顏色。
const blpabApi = globalThis.browser || globalThis.chrome;
const BLPAB_SITES = ['US', 'NL'];
const BLPAB_BUILTIN_ALIASES = {
  // BrickLink 編號 → LEGO Design ID（常見不同的例子；其他可在彈出視窗自行加）
  '4073': ['6141'], '3794b': ['15573'], '3794a': ['3794'],
};

const BLPAB = {
  settings: null, data: {}, state: {}, maps: null,

  async load() {
    const keys = ['settings', 'syncState', ...BLPAB_SITES.map(s => 'pab_' + s)];
    const r = await blpabApi.storage.local.get(keys);
    this.settings = Object.assign({ sites: { US: true, NL: true }, ttlHours: 24, autoSync: true, colorOverrides: {}, aliases: {} }, r.settings || {});
    this.settings.sites = Object.assign({ US: true, NL: true }, this.settings.sites || {});
    this.state = r.syncState || {};
    this.data = {};
    for (const s of BLPAB_SITES) if (r['pab_' + s]) this.data[s] = r['pab_' + s];
    this.maps = blpabBuildColorMaps(this.settings.colorOverrides);
  },

  sites() { return BLPAB_SITES.filter(s => this.settings.sites[s]); },

  stale(site) {
    const d = this.data[site];
    return !d || Date.now() - d.ts > this.settings.ttlHours * 3600e3;
  },

  designCandidates(blNo) {
    const no = String(blNo).trim();
    const user = (this.settings.aliases || {})[no];
    const list = [].concat(user ? String(user).split(/[,\s]+/) : [], BLPAB_BUILTIN_ALIASES[no] || [], [no]);
    const stripped = no.replace(/[a-z]+$/i, '');
    if (stripped && stripped !== no) list.push(stripped);
    return [...new Set(list.filter(Boolean))];
  },

  // 回傳 { site: [element...] }，site 沒有資料時為 null
  lookup(blNo) {
    const out = {};
    const cands = this.designCandidates(blNo);
    for (const site of this.sites()) {
      const d = this.data[site];
      if (!d) { out[site] = null; continue; }
      const seen = new Set(), list = [];
      for (const dsg of cands) {
        const g = d.d[dsg];
        if (!g) continue;
        for (const [eid, ck, cents, av, ch, mq, nm] of g.e) {
          if (seen.has(eid)) continue; seen.add(eid);
          const col = d.colors[ck] || ['', ''];
          list.push({ eid, design: dsg, lego: ck, colorName: col[0], family: col[1], price: cents == null ? null : cents / 100,
            available: !!av, channel: ch, maxQty: mq, name: nm || g.n, bl: this.maps.legoToBl[ck] || null, currency: d.currency });
        }
      }
      out[site] = list;
    }
    return out;
  },

  money(v, currency) {
    if (v == null) return '—';
    const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : (currency || '') + ' ';
    return sym + v.toFixed(2);
  },
};
