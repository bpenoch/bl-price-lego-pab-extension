// BrickLink 頁面：
//  1. 零件頁（catalogitem.page?P=… / catalogItem.asp?P=…）→ 右側浮動面板，列出 lego.com 各顏色價格／庫存／限購，並標出目前選的顏色
//  2. 分類清單、搜尋結果（catalogList.asp、search.page 等）→ 每個零件編號旁加一個小標籤，點開看各顏色
(() => {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SITE_LABEL = { US: '美國站', NL: '荷蘭站' };

  // ---------- 頁面判斷 ----------
  function params() {
    const q = new URLSearchParams(location.search);
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    return { q, h };
  }
  function itemPageInfo() {
    if (!/\/(v2\/catalog\/catalogitem\.page|catalogItem\.asp)$/i.test(location.pathname)) return null;
    const { q, h } = params();
    const no = q.get('P');
    if (!no) return null;
    const c = h.get('C') || q.get('C') || q.get('idColor') || q.get('colorID');
    return { no, color: c && c !== '0' ? Number(c) : null };
  }

  // ---------- 共用：顏色列 ----------
  function limitBadge(e) {
    if (!e.available) return '<span class="blpab-tag blpab-oos">缺貨</span>';
    let out = e.channel === 'P' ? '<span class="blpab-tag blpab-bs" title="Bestseller：約 5–8 個工作天出貨">Bestseller</span>'
      : e.channel === 'B' ? '<span class="blpab-tag blpab-std" title="Standard：最長 28 個工作天出貨">Standard</span>' : '';
    if (e.maxQty) {
      const cls = e.maxQty >= 500 ? 'blpab-lim-hi' : e.maxQty >= 50 ? 'blpab-lim-mid' : 'blpab-lim-lo';
      out += `<span class="blpab-tag ${cls}" title="每筆訂單最多可買 ${e.maxQty} 個">限購 ${e.maxQty}</span>`;
    }
    return out;
  }
  function priceCell(list, site) {
    if (list === null) return '<td class="blpab-na">未同步</td>';
    if (!list || !list.length) return '<td class="blpab-na">—</td>';
    return '<td>' + list.map((e) => `<div class="blpab-cell${e.available ? '' : ' blpab-cell-oos'}" title="Element ${e.eid}${e.name ? ' · ' + esc(e.name) : ''}">
        <b>${esc(BLPAB.money(e.price, e.currency))}</b> ${limitBadge(e)}${list.length > 1 ? `<small class="blpab-eid">${e.eid}</small>` : ''}</div>`).join('') + '</td>';
  }
  function swatch(lego) {
    const hex = BLPAB.maps.hex[lego];
    return `<span class="blpab-sw" style="${hex ? 'background:' + hex : ''}"></span>`;
  }

  // 依 LEGO 顏色把各站資料合併成表格列
  function buildRows(res) {
    const sites = BLPAB.sites(), rows = {};
    for (const site of sites) {
      for (const e of res[site] || []) {
        const k = e.lego;
        const r = rows[k] || (rows[k] = { lego: k, colorName: e.colorName, family: e.family, bl: e.bl, per: {} });
        (r.per[site] = r.per[site] || []).push(e);
      }
    }
    return Object.values(rows);
  }

  function colorTable(res, selectedBl) {
    const sites = BLPAB.sites();
    let rows = buildRows(res);
    const anyAv = (r) => sites.some((s) => (r.per[s] || []).some((e) => e.available));
    const minP = (r) => Math.min(...sites.flatMap((s) => (r.per[s] || []).filter((e) => e.available && e.price != null).map((e) => e.price)), 1e9);
    rows.forEach((r) => { r.sel = selectedBl != null && r.bl && r.bl.id === selectedBl; });
    rows.sort((a, b) => (b.sel - a.sel) || (anyAv(b) - anyAv(a)) || (minP(a) - minP(b)) || String(a.colorName).localeCompare(b.colorName));
    const head = `<tr><th>LEGO 顏色 → BrickLink</th>${sites.map((s) => `<th>${SITE_LABEL[s]} (${esc((BLPAB.data[s] || {}).currency || (s === 'US' ? 'USD' : 'EUR'))})</th>`).join('')}</tr>`;
    const body = rows.map((r) => `<tr class="${r.sel ? 'blpab-sel' : ''}${anyAv(r) ? '' : ' blpab-row-oos'}">
        <td class="blpab-color"><div class="blpab-cw">${swatch(r.lego)}<span><b>${esc(r.colorName)}</b><small>${r.bl ? `BL ${r.bl.id} ${esc(r.bl.name)}` : `LEGO #${r.lego}｜BL 無對照`}</small></span></div></td>
        ${sites.map((s) => priceCell(res[s] === null ? null : (r.per[s] || []), s)).join('')}</tr>`).join('');
    return { html: `<table class="blpab-table"><thead>${head}</thead><tbody>${body}</tbody></table>`, rows };
  }

  function statusLine() {
    return BLPAB.sites().map((s) => {
      const d = BLPAB.data[s], st = BLPAB.state[s] || {};
      if (st.status === 'running') return `${SITE_LABEL[s]}：同步中 ${st.total ? Math.round(100 * st.done / st.total) + '%' : '…'}`;
      if (!d) return `${SITE_LABEL[s]}：${st.status === 'error' ? '同步失敗（' + esc(st.error) + '）' : '尚未同步'}`;
      const t = new Date(d.ts);
      return `${SITE_LABEL[s]}：${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}${st.status === 'error' ? ' ⚠︎' : ''}`;
    }).join('　');
  }

  // ---------- 零件頁面板 ----------
  let panel;
  function renderPanel() {
    const info = itemPageInfo();
    if (!info) { if (panel) panel.remove(); panel = null; return; }
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'blpab-panel';
      document.body.appendChild(panel);
      panel.addEventListener('click', (ev) => {
        const a = ev.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'min') { panel.classList.toggle('blpab-min'); try { localStorage.blpabMin = panel.classList.contains('blpab-min') ? '1' : ''; } catch (e) {} }
        if (a.dataset.act === 'sync') blpabApi.runtime.sendMessage({ type: 'sync' }).catch(() => {});
      });
      try { if (localStorage.blpabMin) panel.classList.add('blpab-min'); } catch (e) {}
    }
    const res = BLPAB.lookup(info.no);
    const sites = BLPAB.sites();
    const noData = sites.every((s) => res[s] === null);
    const total = sites.reduce((n, s) => n + ((res[s] || []).length), 0);
    let content;
    if (!sites.length) content = '<p class="blpab-msg">請在擴充功能彈出視窗中至少開啟一個站。</p>';
    else if (noData) content = '<p class="blpab-msg">還沒有 lego.com 資料，正在背景開啟 lego.com 同步（約 30–60 秒）…</p>';
    else if (!total) content = `<p class="blpab-msg">lego.com Pick a Brick 沒有 <b>${esc(info.no)}</b>（試過 Design ID：${esc(BLPAB.designCandidates(info.no).join(', '))}）。<br>若 LEGO 編號不同，可在彈出視窗的「編號對照」加上。</p>`;
    else {
      const t = colorTable(res, info.color);
      let summary = '';
      if (info.color != null) {
        const sel = t.rows.filter((r) => r.sel);
        const blName = (Object.values(BLPAB.maps.legoToBl).find((b) => b.id === info.color) || {}).name;
        summary = sel.length
          ? `<div class="blpab-summary">目前顏色 <b>${esc(blName || 'BL ' + info.color)}</b>：${sites.map((s) => {
              const es = sel.flatMap((r) => r.per[s] || []);
              if (res[s] === null) return `${SITE_LABEL[s]} 未同步`;
              if (!es.length) return `${SITE_LABEL[s]} 無此色`;
              return `${SITE_LABEL[s]} ${es.map((e) => `<b>${esc(BLPAB.money(e.price, e.currency))}</b> ${limitBadge(e)}`).join(' / ')}`;
            }).join('｜')}</div>`
          : `<div class="blpab-summary blpab-summary-none">目前顏色 <b>${esc(blName || 'BrickLink #' + info.color)}</b>：lego.com 沒有這個顏色${blName ? '' : '（或顏色未對照）'}</div>`;
      }
      const av = t.rows.filter((r) => sites.some((s) => (r.per[s] || []).some((e) => e.available))).length;
      content = summary + `<div class="blpab-count">lego.com 共 ${t.rows.length} 色，其中 ${av} 色可購買</div>` + t.html;
    }
    panel.innerHTML = `<div class="blpab-head"><span class="blpab-title">LEGO PAB · ${esc(info.no)}</span>
        <span class="blpab-actions"><button data-act="sync" title="重新抓 lego.com 價格">⟳</button><button data-act="min" title="收合／展開">▁</button></span></div>
      <div class="blpab-body">${content}<div class="blpab-foot">${statusLine()}</div></div>`;
  }

  // ---------- 清單頁標籤 ----------
  function chipSummary(res) {
    const sites = BLPAB.sites();
    if (sites.every((s) => res[s] === null)) return { text: 'PAB …', cls: 'blpab-chip-none' };
    const parts = [];
    let any = false, anyAv = false;
    for (const s of sites) {
      const l = res[s]; if (!l) continue;
      if (l.length) any = true;
      const av = l.filter((e) => e.available && e.price != null);
      if (!av.length) continue;
      anyAv = true;
      const ps = av.map((e) => e.price), cols = new Set(av.map((e) => e.lego)).size;
      const lo = Math.min(...ps), hi = Math.max(...ps), cur = av[0].currency;
      parts.push(`${s} ${BLPAB.money(lo, cur)}${hi !== lo ? '–' + hi.toFixed(2) : ''} · ${cols}色`);
    }
    if (!any) return { text: 'PAB 無', cls: 'blpab-chip-none' };
    if (!anyAv) return { text: 'PAB 缺貨', cls: 'blpab-chip-oos' };
    return { text: parts.join('｜'), cls: '' };
  }

  let pop;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(chip) {
    closePop();
    const no = chip.dataset.no, res = BLPAB.lookup(no);
    pop = document.createElement('div');
    pop.className = 'blpab-pop';
    const total = BLPAB.sites().reduce((n, s) => n + ((res[s] || []).length), 0);
    pop.innerHTML = `<div class="blpab-head"><span class="blpab-title">LEGO PAB · ${esc(no)}</span><span class="blpab-actions"><button data-act="close">✕</button></span></div>
      <div class="blpab-body">${total ? colorTable(res, null).html : '<p class="blpab-msg">lego.com 沒有這個零件。</p>'}<div class="blpab-foot">${statusLine()}</div></div>`;
    document.body.appendChild(pop);
    const r = chip.getBoundingClientRect();
    const w = Math.min(560, window.innerWidth - 16);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(8, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - w - 8)) + 'px';
    pop.style.top = (r.bottom + window.scrollY + 4) + 'px';
    pop.querySelector('[data-act="close"]').addEventListener('click', closePop);
  }
  document.addEventListener('click', (ev) => {
    const chip = ev.target.closest && ev.target.closest('.blpab-chip');
    if (chip) { ev.preventDefault(); ev.stopPropagation(); pop && pop.dataset.no === chip.dataset.no ? closePop() : (openPop(chip), pop.dataset.no = chip.dataset.no); return; }
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
    for (const a of (root || document).querySelectorAll('a[href*="P="]')) {
      if (a.closest('#blpab-panel, .blpab-pop')) continue;
      const no = partNoFromLink(a);
      if (!no) continue;
      let chip = a.nextElementSibling && a.nextElementSibling.classList.contains('blpab-chip') ? a.nextElementSibling : null;
      const s = chipSummary(BLPAB.lookup(no));
      if (!chip) { chip = document.createElement('span'); chip.dataset.no = no; a.after(chip); }
      chip.className = 'blpab-chip ' + s.cls;
      chip.textContent = s.text;
      chip.title = '點一下看 lego.com 各顏色價格與庫存';
    }
  }

  // ---------- 啟動 ----------
  function renderAll() { renderPanel(); annotateLinks(document); }

  async function start() {
    await BLPAB.load();
    renderAll();
    if (BLPAB.sites().some((s) => BLPAB.stale(s))) blpabApi.runtime.sendMessage({ type: 'ensureFresh' }).catch(() => {});
    let timer;
    blpabApi.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      if (!Object.keys(ch).some((k) => k === 'settings' || k === 'syncState' || k.startsWith('pab_'))) return;
      clearTimeout(timer);
      timer = setTimeout(async () => { await BLPAB.load(); renderAll(); }, 300);
    });
    // BrickLink 新版頁面換顏色時只改 hash；搜尋結果是動態載入
    let lastUrl = location.href;
    window.addEventListener('hashchange', renderPanel);
    setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; renderPanel(); } }, 800);
    let mo;
    new MutationObserver((muts) => {
      if (muts.every((m) => [...m.addedNodes].every((n) => n.nodeType !== 1 || (n.closest && n.closest('#blpab-panel, .blpab-pop, .blpab-chip'))))) return;
      clearTimeout(mo); mo = setTimeout(() => annotateLinks(document), 400);
    }).observe(document.body, { childList: true, subtree: true });
  }
  start();
})();
