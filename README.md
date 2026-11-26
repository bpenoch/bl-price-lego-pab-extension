# BrickLink × LEGO PAB 價格（Chrome／Safari 擴充功能）

在 BrickLink 上看零件時，直接顯示 LEGO.com Pick a Brick 的各顏色價格、庫存與限購。

## 會出現在哪裡

| BrickLink 頁面 | 顯示 |
|---|---|
| 零件頁 `catalogitem.page?P=1751` | 右側浮動面板：lego.com 上這個零件的**所有顏色**，美國站（USD）與荷蘭站（EUR）各一欄；目前在 BrickLink 選的顏色會標黃並置頂 |
| 分類清單 `catalogList.asp?catType=P…`、搜尋結果 | 零件編號旁的小標籤：`US $0.58–0.70 · 9色｜NL €0.60 · 9色`；點一下展開各顏色明細 |

每個價格旁的標籤：

- **Bestseller**（藍）：約 5（美國）／8（荷蘭）個工作天出貨；**Standard**（灰）：最長 28 個工作天
- **限購 999**（綠，≥500）、**限購 50**（橘，50–499）、**限購 10**（紅，<50）：lego.com 每筆訂單上限
- **缺貨**：價格會加刪除線
- 荷蘭站價格含 21% 增值稅

## 資料怎麼來

第一次打開 BrickLink（或資料超過有效時間，預設 24 小時）時，擴充功能會在背景開一個 lego.com Pick a Brick 分頁，
用網站自己的搜尋 API 一次抓完全部零件（每站約 1.8 萬筆，30–60 秒），存在瀏覽器本機，然後自動關掉分頁。
之後查價都是讀本機資料，不會每頁都連 lego.com。只讀，不加入購物車、不登入。

點工具列圖示可以：看兩站的同步時間與筆數、手動「立即更新」、開關站別、改有效時間，
以及補「編號對照」（BrickLink 編號 ≠ LEGO Design ID，例如 `4073=6141`）和「顏色對照」（LEGO 顏色編號 = BrickLink 顏色編號）。

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

- 顏色是用內建的 LEGO→BrickLink 顏色表對照（約 60 個常用色）。面板上顯示「BL 無對照」的顏色會列出 LEGO 顏色編號，可在彈出視窗補上。
- BrickLink 零件頁的顏色是從網址的 `C=`（例如 `#T=P&C=1`）讀取；沒選顏色時只列全部顏色、不標黃。
- 若 lego.com 改版導致抓不到（彈出視窗顯示「同步失敗」），需要更新 `src/lego.js` 裡的 GraphQL 查詢。
