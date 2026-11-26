# BrickLink × LEGO PAB 價格（Chrome／Safari 擴充功能）

在 BrickLink 上看零件時，直接顯示 LEGO.com Pick a Brick 的各顏色價格、庫存與限購。

## 會出現在哪裡

| BrickLink 頁面 | 顯示 |
|---|---|
| 零件頁 `catalogitem.page?P=1751` | 浮動面板（可拖曳、可收合）：①目前顏色在美國站／荷蘭站的價格＋ BrickLink 現貨 New Qty Avg 與「PAB 便宜／貴 X%」②每站一行結論（同價顏色合併，例外才列出）③「展開全部顏色」看完整表格 |
| 分類清單 `catalogList.asp?catType=P…`、搜尋結果 | 零件編號旁的精簡標籤 `$0.58–0.70 · 9色`，滑鼠移上去看兩站，點一下展開明細；左下角可勾「只看 lego.com PAB 有賣」 |

- 價格可以點，會在 lego.com 用 Element ID 搜尋該零件
- **Bestseller**（藍）：熱銷件，美國約 5、荷蘭約 8 個工作天出貨；**Standard**（灰）：最長 28 個工作天（美國站自 2026-11 起暫停 Standard，所以美國站目前應該全部是 Bestseller）
- **限購 999**（綠，≥500）、**限購 50**（橘，50–499）、**限購 10**（紅，<50）；lego.com 沒回傳數量時顯示「限購 —／未提供」
- **缺貨**：價格加刪除線；**PAB 無**：lego.com 沒有這個零件
- 標籤前面有 **≈**、面板有黃色警告：lego.com 沒有這個 BrickLink 編號，用的是去掉字尾（3069a → 3069）或對照表的資料
- 視窗寬度小於 1100px 時，面板預設收合
- 荷蘭站價格含 21% 增值稅

## 資料怎麼來

- **lego.com**：第一次打開 BrickLink（或資料超過有效時間，預設 24 小時）時自動同步。先直接連線 lego.com；不行的話會在背景開一個 lego.com 分頁抓（每站約 30–60 秒），抓完自動關閉。分頁被關掉或逾時會自動再試一次。只讀，不加入購物車、不登入。
- **BrickLink 價格**：在零件頁選了顏色時，讀 BrickLink 舊版價格指南（`catalogPG.asp`，用你自己的登入狀態），只讀目前顏色。
- **BrickLink 顏色表**：每 30 天讀一次 `catalogColors.asp`。內建表沒有的 LEGO 新顏色，會用名稱比對 BrickLink 顏色（標「名稱推定」）。

點工具列圖示可以：看兩站的同步時間、筆數、有限購數量的筆數；手動「立即更新」；開關站別、改有效時間；補「編號對照」（例如 `4073=6141`）和「顏色對照」（LEGO 顏色編號 = BrickLink 顏色編號）。

## 安裝：Google Chrome（也適用 Edge、Brave）

1. 解壓縮 `bl-lego-pab-extension.zip`
2. 開 `chrome://extensions`，右上角開啟「開發人員模式」
3. 「載入未封裝項目」→ 選解壓後的 `bl-lego-pab-extension` 資料夾
4. 打開任一 BrickLink 零件頁，第一次會看到「正在背景同步」，約一分鐘後面板就有資料

## 安裝：Safari（macOS，需要 Xcode）

```bash
xcrun safari-web-extension-converter ~/Downloads/bl-lego-pab-extension --app-name "BL PAB" --macos-only
```

1. Xcode 會自動開啟專案，按 ▶︎ Run（Signing 選自己的 Apple ID / Personal Team）
2. Safari →「設定」→「進階」勾選「在選單列中顯示網頁開發者功能」，再到「開發」選單勾「允許未簽署的延伸功能」
3. Safari →「設定」→「延伸功能」勾選 **BL PAB**，並對 bricklink.com 與 lego.com 選「永遠允許」
4. Safari 若阻擋背景分頁，可以先手動打開一次 lego.com Pick a Brick，再從工具列按「立即更新」

## 注意

- 若 lego.com 改版導致抓不到（面板出現紅色「同步失敗」），需要更新 `src/pab-fetch.js` 裡的 GraphQL 查詢。
- BrickLink 價格比較只在 BrickLink 顯示幣別是 US 時算百分比。
