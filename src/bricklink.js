// BrickLink 頁面：
//  1. 零件頁（catalogitem.page?P=… / catalogItem.asp?P=…）→ 浮動面板：一行結論 + 目前顏色 + BrickLink 價格比較，可展開全部顏色
//  2. 分類清單、搜尋結果 → 零件編號旁的小標籤，點開看各顏色；左下角可切換「只看 PAB 有賣」
(() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SITE_LABEL = { US: '美國站', NL: '荷蘭站' };
  const ls = { get(k) { try { return localStorage.getItem('blpab.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('blpab.' + k, v); } catch (e) {} } };

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
  const TIP_CH = { P: 'Bestseller：熱銷件，美國約 5、荷蘭約 8 個工作天出貨', B: 'Standard：非熱銷件，最長 28 個工作天出貨（美國站自 2026-11 起暫停）' };
  function chTag(e) {
    if (!e.available) return '<span class="blpab-tag blpab-oos">缺貨</span>';
    if (e.channel === 'P') return `<span class="blpab-tag blpab-bs" title="${TIP_CH.P}">Bestseller</span>`;
    if (e.channel === 'B') return `<span class="blpab-tag blpab-std" title="${TIP_CH.B}">Standard</span>`;
    return '';
  }
  function limTag(e) {
    if (!e.available) return '';
    if (!e.maxQty) return '<span class="blpab-tag blpab-lim-na" title="lego.com 沒有回傳這個零件的每單限購數量">限購 —</span>';
    const cls = e.maxQty >= 500 ? 'blpab-lim-hi' : e.maxQty >= 50 ? 'blpab-lim-mid' : 'blpab-lim-lo';
    return `<span class="blpab-tag ${cls}" title="每筆訂單最多可買 ${e.maxQty} 個">限購 ${e.maxQty}</span>`;
  }
  const names = (arr, n = 5) => esc(arr.slice(0, n).join('、')) + (arr.length > n ? ` 等 ${arr.length} 色` : '');
  const priceLink = (e) => `<a class="blpab-price" href="${BLPAB.pabUrl(e.site, e.eid)}" target="_blank" rel="noopener" title="在 lego.com 開啟 Element ${e.eid}">${esc(BLPAB.money(e.price, e.currency))}</a>`;
  function swatch(lego) {
    const hex = BLPAB.maps.hex[lego];
    return `<span class="blpab-sw" style="${hex ? 'background:' + hex : ''}"></span>`;
  }
  const blLabel = (bl, lego) => bl ? `BL ${bl.id} ${esc(bl.name || '')}${bl.guessed ? '（名稱推定）' : ''}` : `LEGO #${lego}｜BL 無對照`;

  // ---------- 一行結論（依價格分組） ----------
  function siteSummary(site, list) {
    const cur = (BLPAB.data[site] || {}).currency || '';
    const head = `<b>${SITE_LABEL[site]}</b> <small>${esc(cur)}</small>`;
    if (list === null) return `<div class="blpab-line">${head}：未同步</div>`;
    if (!list.length) return `<div class="blpab-line">${head}：lego.com 沒有這個零件</div>`;
    const av = list.filter((e) => e.available && e.price != null), oos = list.filter((e) => !e.available);
    if (!av.length) return `<div class="blpab-line">${head}：<span class="blpab-bad">全部缺貨（${list.length} 色）</span></div>`;
    const byPrice = new Map();
    for (const e of av) (byPrice.get(e.price) || byPrice.set(e.price, []).get(e.price)).push(e);
    const groups = [...byPrice.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0]);
    const [bp, be] = groups[0];
    let txt = groups.length === 1 ? `${av.length} 色全部 <b>${esc(BLPAB.money(bp, cur))}</b>` : `<b>${esc(BLPAB.money(bp, cur))}</b> × ${be.length} 色`;
    for (const [p, es] of groups.slice(1)) txt += `｜<b>${esc(BLPAB.money(p, cur))}</b>：${names(es.map((e) => e.colorName))}`;
    const grp = (tag, ns) => ns.length > 3 ? `${tag} × ${ns.length} 色` : `${tag} ${names(ns)}`;
    const sub = [];
    const std = av.filter((e) => e.channel === 'B');
    const bsTag = `<span class="blpab-tag blpab-bs" title="${TIP_CH.P}">Bestseller</span>`, stdTag = `<span class="blpab-tag blpab-std" title="${TIP_CH.B}">Standard</span>`;
    if (!std.length) sub.push(`${bsTag} 全部`);
    else if (std.length === av.length) sub.push(`${stdTag} 全部`);
    else sub.push(grp(stdTag, std.map((e) => e.colorName)));
    const lim = new Map();
    for (const e of av) if (e.maxQty) (lim.get(e.maxQty) || lim.set(e.maxQty, []).get(e.maxQty)).push(e.colorName);
    if (!lim.size) sub.push('<span class="blpab-muted" title="lego.com 沒有回傳限購數量">限購：未提供</span>');
    else for (const [q, ns] of [...lim.entries()].sort((x, y) => y[0] - x[0])) {
      const cls = q >= 500 ? 'blpab-lim-hi' : q >= 50 ? 'blpab-lim-mid' : 'blpab-lim-lo';
      sub.push(lim.size === 1 && ns.length === av.length ? `<span class="blpab-tag ${cls}">限購 ${q}</span> 全部` : grp(`<span class="blpab-tag ${cls}">限購 ${q}</span>`, ns));
    }
    if (oos.length) sub.push(`<span class="blpab-bad">缺貨</span> ${names(oos.map((e) => e.colorName), 3)}`);
    return `<div class="blpab-line">${head}：${txt}<div class="blpab-sub">${sub.join('<span class="blpab-dot">·</span>')}</div></div>`;
  }

  // ---------- 全部顏色表 ----------
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
    const cell = (list) => list === null ? '<td class="blpab-na">未同步</td>' : !list.length ? '<td class="blpab-na">—</td>'
      : '<td>' + list.map((e) => `<div class="blpab-cell${e.available ? '' : ' blpab-cell-oos'}">${priceLink(e)} ${chTag(e)}${limTag(e)}</div>`).join('') + '</td>';
    const head = `<tr><th>LEGO 顏色 → BrickLink</th>${sites.map((s) => `<th>${SITE_LABEL[s]} (${esc((BLPAB.data[s] || {}).currency || '')})</th>`).join('')}</tr>`;
    const body = rows.map((r) => {
      const eids = [...new Set(sites.flatMap((s) => (r.per[s] || []).map((e) => e.eid)))];
      return `<tr class="${r.sel ? 'blpab-sel' : ''}${anyAv(r) ? '' : ' blpab-row-oos'}">
        <td class="blpab-color"><div class="blpab-cw">${swatch(r.lego)}<span><b>${esc(r.colorName)}</b><small>${blLabel(r.bl, r.lego)}</small><small>Element ${eids.join(', ')}</small></span></div></td>
        ${sites.map((s) => cell(res[s] === null ? null : (r.per[s] || []))).join('')}</tr>`;
    }).join('');
    return { html: `<table class="blpab-table"><thead>${head}</thead><tbody>${body}</tbody></table>`, rows };
  }

  function statusLine() {
    return BLPAB.sites().map((s) => {
      const d = BLPAB.data[s], st = BLPAB.state[s] || {};
      if (st.status === 'running') return `${SITE_LABEL[s]}：同步中 ${st.total ? Math.round(100 * st.done / st.total) + '%' : '…'}${st.attempt > 1 ? '（重試）' : ''}`;
      if (!d) return `${SITE_LABEL[s]}：${st.status === 'error' ? '<span class="blpab-bad">同步失敗</span>' : '尚未同步'}`;
      return `${SITE_LABEL[s]}：價格更新於 ${BLPAB.ago(d.ts)}${st.status === 'error' ? ' <span class="blpab-bad">（上次更新失敗）</span>' : ''}`;
    }).join('　');
  }
  function errorBox() {
    const errs = BLPAB.sites().map((s) => [s, BLPAB.state[s] || {}]).filter(([, st]) => st.status === 'error');
    if (!errs.length) return '';
    return `<div class="blpab-error">${errs.map(([s, st]) => `${SITE_LABEL[s]}同步失敗：${esc(st.error)}`).join('<br>')}<br><button data-act="sync">⟳ 重試</button></div>`;
  }

  // ---------- BrickLink 價格指南（目前顏色） ----------
  const pgCache = {}, pgDone = {};
  function parseMoney(t) {
    const m = /(~?)\s*([A-Z]{2,3})\s*\$?\s*([\d,]+\.\d+)/.exec(t || '');
    return m ? { approx: !!m[1], cur: m[2], v: parseFloat(m[3].replace(/,/g, '')) } : null;
  }
  async function fetchPG(no, color) {
    const key = no + '|' + color;
    if (pgCache[key]) return pgCache[key];
    pgCache[key] = (async () => {
      const r = await fetch(`/catalogPG.asp?P=${encodeURIComponent(no)}&colorID=${color}`, { credentials: 'include' });
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
    })().catch(() => ({})).then((v) => (pgDone[key] = v));
    return pgCache[key];
  }
  function pgHtml(pg, pabUS) {
    if (!pg) return '<div class="blpab-pg blpab-muted">BrickLink 價格讀取中…</div>';
    const parts = [];
    if (pg.stockNew) parts.push(`現貨 New Qty Avg <b>${pg.stockNew.approx ? '~' : ''}${esc(pg.stockNew.cur)} $${pg.stockNew.v.toFixed(4)}</b>`);
    if (pg.soldNew) parts.push(`近 6 月成交 <b>${pg.soldNew.approx ? '~' : ''}${esc(pg.soldNew.cur)} $${pg.soldNew.v.toFixed(4)}</b>`);
    if (!parts.length) return '<div class="blpab-pg blpab-muted">BrickLink：這個顏色沒有 New 價格資料</div>';
    let cmp = '';
    const ref = pg.stockNew || pg.soldNew;
    if (pabUS != null && ref.cur === 'US' && ref.v > 0) {
      const pct = Math.round((pabUS - ref.v) / ref.v * 100);
      cmp = pct < 0 ? ` → <span class="blpab-good">PAB 便宜 ${-pct}%</span>` : pct > 0 ? ` → <span class="blpab-bad">PAB 貴 ${pct}%</span>` : ' → 價格相同';
    }
    return `<div class="blpab-pg">BrickLink ${parts.join('｜')}${cmp}</div>`;
  }

  // ---------- 零件頁面板 ----------
  let panel, pgShown = null;
  function setupPanel() {
    panel = document.createElement('div');
    panel.id = 'blpab-panel';
    document.body.appendChild(panel);
    const saved = ls.get('min');
    if (saved === '1' || (saved == null && window.innerWidth < 1100)) panel.classList.add('blpab-min');
    const pos = (ls.get('pos') || '').split(',').map(Number);
    if (pos.length === 2 && pos.every((n) => n >= 0)) placePanel(pos[0], pos[1]);
    panel.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'min') { panel.classList.toggle('blpab-min'); ls.set('min', panel.classList.contains('blpab-min') ? '1' : '0'); }
      if (act === 'sync') blpabApi.runtime.sendMessage({ type: 'sync' }).catch(() => {});
      if (act === 'expand') { ls.set('expand', ls.get('expand') === '1' ? '0' : '1'); renderPanel(); }
    });
    // 拖曳標題列移動面板
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
  }
  function placePanel(x, y) {
    x = Math.max(0, Math.min(x, window.innerWidth - 120)); y = Math.max(0, Math.min(y, window.innerHeight - 40));
    panel.style.left = x + 'px'; panel.style.top = y + 'px'; panel.style.right = 'auto';
  }

  function renderPanel() {
    const info = itemPageInfo();
    if (!info) { if (panel) panel.remove(); panel = null; return; }
    if (!panel) setupPanel();
    const res = BLPAB.lookup(info.no);
    const sites = BLPAB.sites();
    const noData = sites.every((s) => res[s] === null);
    const total = sites.reduce((n, s) => n + ((res[s] || []).length), 0);
    let content, headExtra = '';
    if (!sites.length) content = '<p class="blpab-msg">請在擴充功能彈出視窗中至少開啟一個站。</p>';
    else if (noData) content = errorBox() || '<p class="blpab-msg">還沒有 lego.com 資料，正在背景同步（約 30–60 秒）…</p>';
    else if (!total) {
      content = `<p class="blpab-msg"><b>lego.com Pick a Brick 沒有這個零件</b>（找過 Design ID：${esc(BLPAB.designCandidates(info.no).join(', '))}）。<br>若 LEGO 編號不同，可在彈出視窗的「編號對照」加上。</p>` + errorBox();
      headExtra = ' · 無';
    } else {
      const t = colorTable(res, info.color);
      const via = res.via.length ? `<div class="blpab-via">⚠︎ lego.com 沒有 ${esc(info.no)}，以下是 <b>${esc(res.via.join(', '))}</b> 的資料（BrickLink 舊版／變體編號沿用），請確認是否同一零件</div>` : '';
      let selBox = '';
      if (info.color != null) {
        const blName = BLPAB.blColorName(info.color) || 'BrickLink #' + info.color;
        const sel = t.rows.filter((r) => r.sel);
        const pabUS = sel.flatMap((r) => r.per.US || []).filter((e) => e.available)[0];
        const key = info.no + '|' + info.color;
        if (pgShown !== key) { pgShown = key; fetchPG(info.no, info.color).then(() => renderPanel()); }
        const pg = pgDone[key];
        if (sel.length) {
          selBox = `<div class="blpab-summary">目前顏色 <b>${esc(blName)}</b>${sel[0].colorName !== blName ? ` <small>（LEGO：${esc(sel[0].colorName)}）</small>` : ''}<br>${sites.map((s) => {
            if (res[s] === null) return `${SITE_LABEL[s]} 未同步`;
            const es = sel.flatMap((r) => r.per[s] || []);
            if (!es.length) return `${SITE_LABEL[s]} 無此色`;
            return `${SITE_LABEL[s]} ${es.map((e) => `${priceLink(e)} ${chTag(e)}${limTag(e)}`).join(' / ')}`;
          }).join('<br>')}${pgHtml(pg, pabUS ? pabUS.price : null)}</div>`;
        } else {
          const avNames = t.rows.filter((r) => sites.some((s) => (r.per[s] || []).some((e) => e.available))).map((r) => r.colorName);
          selBox = `<div class="blpab-summary blpab-summary-none">目前顏色 <b>${esc(blName)}</b>：<b>lego.com 沒有這個顏色</b>。<br>PAB 有賣：${names(avNames, 12) || '無'}${pgHtml(pg, null)}</div>`;
        }
      }
      const expanded = ls.get('expand') === '1';
      content = via + selBox + errorBox() + `<div class="blpab-lines">${sites.map((s) => siteSummary(s, res[s])).join('')}</div>`
        + `<button class="blpab-expand" data-act="expand">${expanded ? '收起顏色表 ▴' : `展開全部顏色（${t.rows.length}）▾`}</button>`
        + (expanded ? t.html : '');
      const av = t.rows.filter((r) => sites.some((s) => (r.per[s] || []).some((e) => e.available))).length;
      headExtra = ` · ${av}/${t.rows.length} 色可買`;
    }
    panel.innerHTML = `<div class="blpab-head" title="拖曳可移動"><span class="blpab-title">LEGO PAB · ${esc(info.no)}${headExtra}</span>
        <span class="blpab-actions"><button data-act="sync" title="重新抓 lego.com 價格">⟳</button><button data-act="min" title="收合／展開">▁</button></span></div>
      <div class="blpab-body">${content}<div class="blpab-foot">${statusLine()}</div></div>`;
  }
  // ---------- 清單頁標籤 ----------
  function chipSummary(res) {
    const sites = BLPAB.sites();
    if (sites.every((s) => res[s] === null)) return { text: 'PAB …', cls: 'blpab-chip-none', title: '尚未同步 lego.com 資料', state: 'none' };
    const pre = res.via.length ? '≈' : '';
    const viaTip = res.via.length ? `（lego.com 沒有這個編號，用 ${res.via.join(', ')} 的資料）\n` : '';
    const lines = [], short = [];
    let any = false;
    for (const s of sites) {
      const l = res[s]; if (!l) continue;
      if (l.length) any = true;
      const av = l.filter((e) => e.available && e.price != null);
      if (!av.length) { if (l.length) lines.push(`${SITE_LABEL[s]}：全部缺貨`); continue; }
      const ps = av.map((e) => e.price), cols = new Set(av.map((e) => e.lego)).size;
      const lo = Math.min(...ps), hi = Math.max(...ps), cur = av[0].currency;
      const range = `${BLPAB.money(lo, cur)}${hi !== lo ? '–' + hi.toFixed(2) : ''}`;
      lines.push(`${SITE_LABEL[s]}：${range}，${cols} 色可買`);
      short.push({ s, text: `${range} · ${cols}色` });
    }
    if (!any) return { text: 'PAB 無', cls: 'blpab-chip-none', title: 'lego.com Pick a Brick 沒有這個零件', state: 'none' };
    if (!short.length) return { text: pre + 'PAB 缺貨', cls: 'blpab-chip-oos', title: viaTip + lines.join('\n'), state: 'oos' };
    const first = short[0];
    const text = pre + (first.s === sites[0] ? '' : first.s + ' ') + first.text;
    return { text, cls: res.via.length ? 'blpab-chip-via' : '', title: viaTip + lines.join('\n') + '\n點一下看各顏色', state: 'ok' };
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
    const via = res.via.length ? `<div class="blpab-via">⚠︎ 用 ${esc(res.via.join(', '))} 的資料</div>` : '';
    pop.innerHTML = `<div class="blpab-head"><span class="blpab-title">LEGO PAB · ${esc(no)}</span><span class="blpab-actions"><button data-act="close">✕</button></span></div>
      <div class="blpab-body">${via}${total ? `<div class="blpab-lines">${BLPAB.sites().map((s) => siteSummary(s, res[s])).join('')}</div>` + colorTable(res, null).html : '<p class="blpab-msg">lego.com 沒有這個零件。</p>'}<div class="blpab-foot">${statusLine()}</div></div>`;
    document.body.appendChild(pop);
    const r = chip.getBoundingClientRect();
    const w = Math.min(600, window.innerWidth - 16);
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
  }
  document.addEventListener('click', (ev) => {
    const chip = ev.target.closest && ev.target.closest('.blpab-chip');
    if (chip) { ev.preventDefault(); ev.stopPropagation(); if (pop && pop.dataset.no === chip.dataset.no) closePop(); else openPop(chip); return; }
    if (pop && !pop.contains(ev.target)) closePop();
  }, true);

  function partNoFromLink(a) {
    const href = a.getAttribute('href') || '';
    if (!/catalogitem\.page|catalogItem\.asp/i.test(href)) return null;
    let u; try { u = new URL(href, location.href); } catch (e) { return null; }
    const no = u.searchParams.get('P');
    if (!no) return null;
    return a.textContent.trim().toLowerCase() === no.toLowerCase() ? no : null;   // 只在顯示零件編號的連結旁加
  }

  function annotateLinks(root) {
    if (itemPageInfo()) return;
    let n = 0;
    for (const a of (root || document).querySelectorAll('a[href*="P="]')) {
      if (a.closest('#blpab-panel, .blpab-pop, #blpab-filter')) continue;
      const no = partNoFromLink(a);
      if (!no) continue;
      n++;
      let chip = a.nextElementSibling && a.nextElementSibling.classList.contains('blpab-chip') ? a.nextElementSibling : null;
      const s = chipSummary(BLPAB.lookup(no));
      if (!chip) { chip = document.createElement('span'); chip.dataset.no = no; a.after(chip); }
      chip.className = 'blpab-chip ' + s.cls;
      chip.dataset.state = s.state;
      chip.textContent = s.text;
      chip.title = s.title;
    }
    if (n) filterBar(); applyFilter();
  }

  // ---------- 只看 PAB 有賣 ----------
  function filterBar() {
    if (document.getElementById('blpab-filter')) return;
    const b = document.createElement('div');
    b.id = 'blpab-filter';
    b.innerHTML = '<label><input type="checkbox"> 只看 lego.com PAB 有賣</label>';
    document.body.appendChild(b);
    const cb = b.querySelector('input');
    cb.checked = ls.get('filter') === '1';
    cb.addEventListener('change', () => { ls.set('filter', cb.checked ? '1' : '0'); applyFilter(); });
  }
  function applyFilter() {
    const on = ls.get('filter') === '1';
    for (const chip of document.querySelectorAll('.blpab-chip')) {
      const tr = chip.closest('tr');
      const target = tr && tr.querySelectorAll('.blpab-chip').length > 1 ? chip.closest('td') : tr;
      if (!target) continue;
      const hide = on && chip.dataset.state !== 'ok';
      if (target.tagName === 'TD') target.style.visibility = hide ? 'hidden' : '';
      else target.style.display = hide ? 'none' : '';
    }
  }

  // ---------- BrickLink 顏色表（用來顯示 BL 顏色名稱、比對新顏色） ----------
  async function ensureBlColors() {
    if (BLPAB.blColors && Date.now() - BLPAB.blColors.ts < 30 * 864e5) return;
    try {
      const r = await fetch('/catalogColors.asp', { credentials: 'include' });
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const list = [], seen = new Set();
      for (const tr of doc.querySelectorAll('tr')) {
        if (tr.querySelector('tr')) continue;
        const cells = [...tr.children].map((td) => td.textContent.replace(/\s+/g, ' ').trim());
        const i = cells.findIndex((c) => /^\d{1,3}$/.test(c));
        if (i < 0) continue;
        const name = cells.slice(i + 1).find((c) => /[A-Za-z]/.test(c));
        const id = Number(cells[i]);
        if (name && !seen.has(id)) { seen.add(id); list.push([id, name]); }
      }
      const ok = list.some(([id, n]) => id === 1 && /white/i.test(n)) && list.some(([id, n]) => id === 11 && /black/i.test(n));
      if (ok) await blpabApi.storage.local.set({ blColors: { ts: Date.now(), list } });
    } catch (e) { /* 讀不到就只用內建表 */ }
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
      if (!Object.keys(ch).some((k) => k === 'settings' || k === 'syncState' || k === 'blColors' || k.startsWith('pab_'))) return;
      clearTimeout(timer);
      timer = setTimeout(async () => { await BLPAB.load(); renderAll(); }, 300);
    });
    let lastUrl = location.href;
    window.addEventListener('hashchange', renderPanel);
    setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; renderPanel(); } }, 800);
    setInterval(() => { if (panel) panel.querySelector('.blpab-foot') && (panel.querySelector('.blpab-foot').innerHTML = statusLine()); }, 60000);
    let mo;
    new MutationObserver((muts) => {
      if (muts.every((m) => [...m.addedNodes].every((n) => n.nodeType !== 1 || (n.closest && n.closest('#blpab-panel, .blpab-pop, .blpab-chip, #blpab-filter'))))) return;
      clearTimeout(mo); mo = setTimeout(() => annotateLinks(document), 400);
    }).observe(document.body, { childList: true, subtree: true });
  }
  start();
})();
