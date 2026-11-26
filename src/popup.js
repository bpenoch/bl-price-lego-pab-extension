const api = globalThis.browser || globalThis.chrome;
const DEF = { sites: { US: true, NL: true }, ttlHours: 24, autoSync: true, colorOverrides: {}, aliases: {}, lang: 'auto' };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parsePairs(text) {
  const o = {};
  for (const line of text.split('\n')) {
    const m = line.split(/[=:\t]/).map((s) => s.trim());
    if (m.length >= 2 && m[0] && m[1]) o[m[0]] = m[1];
  }
  return o;
}
const pairs = (o) => Object.entries(o || {}).map(([k, v]) => `${k}=${v}`).join('\n');
const errText = (e) => e === 'tab_closed' ? t('errTabClosed') : e === 'timeout' ? t('errTimeout') : e;

function applyTexts() {
  document.documentElement.lang = BLPAB_LANG === 'zh' ? 'zh-Hant' : 'en';
  for (const el of document.querySelectorAll('[data-i]')) el.textContent = t(el.dataset.i);
}

async function render() {
  const r = await api.storage.local.get(['syncState', 'pab_US', 'pab_NL', 'blColors', 'blColorsStatus']);
  const st = r.syncState || {};
  let html = ['US', 'NL'].map((s) => {
    const d = r['pab_' + s], x = st[s] || {};
    let txt;
    if (x.status === 'running') txt = t('syncing', { p: x.total ? Math.round(100 * x.done / x.total) + '%' : '…' }) + (x.mode === 'tab' ? t('pTab') : '');
    else if (d) txt = `${new Date(d.ts).toLocaleString()}${x.mode === 'direct' ? t('pDirect') : x.mode === 'tab' ? t('pTab') : ''}<br>${t('pCount', { n: d.count.toLocaleString(), a: d.available.toLocaleString(), cur: d.currency })}<br>${t('pWithMax', { n: d.withMax == null ? '—' : d.withMax.toLocaleString() })}`;
    else txt = t('notSyncedYet');
    if (x.status === 'error') txt += `<br><span class="err">${esc(t('pLastFail', { e: errText(x.error) }))}</span>`;
    return `<div class="site"><b>${t('site_' + s)}</b><span class="st">${txt}</span></div>`;
  }).join('');
  const bs = r.blColorsStatus;
  const bl = r.blColors ? t('pBlOk', { n: r.blColors.list.length, d: new Date(r.blColors.ts).toLocaleDateString() })
    : bs && !bs.ok ? `<span class="err">${esc(t('pBlFail', { e: bs.reason }))}</span>` : t('pBlNone');
  html += `<div class="site"><b>${t('pBlColours')}</b><span class="st">${bl}</span></div>`;
  $('status').innerHTML = html;
}

async function loadSettings() {
  const s = { ...DEF, ...((await api.storage.local.get('settings')).settings || {}) };
  s.sites = { ...DEF.sites, ...(s.sites || {}) };
  blpabSetLang(s.lang); applyTexts();
  $('US').checked = s.sites.US; $('NL').checked = s.sites.NL;
  $('autoSync').checked = s.autoSync; $('ttlHours').value = s.ttlHours; $('lang').value = s.lang || 'auto';
  $('aliases').value = pairs(s.aliases); $('colors').value = pairs(s.colorOverrides);
}

async function save() {
  const settings = {
    sites: { US: $('US').checked, NL: $('NL').checked },
    autoSync: $('autoSync').checked,
    ttlHours: Math.max(1, Number($('ttlHours').value) || 24),
    lang: $('lang').value,
    aliases: parsePairs($('aliases').value),
    colorOverrides: parsePairs($('colors').value),
  };
  await api.storage.local.set({ settings });
  blpabSetLang(settings.lang); applyTexts(); render();
  $('saved').textContent = t('pSaved');
  setTimeout(() => ($('saved').textContent = ''), 1500);
}

['US', 'NL', 'autoSync', 'ttlHours', 'lang'].forEach((id) => $(id).addEventListener('change', save));
$('save').addEventListener('click', save);
$('sync').addEventListener('click', async () => { await save(); await api.runtime.sendMessage({ type: 'sync' }); render(); });
api.storage.onChanged.addListener(render);
loadSettings().then(render);
