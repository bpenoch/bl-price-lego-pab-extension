// 背景程式：排程同步 lego.com PAB 資料（在背景開一個 lego.com 分頁、讓 lego.js 抓完後關掉）。
const api = globalThis.browser || globalThis.chrome;

const SITE_URL = {
  US: 'https://www.lego.com/en-us/pick-and-build/pick-a-brick',
  NL: 'https://www.lego.com/nl-nl/pick-and-build/pick-a-brick',
};
const DEFAULT_SETTINGS = { sites: { US: true, NL: true }, ttlHours: 24, autoSync: true, colorOverrides: {}, aliases: {} };
const TAB_TIMEOUT_MS = 4 * 60 * 1000;

async function getSettings() {
  const { settings } = await api.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}), sites: { ...DEFAULT_SETTINGS.sites, ...((settings || {}).sites || {}) } };
}
async function getState() { return (await api.storage.local.get('syncState')).syncState || {}; }
async function setSiteState(site, patch) {
  const s = await getState();
  s[site] = { ...(s[site] || {}), ...patch, updated: Date.now() };
  await api.storage.local.set({ syncState: s });
}
async function getJobs() { return (await api.storage.local.get('syncJobs')).syncJobs || {}; }
async function setJobs(j) { await api.storage.local.set({ syncJobs: j }); }

let queue = Promise.resolve();
function enqueue(site) {
  queue = queue.then(() => runSite(site)).catch(() => {});
  return queue;
}

async function runSite(site) {
  await setSiteState(site, { status: 'running', done: 0, total: 0, error: null, started: Date.now() });
  const tab = await api.tabs.create({ url: SITE_URL[site], active: false });
  const jobs = await getJobs(); jobs[tab.id] = site; await setJobs(jobs);
  // 等這一站完成（syncDone）或逾時
  await new Promise((resolve) => {
    const timer = setTimeout(async () => {
      await finish(tab.id, site, { error: '逾時：lego.com 分頁沒有在 4 分鐘內完成（可能被要求驗證或選擇國家，請手動開一次 lego.com 再重試）' });
      resolve();
    }, TAB_TIMEOUT_MS);
    waiters[tab.id] = () => { clearTimeout(timer); resolve(); };
  });
}
const waiters = {};

async function finish(tabId, site, result) {
  const jobs = await getJobs(); delete jobs[tabId]; await setJobs(jobs);
  if (result.error) await setSiteState(site, { status: 'error', error: result.error });
  else await setSiteState(site, { status: 'ok', error: null, count: result.count, available: result.available, currency: result.currency, ts: Date.now() });
  try { await api.tabs.remove(tabId); } catch (e) {}
  if (waiters[tabId]) { waiters[tabId](); delete waiters[tabId]; }
}

async function isRunning(site) {
  const s = (await getState())[site];
  return s && s.status === 'running' && Date.now() - (s.started || 0) < TAB_TIMEOUT_MS + 10000;
}

async function syncSites(sites, force) {
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
    enqueue(site);
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
        if (sender.tab) await finish(sender.tab.id, msg.site, msg);
        return true;
      case 'sync': {
        const settings = await getSettings();
        const sites = msg.sites || Object.keys(settings.sites).filter(s => settings.sites[s]);
        return { started: await syncSites(sites, true) };
      }
      case 'ensureFresh': {
        const settings = await getSettings();
        if (!settings.autoSync) return { started: [] };
        return { started: await syncSites(Object.keys(settings.sites).filter(s => settings.sites[s]), false) };
      }
      default:
        return undefined;
    }
  })().then(sendResponse, (e) => sendResponse({ error: String(e) }));
  return true;
});

// 使用者自己把同步分頁關掉
api.tabs.onRemoved.addListener(async (tabId) => {
  const jobs = await getJobs();
  if (jobs[tabId]) await finish(tabId, jobs[tabId], { error: '同步分頁被關閉' });
});
