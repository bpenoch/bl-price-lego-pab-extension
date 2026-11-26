// 讀取已同步的 PAB 資料，並依 BrickLink 零件編號查出 lego.com 上所有顏色。
const blpabApi = globalThis.browser || globalThis.chrome;
const BLPAB_SITES = ['US', 'NL'];
const BLPAB_SITE_PATH = { US: 'en-us', NL: 'nl-nl' };
const BLPAB_BUILTIN_ALIASES = {
  // BrickLink 編號 → LEGO Design ID（常見不同的例子；其他可在彈出視窗自行加）
  '4073': ['6141'], '3794b': ['15573'], '3794a': ['3794'],
};

const BLPAB = {
  settings: null, data: {}, state: {}, maps: null, blColors: null,

  async load() {
    const keys = ['settings', 'syncState', 'blColors', ...BLPAB_SITES.map((s) => 'pab_' + s)];
    const r = await blpabApi.storage.local.get(keys);
    this.settings = Object.assign({ sites: { US: true, NL: true }, ttlHours: 24, autoSync: true, colorOverrides: {}, aliases: {} }, r.settings || {});
    this.settings.sites = Object.assign({ US: true, NL: true }, this.settings.sites || {});
    this.state = r.syncState || {};
    this.blColors = r.blColors || null;
    this.data = {};
    for (const s of BLPAB_SITES) if (r['pab_' + s]) this.data[s] = r['pab_' + s];
    this.maps = blpabBuildColorMaps(this.settings.colorOverrides);
    this.byName = {};
    if (this.blColors) for (const [id, name] of this.blColors.list) this.byName[blpabNorm(name)] = { id, name };
  },

  sites() { return BLPAB_SITES.filter((s) => this.settings.sites[s]); },

  stale(site) {
    const d = this.data[site];
    return !d || Date.now() - d.ts > this.settings.ttlHours * 3600e3;
  },

  // BrickLink 顏色名稱（優先用從 BrickLink 讀到的顏色表）
  blColorName(id) {
    if (this.blColors) { const c = this.blColors.list.find((x) => x[0] === id); if (c) return c[1]; }
    const t = Object.values(this.maps.legoToBl).find((b) => b.id === id);
    return t ? t.name : null;
  },

  // LEGO 顏色 → BrickLink 顏色：先查內建表／自訂，再用名稱比對 BrickLink 顏色表
  blFor(lego, legoName) {
    const t = this.maps.legoToBl[lego];
    if (t) return { id: t.id, name: this.blColorName(t.id) || t.name, guessed: false };
    const m = this.byName[blpabNorm(legoName)];
    if (m) return { id: m.id, name: m.name, guessed: true };
    return null;
  },

  designCandidates(blNo) {
    const no = String(blNo).trim();
    const user = (this.settings.aliases || {})[no];
    const list = [].concat(user ? String(user).split(/[,\s]+/) : [], BLPAB_BUILTIN_ALIASES[no] || [], [no]);
    const stripped = no.replace(/[a-z]+$/i, '');
    if (stripped && stripped !== no) list.push(stripped);
    return [...new Set(list.filter(Boolean))];
  },

  // 回傳 { site: [element...] }，site 沒有資料時為 null；via = 實際對到的 LEGO Design ID 與 BL 編號不同時
  lookup(blNo) {
    const out = {};
    const cands = this.designCandidates(blNo);
    const via = new Set();
    for (const site of this.sites()) {
      const d = this.data[site];
      if (!d) { out[site] = null; continue; }
      const seen = new Set(), list = [];
      for (const dsg of cands) {
        const g = d.d[dsg];
        if (!g) continue;
        if (dsg !== String(blNo)) via.add(dsg);
        for (const [eid, ck, cents, av, ch, mq, nm] of g.e) {
          if (seen.has(eid)) continue; seen.add(eid);
          const col = d.colors[ck] || ['', ''];
          list.push({ eid, site, design: dsg, lego: ck, colorName: col[0], family: col[1], price: cents == null ? null : cents / 100,
            available: !!av, channel: ch, maxQty: mq, name: nm || g.n, bl: this.blFor(ck, col[0]), currency: d.currency });
        }
      }
      out[site] = list;
    }
    out.via = [...via];
    return out;
  },

  money(v, currency) {
    if (v == null) return '—';
    const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : (currency || '') + ' ';
    return sym + v.toFixed(2);
  },

  pabUrl(site, eid) {
    return `https://www.lego.com/${BLPAB_SITE_PATH[site]}/pick-and-build/pick-a-brick?query=${eid}`;
  },

  ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return '剛剛';
    if (m < 60) return m + ' 分鐘前';
    const h = Math.round(m / 60);
    if (h < 48) return h + ' 小時前';
    return Math.round(h / 24) + ' 天前';
  },
};
