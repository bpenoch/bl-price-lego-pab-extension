const api = globalThis.browser || globalThis.chrome;
const LABEL = { US: '美國站', NL: '荷蘭站' };
const DEF = { sites: { US: true, NL: true }, ttlHours: 24, autoSync: true, colorOverrides: {}, aliases: {} };
const $ = (id) => document.getElementById(id);

function parsePairs(text) {
  const o = {};
  for (const line of text.split('\n')) {
    const m = line.split(/[=:\t]/).map((s) => s.trim());
    if (m.length >= 2 && m[0] && m[1]) o[m[0]] = m[1];
  }
  return o;
}
const pairs = (o) => Object.entries(o || {}).map(([k, v]) => `${k}=${v}`).join('\n');

async function render() {
  const r = await api.storage.local.get(['settings', 'syncState', 'pab_US', 'pab_NL']);
  const st = r.syncState || {};
  $('status').innerHTML = ['US', 'NL'].map((s) => {
    const d = r['pab_' + s], x = st[s] || {};
    let t;
    if (x.status === 'running') t = `同步中 ${x.total ? Math.round(100 * x.done / x.total) + '%' : '…'}`;
    else if (d) t = `${new Date(d.ts).toLocaleString()}${x.mode === 'direct' ? '（直接連線）' : x.mode === 'tab' ? '（分頁模式）' : ''}<br>${d.count.toLocaleString()} 筆，可購買 ${d.available.toLocaleString()}（${d.currency}）<br>有限購數量的 ${d.withMax == null ? '—' : d.withMax.toLocaleString()} 筆`;
    else t = '尚未同步';
    if (x.status === 'error') t += `<br><span class="err">上次失敗：${x.error}</span>`;
    return `<div class="site"><b>${LABEL[s]}</b><span class="st">${t}</span></div>`;
  }).join('');
}

async function loadSettings() {
  const s = { ...DEF, ...((await api.storage.local.get('settings')).settings || {}) };
  s.sites = { ...DEF.sites, ...(s.sites || {}) };
  $('US').checked = s.sites.US; $('NL').checked = s.sites.NL;
  $('autoSync').checked = s.autoSync; $('ttlHours').value = s.ttlHours;
  $('aliases').value = pairs(s.aliases); $('colors').value = pairs(s.colorOverrides);
}

async function save() {
  const settings = {
    sites: { US: $('US').checked, NL: $('NL').checked },
    autoSync: $('autoSync').checked,
    ttlHours: Math.max(1, Number($('ttlHours').value) || 24),
    aliases: parsePairs($('aliases').value),
    colorOverrides: parsePairs($('colors').value),
  };
  await api.storage.local.set({ settings });
  $('saved').textContent = '已儲存';
  setTimeout(() => ($('saved').textContent = ''), 1500);
}

['US', 'NL', 'autoSync', 'ttlHours'].forEach((id) => $(id).addEventListener('change', save));
$('save').addEventListener('click', save);
$('sync').addEventListener('click', async () => { await save(); await api.runtime.sendMessage({ type: 'sync' }); render(); });
api.storage.onChanged.addListener(render);
loadSettings(); render();
