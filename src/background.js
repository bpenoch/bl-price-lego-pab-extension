// 背景程式：同步 lego.com PAB 資料。
// 1. 先試「直接連線」（不開分頁）；
// 2. 失敗就在背景開一個 lego.com 分頁，由 lego.js 在頁面裡抓，抓完自動關閉；
// 3. 分頁模式失敗（例如分頁被關掉、逾時）會自動再試一次。
importScripts('pab-fetch.js');
const api = globalThis.browser || globalThis.chrome;

const SITE_URL = {
  US: 'https://www.lego.com/en-us/pick-and-build/pick-a-brick',
  NL: 'https://www.lego.com/nl-nl/pick-and-build/pick-a-brick',
};
const GQL_URL = 'https://www.lego.com/api/graphql/PickABrickQuery';
const DEFAULT_SETTINGS = { sites: { US: true, NL: true }, ttlHours: 24, autoSync: true, colorOverrides: {}, aliases: {}, lang: 'auto' };
const TAB_TIMEOUT_MS = 4 * 60 * 1000;
const TAB_ATTEMPTS = 2;

async function getSettings() {
  const { settings } = await api.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}), sites: { ...DEFAULT_SETTINGS.sites, ...((settings || {}).sites || {}) } };
}
async function getState() { return (await api.storage.local.get('syncState')).syncState || {}; }
// 所有狀態寫入排隊執行，避免兩站同時同步時互相覆蓋（例如進度更新蓋掉「完成」）
let stateLock = Promise.resolve();
function setSiteState(site, patch) {
  stateLock = stateLock.then(async () => {
    const s = await getState();
    s[site] = { ...(s[site] || {}), ...patch, updated: Date.now() };
    await api.storage.local.set({ syncState: s });
  }).catch(() => {});
  return stateLock;
}
async function getJobs() { return (await api.storage.local.get('syncJobs')).syncJobs || {}; }
async function setJobs(j) { await api.storage.local.set({ syncJobs: j }); }

// 兩站同時同步（不再一站做完才做下一站）
function startSite(site, allowTab) { runSite(site, allowTab).catch(() => {}); }

async function runSite(site, allowTab = true) {
  await setSiteState(site, { status: 'running', done: 0, total: 0, error: null, started: Date.now(), attempt: 0, mode: 'direct' });
  // 1. 直接連線
  try {
    const data = await blpabFetchSite(site, GQL_URL, (done, total) => setSiteState(site, { done, total }), 1);
    await stateLock;
    if (!data.count) throw new Error('沒有資料');
    await api.storage.local.set({ ['pab_' + site]: data });
    await setSiteState(site, { status: 'ok', error: null, count: data.count, available: data.available, currency: data.currency, ts: Date.now(), mode: 'direct' });
    return;
  } catch (e) {
    if (!allowTab) { await setSiteState(site, { status: 'idle' }); return; }   // 背景排程只用直接連線，不自己開分頁
  }
  // 2. 分頁模式（含自動重試）
  let result;
  for (let attempt = 1; attempt <= TAB_ATTEMPTS; attempt++) {
    await setSiteState(site, { status: 'running', done: 0, total: 0, started: Date.now(), attempt, mode: 'tab' });
    result = await runTab(site);
    if (!result.error) break;
  }
  if (result.error) await setSiteState(site, { status: 'error', error: result.error });
  else await setSiteState(site, { status: 'ok', error: null, count: result.count, available: result.available, currency: result.currency, ts: Date.now(), mode: 'tab' });
}

const waiters = {};
async function runTab(site) {
  const tab = await api.tabs.create({ url: SITE_URL[site], active: false });
  const jobs = await getJobs(); jobs[tab.id] = site; await setJobs(jobs);
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(tab.id, { error: 'timeout' }), TAB_TIMEOUT_MS);
    waiters[tab.id] = (r) => { clearTimeout(timer); resolve(r); };
  });
}

async function finish(tabId, result) {
  const jobs = await getJobs();
  if (!jobs[tabId]) return;
  delete jobs[tabId]; await setJobs(jobs);
  try { await api.tabs.remove(tabId); } catch (e) {}
  if (waiters[tabId]) { waiters[tabId](result); delete waiters[tabId]; }
}

async function isRunning(site) {
  const s = (await getState())[site];
  return s && s.status === 'running' && Date.now() - (s.started || 0) < TAB_TIMEOUT_MS + 10000;
}

async function syncSites(sites, force, allowTab = true) {
  const settings = await getSettings();
  const started = [];
  for (const site of sites) {
    if (!SITE_URL[site] || await isRunning(site)) continue;
    if (!force) {
      const data = (await api.storage.local.get('pab_' + site))['pab_' + site];
      if (data && Date.now() - data.ts < settings.ttlHours * 3600e3) continue;
      const st = (await getState())[site];
      if (st && st.status === 'error' && Date.now() - (st.updated || 0) < 30 * 60e3) continue; // 失敗後 30 分鐘內不自動重試
    }
    started.push(site);
    startSite(site, allowTab);
  }
  return started;
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg && msg.type) {
      case 'legoReady': {
        const jobs = await getJobs();
        return sender.tab && jobs[sender.tab.id] ? { site: jobs[sender.tab.id] } : {};
      }
      case 'syncProgress':
        await setSiteState(msg.site, { status: 'running', done: msg.done, total: msg.total });
        return true;
      case 'syncDone':
        if (sender.tab) await finish(sender.tab.id, msg);
        return true;
      case 'sync': {
        const settings = await getSettings();
        const sites = msg.sites || Object.keys(settings.sites).filter((s) => settings.sites[s]);
        return { started: await syncSites(sites, true) };
      }
      case 'ensureFresh': {
        updateFx();
        const settings = await getSettings();
        if (!settings.autoSync) return { started: [] };
        return { started: await syncSites(Object.keys(settings.sites).filter((s) => settings.sites[s]), false) };
      }
      default:
        return undefined;
    }
  })().then(sendResponse, (e) => sendResponse({ error: String(e) }));
  return true;
});

// 同步分頁被關掉（使用者或其他工具關的）→ 這次失敗，runSite 會自動再試一次
api.tabs.onRemoved.addListener(async (tabId) => {
  const jobs = await getJobs();
  if (jobs[tabId]) await finish(tabId, { error: 'tab_closed' });
});

// ---------- 歐元→美元匯率（歐洲央行，經 frankfurter.app；每天更新一次） ----------
async function updateFx(force) {
  const { fx } = await api.storage.local.get('fx');
  if (!force && fx && Date.now() - fx.fetched < 20 * 3600e3) return;
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');
    const j = await r.json();
    if (j && j.rates && j.rates.USD) await api.storage.local.set({ fx: { rate: j.rates.USD, date: j.date, fetched: Date.now() } });
  } catch (e) { /* 沒有匯率就不顯示換算 */ }
}

// ---------- 背景定時更新：每 3 小時檢查一次，資料過期就用直接連線更新（不開分頁） ----------
function ensureAlarm() { api.alarms.create('blpab-refresh', { periodInMinutes: 180, delayInMinutes: 1 }); }
api.runtime.onInstalled.addListener(ensureAlarm);
api.runtime.onStartup.addListener(ensureAlarm);
api.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== 'blpab-refresh') return;
  updateFx();
  const settings = await getSettings();
  if (settings.autoSync) syncSites(Object.keys(settings.sites).filter((s) => settings.sites[s]), false, false);
});
