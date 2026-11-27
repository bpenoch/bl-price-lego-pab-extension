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
    const keys = ['settings', 'syncState', 'blColors', 'blColorsStatus', 'blColorsLearned2', 'altNos', 'fx', ...BLPAB_SITES.map((s) => 'pab_' + s)];
    const r = await blpabApi.storage.local.get(keys);
    this.settings = Object.assign({ sites: { US: true, NL: true }, ttlHours: 24, autoSync: true, colorOverrides: {}, aliases: {}, lang: 'auto' }, r.settings || {});
    blpabSetLang(this.settings.lang);
    this.settings.sites = Object.assign({ US: true, NL: true }, this.settings.sites || {});
    this.state = r.syncState || {};
    this.blColors = r.blColors || null;
    this.blColorsStatus = r.blColorsStatus || null;
    this.learned = r.blColorsLearned2 || {};   // 從 BrickLink 零件頁顏色選單學到的 {編號: 名稱}
    this.altNos = r.altNos || {};
    this.fx = r.fx || null;   // BrickLink 零件頁上讀到的 Alternate Item No（記住給清單頁用）
    this.data = {};
    for (const s of BLPAB_SITES) if (r['pab_' + s]) this.data[s] = r['pab_' + s];
    this.maps = blpabBuildColorMaps(this.settings.colorOverrides);
    this.byName = {};
    if (this.blColors) for (const [id, name] of this.blColors.list) this.byName[blpabNorm(name)] = { id, name };
    for (const [id, name] of Object.entries(this.learned)) this.byName[blpabNorm(name)] = this.byName[blpabNorm(name)] || { id: Number(id), name };
  },

  sites() { return BLPAB_SITES.filter((s) => this.settings.sites[s]); },

  stale(site) {
    const d = this.data[site];
    return !d || Date.now() - d.ts > this.settings.ttlHours * 3600e3;
  },

  // BrickLink 顏色名稱（優先用從 BrickLink 讀到的顏色表）
  blColorName(id) {
    if (this.blColors) { const c = this.blColors.list.find((x) => x[0] === id); if (c) return c[1]; }
    const u = (this.settings.colorNames || {})[id]; if (u) return u;
    const t = Object.values(this.maps.legoToBl).find((b) => b.id === id);
    if (t && t.name) return t.name;
    return this.learned[id] || null;
  },

  // LEGO 顏色 → BrickLink 顏色：先查內建表／自訂，再用名稱比對 BrickLink 顏色表
  blFor(lego, legoName) {
    const t = this.maps.legoToBl[lego];
    if (t) return { id: t.id, name: this.blColorName(t.id) || t.name, guessed: false, tc: t.tc };
    const m = this.byName[blpabNorm(legoName)];
    if (m) return { id: m.id, name: m.name, guessed: true };
    return null;
  },

  // 依序嘗試的 LEGO Design ID 層級：
  //  1. 使用者自訂對照＋BrickLink 編號本身
  //  2. 已知對照：零件頁的 Alternate Item No、內建對照（藍色提示）
  //  3. 去掉字尾的推測，例如 3069a → 3069（黃色警告）
  // 前一層在任一站找得到就停，不再合併後面的（避免 3069 混進 Alternate 的印刷件）
  designTiers(blNo) {
    const no = String(blNo).trim();
    const user = (this.settings.aliases || {})[no];
    const userList = user ? String(user).split(/[,\s]+/).filter(Boolean) : [];
    const known = [].concat(BLPAB_BUILTIN_ALIASES[no] || [], this.altNos[no] || []).filter(Boolean);
    const stripped = no.replace(/[a-z]+$/i, '');
    return [
      { ids: [...new Set([...userList, no])], kind: userList.length ? 'known' : 'exact' },
      { ids: known, kind: 'known' },
      { ids: stripped && stripped !== no ? [stripped] : [], kind: 'guess' },
    ].filter((t) => t.ids.length);
  },
  designCandidates(blNo) { return [...new Set(this.designTiers(blNo).flatMap((t) => t.ids))]; },

  // 回傳 { site: [element...] }，site 沒有資料時為 null；via = 實際用到、和 BL 編號不同的 LEGO Design ID
  lookup(blNo) {
    const out = {};
    const sites = this.sites();
    for (const s of sites) out[s] = this.data[s] ? [] : null;
    out.via = []; out.viaGuess = false; out.no = String(blNo);
    for (const tier of this.designTiers(blNo)) {
      let found = false;
      for (const site of sites) {
        const d = this.data[site];
        if (!d) continue;
        const seen = new Set(out[site].map((e) => e.eid));
        for (const dsg of tier.ids) {
          const g = d.d[dsg];
          if (!g) continue;
          found = true;
          if (dsg !== String(blNo) && !out.via.includes(dsg)) out.via.push(dsg);
          for (const [eid, ck, cents, av, ch, mq, nm] of g.e) {
            if (seen.has(eid)) continue; seen.add(eid);
            const col = d.colors[ck] || ['', ''];
            out[site].push({ eid, site, design: dsg, lego: ck, colorName: col[0], family: col[1], price: cents == null ? null : cents / 100,
              available: !!av, channel: ch, maxQty: mq, name: nm || g.n, bl: this.blFor(ck, col[0]), currency: d.currency });
          }
        }
      }
      if (found) { out.viaGuess = tier.kind === 'guess'; break; }
    }
    return out;
  },

  // 顯示用的顏色名稱：優先用 BrickLink 名稱
  colourLabel(e) { return (e.bl && e.bl.name) || e.colorName; },

  // 荷蘭站歐元換美元（參考用；匯率來自歐洲央行，每天更新）
  toUsd(eur) { return this.fx && this.fx.rate ? eur * this.fx.rate : null; },

  // 記住 BrickLink 零件頁的 Alternate Item No（例如 3006 → 92538）
  async rememberAlternates(no, alts) {
    const cur = (this.altNos[no] || []).join(',');
    if (!alts.length || cur === alts.join(',')) return;
    const { altNos } = await blpabApi.storage.local.get('altNos');
    const m = Object.assign({}, altNos, { [no]: alts });
    this.altNos = Object.assign(this.altNos, m);
    await blpabApi.storage.local.set({ altNos: m });
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
    if (m < 1) return t('agoNow');
    if (m < 60) return t('agoMin', { n: m });
    const h = Math.round(m / 60);
    if (h < 48) return t('agoHour', { n: h });
    return t('agoDay', { n: Math.round(h / 24) });
  },
};
