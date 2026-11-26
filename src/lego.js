// 在 lego.com Pick a Brick 頁面執行：只有當背景程式把這個分頁標記為「同步用分頁」時才會抓資料。
// 只讀：不加入購物車、不登入。抓取邏輯在 pab-fetch.js。
(() => {
  const api = globalThis.browser || globalThis.chrome;
  api.runtime.sendMessage({ type: 'legoReady' }).then(async (job) => {
    if (!job || !job.site) return;            // 一般瀏覽，不做任何事
    try {
      const data = await blpabFetchSite(job.site, '/api/graphql/PickABrickQuery',
        (done, total) => api.runtime.sendMessage({ type: 'syncProgress', site: job.site, done, total }).catch(() => {}));
      await api.storage.local.set({ ['pab_' + job.site]: data });
      await api.runtime.sendMessage({ type: 'syncDone', site: job.site, count: data.count, available: data.available, currency: data.currency, mode: 'tab' });
    } catch (e) {
      await api.runtime.sendMessage({ type: 'syncDone', site: job.site, error: String((e && e.message) || e) });
    }
  }).catch(() => {});
})();
