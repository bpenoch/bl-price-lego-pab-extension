// BrickLink 頁面：
//  1. 零件頁（catalogitem.page?P=… / catalogItem.asp?P=…）→ 浮動面板：結論（PAB vs BrickLink）+ 每站一行摘要，可展開全部顏色
//  2. 分類清單、搜尋結果 → 零件編號旁的小標籤，點開看各顏色；清單上方可切換「只看 PAB 有賣」
(() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SITE = (s) => t('site_' + s);
  const C = () => (BLPAB_LANG === 'zh' ? '：' : ': ');
  const ls = { get(k) { try { return localStorage.getItem('blpab.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('blpab.' + k, v); } catch (e) {} } };
  const errText = (e) => e === 'tab_closed' ? t('errTabClosed') : e === 'timeout' ? t('errTimeout') : e;

  // ---------- 頁面判斷 ----------
  function itemPageInfo() {
    if (!/\/(v2\/catalog\/catalogitem\.page|catalogItem\.asp)$/i.test(location.pathname)) return null;
    const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#/, ''));
    const no = q.get('P');
    if (!no) return null;
    const c = h.get('C') || q.get('C') || q.get('idColor') || q.get('colorID');
    return { no, color: c && c !== '0' ? Number(c) : null };
  }

  // ---------- 小工具 ----------
  function chTag(e) {
    if (!e.available) return `<span class="blpab-tag blpab-oos">${t('outOfStock')}</span>`;
    if (e.channel === 'P') return `<span class="blpab-tag blpab-bs" title="${esc(t('tipBestseller'))}">Bestseller</span>`;
    if (e.channel === 'B') return `<span class="blpab-tag blpab-std" title="${esc(t('tipStandard'))}">Standard</span>`;
    return '';
  }
  const limCls = (q) => q >= 500 ? 'blpab-lim-hi' : q >= 50 ? 'blpab-lim-mid' : 'blpab-lim-lo';
  function limTag(e) {
    if (!e.available || !e.maxQty) return '';   // lego.com 沒回傳就不顯示
    return `<span class="blpab-tag ${limCls(e.maxQty)}" title="${esc(t('tipLimit', { n: e.maxQty }))}">${t('limit', { n: e.maxQty })}</span>`;
  }
  const names = (arr, n = 5) => { arr = [...new Set(arr)]; return esc(arr.slice(0, n).join(BLPAB_LANG === 'zh' ? '、' : ', ')) + (arr.length > n ? t('moreColours', { n: arr.length - n }) : ''); };
  const L = (e) => BLPAB.colourLabel(e);   // 顯示用顏色名：BrickLink 名稱優先
  const priceLink = (e) => `<a class="blpab-price" href="${BLPAB.pabUrl(e.site, e.eid)}" target="_blank" rel="noopener" title="${esc(t('openOnLego', { id: e.eid }))}">${esc(BLPAB.money(e.price, e.currency))}</a>`;
  function swatch(lego) {
    const hex = BLPAB.maps.hex[lego];
    return `<span class="blpab-sw" style="${hex ? 'background:' + hex : ''}"></span>`;
  }
  const blLabel = (bl, lego, name) => bl ? `BL ${bl.id}${bl.guessed ? t('guessed') : ''}`
    : `${esc(t('blNoMap', { lego }))} <a href="#" class="blpab-setmap" data-lego="${lego}" data-name="${esc(name)}">${t('setMap')}</a>`;

  // ---------- 每站一行摘要（依價格分組） ----------
  function siteSummary(site, list) {
    const cur = (BLPAB.data[site] || {}).currency || '';
    const head = `<b>${SITE(site)}</b> <small>${esc(cur)}</small>`;
    if (list === null) return `<div class="blpab-line">${head}${C()}${t('notSynced')}</div>`;
    if (!list.length) return `<div class="blpab-line">${head}${C()}${t('notOnPab')}</div>`;
    const av = list.filter((e) => e.available && e.price != null), oos = list.filter((e) => !e.available);
    if (!av.length) return `<div class="blpab-line">${head}${C()}<span class="blpab-bad">${t('allOos', { n: list.length })}</span></div>`;
    const byPrice = new Map();
    for (const e of av) (byPrice.get(e.price) || byPrice.set(e.price, []).get(e.price)).push(e);
    const groups = [...byPrice.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0]);
    const [bp, be] = groups[0];
    let txt;
    if (groups.length === 1) txt = `${t('allColours', { n: av.length })} <b>${esc(BLPAB.money(bp, cur))}</b>`;
    else if (groups.length > 3) {   // 價格種類太多：只寫大多數＋區間，細節看顏色表
      const ps = av.map((e) => e.price);
      txt = t('mostly', { p: esc(BLPAB.money(bp, cur)), n: be.length, k: groups.length - 1, lo: esc(BLPAB.money(Math.min(...ps), cur)), hi: esc(BLPAB.money(Math.max(...ps), cur)) });
    } else {
      txt = `<b>${esc(BLPAB.money(bp, cur))}</b> × ${t('colours', { n: be.length })}`;
      for (const [p, es] of groups.slice(1)) txt += `｜<b>${esc(BLPAB.money(p, cur))}</b>${C()}${names(es.map(L))}`;
    }
    const grp = (tag, ns) => ns.length > 3 ? `${tag} × ${t('colours', { n: ns.length })}` : `${tag} ${names(ns)}`;
    const sub = [];
    const std = av.filter((e) => e.channel === 'B');
    const bsTag = `<span class="blpab-tag blpab-bs" title="${esc(t('tipBestseller'))}">Bestseller</span>`, stdTag = `<span class="blpab-tag blpab-std" title="${esc(t('tipStandard'))}">Standard</span>`;
    if (!std.length) sub.push(`${bsTag} ${t('all')}`);
    else if (std.length === av.length) sub.push(`${stdTag} ${t('all')}`);
    else sub.push(grp(stdTag, std.map(L)));
    const lim = new Map();
    for (const e of av) if (e.maxQty) (lim.get(e.maxQty) || lim.set(e.maxQty, []).get(e.maxQty)).push(L(e));
    for (const [q, ns] of [...lim.entries()].sort((x, y) => y[0] - x[0])) {
      const tag = `<span class="blpab-tag ${limCls(q)}">${t('limit', { n: q })}</span>`;
      sub.push(lim.size === 1 && ns.length === av.length ? `${tag} ${t('all')}` : grp(tag, ns));
    }
    if (oos.length) sub.push(`<span class="blpab-bad">${t('outOfStock')}</span> ${names(oos.map(L), 3)}`);
    return `<div class="blpab-line">${head}${C()}${txt}<div class="blpab-sub">${sub.join('<span class="blpab-dot">·</span>')}</div></div>`;
  }

  // ---------- 全部顏色表（各站價格疊在同一欄，窄面板也不用橫向捲動） ----------
  function buildRows(res) {
    const rows = {};
    for (const site of BLPAB.sites()) for (const e of res[site] || []) {
      const r = rows[e.lego] || (rows[e.lego] = { lego: e.lego, colorName: e.colorName, bl: e.bl, per: {} });
      (r.per[site] = r.per[site] || []).push(e);
    }
    return Object.values(rows);
  }
  function colorTable(res, selectedBl) {
    const sites = BLPAB.sites();
    const rows = buildRows(res);
    const anyAv = (r) => sites.some((s) => (r.per[s] || []).some((e) => e.available));
    const minP = (r) => Math.min(...sites.flatMap((s) => (r.per[s] || []).filter((e) => e.available && e.price != null).map((e) => e.price)), 1e9);
    rows.forEach((r) => { r.sel = selectedBl != null && r.bl && r.bl.id === selectedBl; });
    rows.sort((a, b) => (b.sel - a.sel) || (anyAv(b) - anyAv(a)) || (minP(a) - minP(b)) || String(a.colorName).localeCompare(b.colorName));
    const priceCell = (r) => '<td>' + sites.map((s) => {
      const l = res[s] === null ? null : (r.per[s] || []);
      const lab = `<span class="blpab-site">${s}</span>`;
      if (l === null) return `<div class="blpab-cell blpab-na">${lab}${t('notSynced')}</div>`;
      if (!l.length) return `<div class="blpab-cell blpab-na">${lab}—</div>`;
      return l.map((e) => `<div class="blpab-cell${e.available ? '' : ' blpab-cell-oos'}">${lab}${priceLink(e)} ${chTag(e)}${limTag(e)}</div>`).join('');
    }).join('') + '</td>';
    const head = `<tr><th>${t('colourHeader')}</th><th>${t('priceHeader')}</th></tr>`;
    const body = rows.map((r) => {
      const eids = [...new Set(sites.flatMap((s) => (r.per[s] || []).map((e) => e.eid)))];
      return `<tr class="${r.sel ? 'blpab-sel' : ''}${anyAv(r) ? '' : ' blpab-row-oos'}">
        <td class="blpab-color"><div class="blpab-cw">${swatch(r.lego)}<span><b>${esc(r.bl ? r.bl.name : r.colorName)}</b><small>${blLabel(r.bl, r.lego, r.colorName)}</small><small>LEGO ${esc(r.colorName)} · Element ${eids.join(', ')}</small></span></div></td>
        ${priceCell(r)}</tr>`;
    }).join('');
    return { html: `<table class="blpab-table"><thead>${head}</thead><tbody>${body}</tbody></table>`, rows };
  }

  function statusLine() {
    return BLPAB.sites().map((s) => {
      const d = BLPAB.data[s], st = BLPAB.state[s] || {};
      if (st.status === 'running') return `${SITE(s)}${C()}${t('syncing', { p: st.total ? Math.round(100 * st.done / st.total) + '%' : '…' })}${st.attempt > 1 ? t('retrying') : ''}`;
      if (!d) return `${SITE(s)}${C()}${st.status === 'error' ? `<span class="blpab-bad">${t('syncFailed')}</span>` : t('notSyncedYet')}`;
      return `${SITE(s)}${C()}${t('updatedAgo', { t: BLPAB.ago(d.ts) })}${st.status === 'error' ? ` <span class="blpab-bad">${t('lastFailed')}</span>` : ''}`;
    }).join('　');
  }
  function noticeBox() {
    const sites = BLPAB.sites();
    const errs = sites.map((s) => [s, BLPAB.state[s] || {}]).filter(([, st]) => st.status === 'error');
    let html = '';
    if (sites.some((s) => (BLPAB.state[s] || {}).status === 'running' && (BLPAB.state[s] || {}).mode === 'tab')) html += `<div class="blpab-info">${t('tabNote')}</div>`;
    if (errs.length) html += `<div class="blpab-error">${errs.map(([s, st]) => esc(t('syncFailedBox', { site: SITE(s), err: errText(st.error) }))).join('<br>')}<br><button data-act="sync">${t('retry')}</button></div>`;
    return html;
  }

  // ---------- BrickLink 價格指南（目前顏色） ----------
  const pgCache = {}, pgDone = {};
  function parseMoney(s) {
    const m = /(~?)\s*([A-Z]{2,3})\s*\$?\s*([\d,]+\.\d+)/.exec(s || '');
    return m ? { approx: !!m[1], cur: m[2], v: parseFloat(m[3].replace(/,/g, '')) } : null;
  }
  async function readPG(no, color, bust) {
    const r = await fetch(`/catalogPG.asp?P=${encodeURIComponent(no)}&colorID=${color}${bust ? '&_=' + Date.now() : ''}`, { credentials: 'include', cache: 'no-store' });
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    const leaves = [...doc.querySelectorAll('td')].filter((td) => /Qty Avg Price:/.test(td.textContent) &&
      ![...td.querySelectorAll('td')].some((x) => /Qty Avg Price:/.test(x.textContent) && x.querySelector('td')));
    const boxes = {};
    for (const td of leaves) {
      if (!/Times Sold:|Total Lots:/.test(td.textContent)) continue;
      let col = null;
      for (let a = td; a; a = a.parentElement && a.parentElement.closest('td')) {
        if (a.parentElement && a.parentElement.children.length === 4) { col = a.cellIndex; break; }
      }
      const txt = td.textContent.replace(/\s+/g, ' ');
      const qty = parseMoney((/Qty Avg Price:\s*([^A-Za-z]*[A-Z]{2,3}[^A-Za-z]*)/.exec(txt) || [])[1]);
      const kind = /Times Sold:/.test(txt) ? 'sold' : 'stock';
      const k = col != null ? ['soldNew', 'soldUsed', 'stockNew', 'stockUsed'][col] : null;
      if (qty && k && !boxes[k]) boxes[k] = qty;
      else if (qty && !k && !boxes[kind + 'New']) boxes[kind + 'New'] = qty;
    }
    return boxes;
  }
  const PG_TTL = 6 * 3600e3;
  function fetchPG(no, color) {
    const key = no + '|' + color;
    if (pgCache[key]) return pgCache[key];
    pgCache[key] = (async () => {
      const store = (await blpabApi.storage.local.get('pgStore')).pgStore || {};
      const hit = store[key];
      if (hit && Date.now() - hit.ts < PG_TTL) return hit.b;   // BrickLink 價格快取 6 小時，切換顏色不用重抓
      let b = await readPG(no, color, false);
      const ref = b.stockNew || b.soldNew;
      // 第一次讀到非 USD（BrickLink 剛載入時偶爾用帳號所在地幣別）→ 稍等再讀一次
      if (ref && ref.cur !== 'US') { await new Promise((r) => setTimeout(r, 2500)); b = await readPG(no, color, true); }
      const ref2 = b.stockNew || b.soldNew;
      if (ref2 && ref2.cur === 'US') {
        const st = (await blpabApi.storage.local.get('pgStore')).pgStore || {};
        st[key] = { ts: Date.now(), b };
        const keys = Object.keys(st).sort((x, y) => st[y].ts - st[x].ts);
        for (const k of keys.slice(300)) delete st[k];   // 最多留 300 筆
        await blpabApi.storage.local.set({ pgStore: st });
      }
      return b;
    })().catch(() => ({})).then((v) => (pgDone[key] = v));
    return pgCache[key];
  }
  // 比價表：PAB 美國站／PAB 荷蘭站（≈USD）／BrickLink 現貨 New，最便宜的那列標綠
  function compareCard(sel, res, pg) {
    const pick = (site) => { const es = sel.flatMap((r) => r.per[site] || []); return es.find((e) => e.available && e.price != null) || es[0] || null; };
    const us = pick('US'), nl = pick('NL');
    const usd = {};
    if (us && us.available && us.price != null) usd.US = us.price;
    const nlUsd = nl && nl.available && nl.price != null ? BLPAB.toUsd(nl.price) : null;
    if (nlUsd != null) usd.NL = nlUsd;
    const bl = pg && (pg.stockNew || pg.soldNew);
    const blOk = bl && bl.cur === 'US';
    if (blOk && pg.stockNew) usd.BL = pg.stockNew.v;
    const vals = Object.values(usd);
    const min = vals.length > 1 ? Math.min(...vals) : null;
    const tag = (k) => min != null && usd[k] === min ? ` <span class="blpab-tag blpab-cheap">${t('cheapest')}</span>` : '';
    const cls = (k) => min != null && usd[k] === min ? ' class="blpab-best"' : '';
    const pabRow = (site, e, label) => {
      if (!BLPAB.sites().includes(site)) return '';
      if (res[site] === null) return `<tr><th>${label}</th><td class="blpab-na">${t('notSynced')}</td><td></td></tr>`;
      if (!e) return `<tr><th>${label}</th><td class="blpab-na">—</td><td class="blpab-muted">${t('noColour')}</td></tr>`;
      const ship = !e.available ? `<span class="blpab-bad">${t('outOfStock')}</span>` : e.channel === 'B' ? t('shipStd') : t(site === 'US' ? 'shipUS' : 'shipNL');
      const fx = site === 'NL' && nlUsd != null ? `<br><small class="blpab-muted">${esc(t('fxNote', { usd: '$' + nlUsd.toFixed(2), rate: BLPAB.fx.rate.toFixed(4), date: BLPAB.fx.date }))}</small>` : '';
      return `<tr${cls(site)}><th>${label}</th><td class="blpab-num">${priceLink(e)}${tag(site)}${fx}</td><td>${chTag(e)}${limTag(e)}<br><small class="blpab-muted">${ship}</small></td></tr>`;
    };
    let blRow;
    if (!pg) blRow = `<td class="blpab-na">${t('pgWait')}</td><td></td>`;
    else if (!bl) blRow = `<td class="blpab-na">${t('pgNA')}</td><td></td>`;
    else if (!blOk) blRow = `<td colspan="2" class="blpab-bad">${esc(t('pgNotUsd', { cur: bl.cur }))}</td>`;
    else blRow = `<td class="blpab-num"><b>${pg.stockNew ? `${pg.stockNew.approx ? '~' : ''}$${pg.stockNew.v.toFixed(4)}` : '—'}</b>${tag('BL')}</td><td><small class="blpab-muted">${pg.soldNew ? esc(t('soldNote', { p: '$' + pg.soldNew.v.toFixed(4) })) : ''}</small></td>`;
    const table = `<table class="blpab-cmp">${pabRow('US', us, t('srcUS'))}${pabRow('NL', nl, t('srcNL'))}<tr${cls('BL')}><th>${t('srcBL')}</th>${blRow}</tr></table>`;
    // 結論：PAB 美國站 vs BrickLink 現貨 New
    let verdict = '', verdictText = '';
    if (blOk && pg.stockNew) {
      if (usd.US == null) { verdict = `<div class="blpab-verdict blpab-verdict-na">${t('verdictNoUs')}</div>`; }
      else {
        const ref = pg.stockNew.v, p = usd.US;
        const pct = Math.round((p - ref) / ref * 100);
        verdictText = pct < 0 ? t('verdictCheaper', { p: -pct }) : pct > 0 ? t('verdictDearer', { p: Math.round((p - ref) / p * 100) }) : t('verdictSame');
        verdict = `<div class="blpab-verdict ${pct < 0 ? 'blpab-good' : pct > 0 ? 'blpab-dear' : ''}">${verdictText}</div>`;
      }
    }
    const eids = [...new Set(sel.flatMap((r) => BLPAB.sites().flatMap((s) => (r.per[s] || []).map((e) => e.eid))))];
    const site0 = us ? 'US' : 'NL', e0 = us || nl;
    const links = eids.length ? `<div class="blpab-eids">Element ${eids.join(', ')}${e0 ? ` · <a href="${BLPAB.pabUrl(site0, e0.eid)}" target="_blank" rel="noopener">${t('openLego')}</a>` : ''}</div>` : '';
    return { html: verdict + table + `<small class="blpab-muted">${t('verdictBasis')}</small>` + links, verdictText };
  }

  // ---------- 零件頁面板 ----------
  let panel, pgShown = null, expanded = false, expandedFor = null;
  const narrow = () => window.innerWidth < 1100;
  function setupPanel() {
    panel = document.createElement('div');
    panel.id = 'blpab-panel';
    document.body.appendChild(panel);
    // 窄視窗每次都先收合；寬視窗記住上次狀態
    if (narrow() || ls.get('min') === '1') panel.classList.add('blpab-min');
    panel.addEventListener('click', async (ev) => {
      const map = ev.target.closest('.blpab-setmap');
      if (map) { ev.preventDefault(); openMapEditor(map); return; }
      const a = ev.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'min') { panel.classList.toggle('blpab-min'); if (!narrow()) ls.set('min', panel.classList.contains('blpab-min') ? '1' : '0'); clampPanel(); }
      if (act === 'sync') blpabApi.runtime.sendMessage({ type: 'sync' }).catch(() => {});
      if (act === 'expand') { expanded = !expanded; renderPanel(); }
    });
    panel.addEventListener('mousedown', (ev) => {
      const head = ev.target.closest('.blpab-head');
      if (!head || ev.target.closest('button')) return;
      const r = panel.getBoundingClientRect(), dx = ev.clientX - r.left, dy = ev.clientY - r.top;
      const move = (e) => placePanel(e.clientX - dx, e.clientY - dy);
      const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
        const rr = panel.getBoundingClientRect(); ls.set('pos', Math.round(rr.left) + ',' + Math.round(rr.top)); };
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      ev.preventDefault();
    });
    window.addEventListener('resize', clampPanel);
  }
  function placePanel(x, y) {
    panel.style.left = x + 'px'; panel.style.top = y + 'px'; panel.style.right = 'auto';
    clampPanel();
  }
  // 讓面板永遠留在視窗內，底部狀態列看得到
  function clampPanel() {
    if (!panel) return;
    const pos = (ls.get('pos') || '').split(',').map(Number);
    if (!panel.style.left && pos.length === 2 && pos.every((n) => n >= 0)) { panel.style.left = pos[0] + 'px'; panel.style.top = pos[1] + 'px'; panel.style.right = 'auto'; }
    const r = panel.getBoundingClientRect();
    // 可視範圍（扣掉捲軸）；BrickLink 舊頁面是 quirks mode，要改用 body 的寬度
    const root = document.compatMode === 'BackCompat' ? document.body : document.documentElement;
    const vw = Math.min(window.innerWidth, root.clientWidth || window.innerWidth), vh = window.innerHeight;
    let x = r.left, y = r.top;
    if (panel.style.left) {
      x = Math.max(4, Math.min(x, vw - Math.min(r.width, vw - 8) - 4));
      y = Math.max(4, Math.min(y, vh - Math.min(r.height, 320) - 12));   // 拖太低時往上推，至少留 320px 可看
      panel.style.left = x + 'px'; panel.style.top = y + 'px';
    }
    if (!panel.style.left && r.right > vw - 4) panel.style.right = (window.innerWidth - vw + 8) + 'px';   // 預設靠右時避開捲軸
    panel.style.maxHeight = Math.max(160, vh - y - 16) + 'px';
  }

  // 「設定對照」：在面板裡選 BrickLink 顏色（或輸入編號），不用瀏覽器原生輸入框
  function blColourOptions() {
    const list = BLPAB.blColors ? BLPAB.blColors.list
      : BLPAB_COLOR_TABLE.map((r) => [r[1], r[2]]).concat(Object.entries(BLPAB.settings.colorNames || {}).map(([id, n]) => [Number(id), n]));
    const seen = new Set();
    return list.filter(([id]) => !seen.has(id) && seen.add(id)).sort((a, b) => String(a[1]).localeCompare(b[1]));
  }
  function openMapEditor(link) {
    const lego = link.dataset.lego, name = link.dataset.name;
    const box = document.createElement('span');
    box.className = 'blpab-mapedit';
    box.innerHTML = `<select><option value="">${esc(t('mapPick'))}</option>${blColourOptions().map(([id, n]) => `<option value="${id}">${esc(n)} (${id})</option>`).join('')}</select>
      <input type="number" min="1" placeholder="${esc(t('mapOther'))}"> <button type="button" data-m="save">${t('mapSave')}</button> <button type="button" data-m="cancel">${t('mapCancel')}</button>`;
    link.replaceWith(box);
    const sel = box.querySelector('select'), inp = box.querySelector('input');
    sel.addEventListener('change', () => { if (sel.value) inp.value = sel.value; });
    box.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const m = ev.target.dataset && ev.target.dataset.m;
      if (m === 'cancel') { box.replaceWith(link); return; }
      if (m !== 'save') return;
      const id = (inp.value || sel.value || '').trim();
      if (!/^\d+$/.test(id)) return;
      const opt = blColourOptions().find(([x]) => String(x) === id);
      await saveColourMap(lego, id, opt ? opt[1] : null);
    });
  }
  async function saveColourMap(lego, id, blName) {
    const { settings } = await blpabApi.storage.local.get('settings');
    const s = settings || {};
    s.colorOverrides = Object.assign({}, s.colorOverrides, { [lego]: id });
    if (blName) s.colorNames = Object.assign({}, s.colorNames, { [id]: blName });
    await blpabApi.storage.local.set({ settings: s });
  }

  // 零件頁上的「Alternate Item No: 92538, …」：LEGO 常用的是這個編號
  function readAlternates() {
    const m = /Alternate Item No\.?:\s*([A-Za-z0-9][\w.\-]*(?:\s*,\s*[A-Za-z0-9][\w.\-]*)*)/.exec(document.body.innerText || '');
    return m ? m[1].split(/\s*,\s*/).filter(Boolean) : [];
  }

  function renderPanel() {
    const info = itemPageInfo();
    if (!info) { if (panel) panel.remove(); panel = null; return; }
    if (!panel) setupPanel();
    const alts = readAlternates();
    if (alts.length && (BLPAB.altNos[info.no] || []).join(',') !== alts.join(',')) { BLPAB.rememberAlternates(info.no, alts); BLPAB.altNos[info.no] = alts; }
    const res = BLPAB.lookup(info.no);
    const sites = BLPAB.sites();
    const noData = sites.every((s) => res[s] === null);
    const total = sites.reduce((n, s) => n + ((res[s] || []).length), 0);
    let content, headExtra = '', verdictText = '';
    if (!sites.length) content = `<p class="blpab-msg">${t('noSites')}</p>`;
    else if (noData) content = noticeBox() || `<p class="blpab-msg">${t('noDataYet')}</p>`;
    else if (!total) {
      content = `<p class="blpab-msg">${t('notOnPabLong', { ids: esc(BLPAB.designCandidates(info.no).join(', ')) })}</p>` + noticeBox();
      headExtra = t('headNone');
    } else {
      const tb = colorTable(res, info.color);
      const via = !res.via.length ? '' : res.viaGuess
        ? `<div class="blpab-via">${t('viaWarn', { no: esc(info.no), via: esc(res.via.join(', ')) })}</div>`
        : `<div class="blpab-info">${t('viaInfo', { no: esc(info.no), via: esc(res.via.join(', ')) })}</div>`;
      if (expandedFor !== info.no) { expanded = false; expandedFor = info.no; }   // 每個零件頁都先收起顏色表
      const avRows = tb.rows.filter((r) => sites.some((s) => (r.per[s] || []).some((e) => e.available)));
      let selBox = '', others = tb.rows.length;
      if (info.color != null) {
        const blName = BLPAB.blColorName(info.color) || 'BrickLink #' + info.color;
        const sel = tb.rows.filter((r) => r.sel);
        const key = info.no + '|' + info.color;
        if (pgShown !== key) { pgShown = key; fetchPG(info.no, info.color).then(() => renderPanel()); }
        const pg = pgDone[key];
        if (sel.length) {
          others = tb.rows.length - sel.length;
          const card = compareCard(sel, res, pg);
          verdictText = card.verdictText;
          const legoNames = [...new Set(sel.map((r) => r.colorName))].join(', ');
          selBox = `<div class="blpab-summary"><div class="blpab-selname">${swatch(sel[0].lego)}<span>${t('selColour', { name: esc(blName) })}</span><small>${esc(t('legoName', { name: legoNames }))}</small></div>${card.html}</div>`;
        } else {
          const blOnly = pg ? compareCard([], res, pg).html.replace(/<div class="blpab-verdict[^>]*>.*?<\/div>/, '') : '';
          selBox = `<div class="blpab-summary blpab-summary-none">${t('notThisColour', { name: esc(blName), list: names(avRows.map((r) => r.bl ? r.bl.name : r.colorName), 12) || t('none') })}${blOnly}</div>`;
        }
      } else {
        const site0 = sites.find((s) => (res[s] || []).some((e) => e.available));
        let most = '';
        if (site0) {
          const cnt = new Map(); for (const e of res[site0].filter((x) => x.available && x.price != null)) cnt.set(e.price, (cnt.get(e.price) || 0) + 1);
          const top = [...cnt.entries()].sort((x, y) => y[1] - x[1])[0];
          if (top) most = BLPAB.money(top[0], res[site0][0].currency);
        }
        selBox = `<div class="blpab-summary blpab-summary-none"><b>${t('pickColour')}</b>${most ? '<br>' + t('pickSummary', { n: avRows.length, p: esc(most) }) : ''}</div>`;
      }
      const btn = expanded ? t('hideColours') : info.color != null && others < tb.rows.length ? t('otherColours', { n: others }) : t('allColoursBtn', { n: tb.rows.length });
      content = via + selBox + noticeBox() + (others > 0 ? `<button class="blpab-expand" data-act="expand">${btn}</button>` : '')
        + (expanded ? `<div class="blpab-lines">${sites.map((s) => siteSummary(s, res[s])).join('')}</div>` + tb.html : '');
      headExtra = t('headAvail', { a: avRows.length, n: tb.rows.length });
    }
    // 收合時標題列只顯示一行：編號＋結論
    panel.innerHTML = `<div class="blpab-head" title="${esc(t('tipDrag'))}"><span class="blpab-title"><span class="blpab-t-full">LEGO PAB · ${esc(info.no)}${headExtra}</span><span class="blpab-t-min">PAB · ${esc(info.no)}${verdictText ? ' · ' + esc(verdictText.split('→')[0].trim()) : ''}</span></span>
        <span class="blpab-actions"><button data-act="sync" title="${esc(t('tipSync'))}">⟳</button><button data-act="min" title="${esc(t('tipMin'))}">▁</button></span></div>
      <div class="blpab-body">${content}</div><div class="blpab-foot">${statusLine()}</div>`;
    clampPanel();
  }

  // ---------- 清單頁標籤 ----------
  function chipSummary(res) {
    const sites = BLPAB.sites();
    if (sites.every((s) => res[s] === null)) return { text: 'PAB …', cls: 'blpab-chip-none', title: t('chipTipNotSynced'), state: 'none' };
    const pre = res.via.length && res.viaGuess ? '≈' : '';
    const viaTip = !res.via.length ? '' : (res.viaGuess ? t('chipVia', { via: res.via.join(', ') }) : t('chipKnown', { via: res.via.join(', '), no: res.no })) + '\n';
    const lines = [], short = [];
    let any = false;
    for (const s of sites) {
      const l = res[s]; if (!l) continue;
      if (l.length) any = true;
      const av = l.filter((e) => e.available && e.price != null);
      if (!av.length) { if (l.length) lines.push(t('chipAllOos', { site: SITE(s) })); continue; }
      const ps = av.map((e) => e.price), cols = new Set(av.map((e) => e.lego)).size;
      const lo = Math.min(...ps), hi = Math.max(...ps), cur = av[0].currency;
      lines.push(t('chipLine', { site: SITE(s), range: `${BLPAB.money(lo, cur)}${hi !== lo ? '–' + hi.toFixed(2) : ''}`, n: cols }));
      // 標籤只放最低價＋色數，避免太長壓到隔壁格；完整區間在提示框
      short.push({ s, text: `${BLPAB.money(lo, cur)}${hi !== lo ? '+' : ''} · ${cols}${BLPAB_LANG === 'zh' ? '色' : 'c'}` });
    }
    if (!any) return { text: t('chipNone'), cls: 'blpab-chip-none', title: t('chipTipNone'), state: 'none' };
    if (!short.length) return { text: pre + t('chipOos'), cls: 'blpab-chip-oos', title: viaTip + lines.join('\n'), state: 'oos' };
    const first = short[0];
    const text = pre + (first.s === sites[0] ? '' : first.s + ' ') + first.text;
    return { text, cls: res.via.length && res.viaGuess ? 'blpab-chip-via' : '', title: viaTip + lines.join('\n') + '\n' + t('chipClick'), state: 'ok' };
  }

  let pop;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(chip) {
    closePop();
    const no = chip.dataset.no, res = BLPAB.lookup(no);
    pop = document.createElement('div');
    pop.className = 'blpab-pop';
    pop.dataset.no = no;
    const total = BLPAB.sites().reduce((n, s) => n + ((res[s] || []).length), 0);
    const via = res.via.length ? `<div class="${res.viaGuess ? 'blpab-via' : 'blpab-info'}">${res.viaGuess ? t('popVia', { via: esc(res.via.join(', ')) }) : t('viaInfo', { no: esc(no), via: esc(res.via.join(', ')) })}</div>` : '';
    pop.innerHTML = `<div class="blpab-head"><span class="blpab-title">LEGO PAB · ${esc(no)}</span><span class="blpab-actions"><button data-act="close">✕</button></span></div>
      <div class="blpab-body">${via}${total ? `<div class="blpab-lines">${BLPAB.sites().map((s) => siteSummary(s, res[s])).join('')}</div>` + colorTable(res, null).html : `<p class="blpab-msg">${t('chipTipNone')}</p>`}<div class="blpab-foot">${statusLine()}</div></div>`;
    document.body.appendChild(pop);
    const r = chip.getBoundingClientRect();
    const w = Math.min(560, window.innerWidth - 16);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + window.scrollX + 'px';
    const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
    const h = pop.offsetHeight;
    if (h > below && above > below) {
      pop.style.maxHeight = Math.min(h, above) + 'px';
      pop.style.top = (r.top + window.scrollY - Math.min(h, above) - 4) + 'px';
    } else {
      pop.style.maxHeight = Math.max(below, 200) + 'px';
      pop.style.top = (r.bottom + window.scrollY + 4) + 'px';
    }
    pop.querySelector('[data-act="close"]').addEventListener('click', closePop);
    pop.addEventListener('click', async (ev) => {
      const map = ev.target.closest('.blpab-setmap');
      if (map) { ev.preventDefault(); ev.stopPropagation(); openMapEditor(map); }
    });
  }
  document.addEventListener('click', (ev) => {
    const chip = ev.target.closest && ev.target.closest('.blpab-chip');
    if (chip) { ev.preventDefault(); ev.stopPropagation(); if (pop && pop.dataset.no === chip.dataset.no) closePop(); else openPop(chip); return; }
    if (pop && !pop.contains(ev.target)) closePop();
  }, true);

  const partNoOf = (a) => {
    const href = a.getAttribute('href') || '';
    if (!/catalogitem\.page|catalogItem\.asp/i.test(href)) return null;
    try { return new URL(href, location.href).searchParams.get('P'); } catch (e) { return null; }
  };
  function partNoFromLink(a) {
    const no = partNoOf(a);
    return no && a.textContent.trim().toLowerCase() === no.toLowerCase() ? no : null;   // 只在顯示零件編號的連結旁加
  }

  function annotateLinks(root) {
    if (itemPageInfo()) return;
    let first = null;
    for (const a of (root || document).querySelectorAll('a[href*="P="]')) {
      if (a.closest('#blpab-panel, .blpab-pop, #blpab-filter')) continue;
      const no = partNoFromLink(a);
      if (!no) continue;
      first = first || a;
      let chip = a.nextElementSibling && a.nextElementSibling.classList.contains('blpab-chip') ? a.nextElementSibling : null;
      const s = chipSummary(BLPAB.lookup(no));
      if (!chip) { chip = document.createElement('span'); chip.dataset.no = no; a.after(chip); }
      chip.className = 'blpab-chip ' + s.cls;
      chip.dataset.state = s.state;
      chip.textContent = s.text;
      chip.title = s.title;
    }
    if (first) filterBar(first);
    applyFilter();
  }

  // ---------- 只看 PAB 有賣（放在清單上方） ----------
  function filterBar(firstLink) {
    let b = document.getElementById('blpab-filter');
    if (!b) {
      b = document.createElement('div');
      b.id = 'blpab-filter';
      b.innerHTML = `<label><input type="checkbox"> <span></span></label>`;
      const cb = b.querySelector('input');
      cb.checked = ls.get('filter') === '1';
      cb.addEventListener('change', () => { ls.set('filter', cb.checked ? '1' : '0'); applyFilter(); });
      let tbl = firstLink.closest('table');
      for (let p = tbl; p; p = p.parentElement && p.parentElement.closest('table')) tbl = p;   // 最外層的表格
      (tbl || firstLink).before(b);
    }
    b.querySelector('span').textContent = t('filter');
  }
  function applyFilter() {
    const on = ls.get('filter') === '1';
    const hideNos = new Set(), showNos = new Set();
    for (const chip of document.querySelectorAll('.blpab-chip')) (on && chip.dataset.state !== 'ok' ? hideNos : showNos).add(chip.dataset.no.toLowerCase());
    // 同一個零件的所有連結（編號、圖片）都一起隱藏；縮圖檢視隱藏格子，清單檢視隱藏整列
    for (const a of document.querySelectorAll('a[href*="P="]')) {
      if (a.closest('#blpab-panel, .blpab-pop, #blpab-filter')) continue;
      const no = (partNoOf(a) || '').toLowerCase();
      if (!no || (!hideNos.has(no) && !showNos.has(no))) continue;
      const tr = a.closest('tr');
      if (!tr) continue;
      const nosInRow = new Set([...tr.querySelectorAll('a[href*="P="]')].map((x) => (partNoOf(x) || '').toLowerCase()).filter(Boolean));
      const hide = hideNos.has(no);
      if (nosInRow.size > 1) {
        // 縮圖檢視：隱藏這一格，以及上一列／下一列同一欄的圖片格
        const td = a.closest('td'); if (!td) continue;
        td.style.visibility = hide ? 'hidden' : '';
        for (const sib of [tr.previousElementSibling, tr.nextElementSibling]) {
          const cell = sib && sib.children[td.cellIndex];
          if (cell && cell.querySelector('img') && !cell.querySelector('a[href*="P="]')) cell.style.visibility = hide ? 'hidden' : '';
        }
      } else tr.style.display = hide ? 'none' : '';
    }
  }

  // ---------- BrickLink 顏色表（用來顯示 BL 顏色名稱、比對新顏色） ----------
  async function ensureBlColors() {
    const st = (await blpabApi.storage.local.get('blColorsStatus')).blColorsStatus;
    if (BLPAB.blColors && Date.now() - BLPAB.blColors.ts < 30 * 864e5) return;
    if (st && !st.ok && Date.now() - st.ts < 6 * 3600e3) return;   // 失敗後 6 小時內不重試
    let reason = '';
    try {
      const r = await fetch('/catalogColors.asp', { credentials: 'include' });
      const html = await r.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const list = [], seen = new Set();
      const add = (id, name) => { name = (name || '').replace(/\s+/g, ' ').trim(); if (name && !seen.has(id) && /[A-Za-z]/.test(name)) { seen.add(id); list.push([id, name]); } };
      // 方法 1：表格列「ID ｜ 色塊 ｜ 名稱 …」
      for (const tr of doc.querySelectorAll('tr')) {
        if (tr.querySelector('tr')) continue;
        const cells = [...tr.children].map((td) => td.textContent.replace(/\s+/g, ' ').trim());
        const i = cells.findIndex((c) => /^\d{1,3}$/.test(c));
        if (i < 0) continue;
        add(Number(cells[i]), cells.slice(i + 1).find((c) => /[A-Za-z]/.test(c)));
      }
      // 方法 2：連結裡帶 colorID=…（例如顏色名稱連到該色的零件清單）
      if (list.length < 50) for (const a of doc.querySelectorAll('a[href*="olorID="], a[href*="olorPart="]')) {
        const m = /color(?:ID|Part)=(\d+)/i.exec(a.getAttribute('href') || '');
        if (m) add(Number(m[1]), a.textContent);
      }
      // 方法 3：原始 HTML 用正規表示式找「<td>數字</td> … <td>名稱</td>」
      if (list.length < 50) {
        const re = /<td[^>]*>\s*(?:<[^>]+>\s*)*(\d{1,3})\s*(?:<\/[^>]+>\s*)*<\/td>\s*<td[^>]*>[\s\S]{0,400}?<\/td>\s*<td[^>]*>\s*(?:<[^>]+>\s*)*(?:&nbsp;)?\s*([A-Za-z][^<]{1,40})/gi;
        let m; while ((m = re.exec(html))) add(Number(m[1]), m[2].replace(/&nbsp;/g, ' '));
      }
      const ok = list.length >= 50 && list.some(([id, n]) => id === 1 && /white/i.test(n)) && list.some(([id, n]) => id === 11 && /black/i.test(n));
      if (ok) { await blpabApi.storage.local.set({ blColors: { ts: Date.now(), list }, blColorsStatus: { ts: Date.now(), ok: true, n: list.length } }); return; }
      reason = `HTTP ${r.status}, ${list.length} colours parsed, ${html.length} bytes`;
    } catch (e) { reason = String((e && e.message) || e); }
    await blpabApi.storage.local.set({ blColorsStatus: { ts: Date.now(), ok: false, reason } });
  }

  // ---------- 啟動 ----------
  function renderAll() { renderPanel(); annotateLinks(document); }

  async function start() {
    await BLPAB.load();
    renderAll();
    ensureBlColors();
    if (BLPAB.sites().some((s) => BLPAB.stale(s))) blpabApi.runtime.sendMessage({ type: 'ensureFresh' }).catch(() => {});
    let timer;
    blpabApi.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      if (!Object.keys(ch).some((k) => k === 'settings' || k === 'syncState' || k === 'blColors' || k === 'altNos' || k.startsWith('pab_'))) return;
      clearTimeout(timer);
      timer = setTimeout(async () => { await BLPAB.load(); renderAll(); }, 300);
    });
    let lastUrl = location.href;
    window.addEventListener('hashchange', renderPanel);
    setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; renderPanel(); } }, 800);
    setInterval(() => { const f = panel && panel.querySelector('.blpab-foot'); if (f) f.innerHTML = statusLine(); }, 60000);
    let mo;
    new MutationObserver((muts) => {
      if (muts.every((m) => [...m.addedNodes].every((n) => n.nodeType !== 1 || (n.closest && n.closest('#blpab-panel, .blpab-pop, .blpab-chip, #blpab-filter'))))) return;
      clearTimeout(mo); mo = setTimeout(() => annotateLinks(document), 400);
    }).observe(document.body, { childList: true, subtree: true });
  }
  start();
})();
