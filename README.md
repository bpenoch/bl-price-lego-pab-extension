# BrickLink × LEGO PAB 價格 / Prices

Chrome／Safari 擴充功能：在 BrickLink 上看零件時，直接顯示 LEGO.com Pick a Brick 的各顏色價格、庫存、限購，並和 BrickLink 價格比較。
A Chrome/Safari extension that shows LEGO.com Pick a Brick prices, stock and order limits for every colour while you browse BrickLink, and compares them with BrickLink prices.

[中文](#中文) · [English](#english)

---

## 中文

### 會出現在哪裡

| BrickLink 頁面 | 顯示 |
|---|---|
| 零件頁 `catalogitem.page?P=1751` | 右下角的浮動面板（可拖曳、可收合成一行）：①大字結論「PAB 便宜 34% → 建議去 PAB 買」②三列比價表，每列只有「網站｜價格」：PAB 美國站、PAB 荷蘭站（附換算美元）、BrickLink 現貨 New，最便宜的標綠；出貨、限購等放在價格下方小字 ③Element ID 與「在 lego.com 開啟」④「看其他 N 個顏色」展開完整表格（每次都先收起） |
| 分類清單、搜尋結果 | 零件編號旁的價格標籤 `$0.58–0.70`（色數在提示框）。lego.com 找不到的零件會在背景查它的 Alternate Item No，滑鼠移上去看兩站，點一下展開明細；清單上方可勾「只看 lego.com PAB 有賣」 |

- 價格可以點，會在 lego.com 用 Element ID 搜尋該零件
- **Bestseller**（藍）：熱銷件，美國約 5、荷蘭約 8 個工作天；**Standard**（灰）：最長 28 個工作天（美國站自 2026-11 起暫停 Standard）
- **限購 999**（綠，≥500）、**限購 50**（橘，50–499）、**限購 10**（紅，<50）；lego.com 沒回傳數量時不顯示
- **零件編號不同**：自動使用 BrickLink 零件頁上的 **Alternate Item No**（例如 3006 → LEGO 92538），藍色提示；內建對照（4073 = 6141）也是藍色。只有去掉字尾推測的（3069a → 3069）才是黃色警告，清單標籤前加「≈」
- **GDS 色號**：目前顏色與顏色表會顯示對應的 GDS（Gobricks）色號與中文名，例如「GDS 10 大红」
- **顏色**：內建約 70 色 LEGO→BrickLink 對照，面板以 BrickLink 顏色名稱為主；其他新顏色用名稱比對 BrickLink 顏色表（標「名稱推定」）。還是對不到的，在「BL 無對照」旁按「設定對照」，從 BrickLink 顏色清單選或輸入編號
- **找零件的順序**：先用 BrickLink 編號本身；lego.com 沒有才用 Alternate Item No／內建對照；最後才去掉字尾推測
- 視窗寬度小於 1100px 時，面板每次都先收合；面板拖到哪都會留在視窗內
- 荷蘭站價格含 21% 增值稅

### 資料怎麼來

- **lego.com**：第一次打開 BrickLink（或資料超過 24 小時）時自動同步，兩站同時進行；另外每 3 小時在背景檢查一次，過期就用直接連線更新（背景更新不會開分頁）。有舊資料時先顯示舊資料，更新完自動換新。先直接連線；不行就在背景開一個 lego.com 分頁抓（每站 30–60 秒），抓完自動關閉，**請不要手動關掉它**。分頁被關掉或逾時會自動再試一次。只讀，不加入購物車、不登入。
- **匯率**：荷蘭站換算美元用歐洲央行匯率（frankfurter.app，每天更新），只是參考值，含增值稅。
- **BrickLink 價格**：選了顏色時讀 BrickLink 舊版價格指南（`catalogPG.asp`），只讀目前顏色，結果快取 6 小時。必須是 USD 才會算 %；第一次讀到別的幣別會自動再讀一次。
- **BrickLink 顏色表**：每 30 天讀一次 `catalogColors.asp`；讀取狀態顯示在工具列彈出視窗。

工具列彈出視窗：兩站同步時間、筆數、有限購數量的筆數、BrickLink 顏色表狀態；立即更新；站別、有效時間、**語言（中文／English）**；編號對照與顏色對照。

### 安裝：Google Chrome

1. 下載 zip（GitHub 上 Code → Download ZIP）並解壓縮，資料夾放在固定位置
2. `chrome://extensions` → 開啟「開發人員模式」→「載入未封裝項目」→ 選資料夾
3. **更新**：用新檔案覆蓋同一個資料夾，再到 `chrome://extensions` 按擴充功能上的 ↻

### 安裝：Safari（macOS，需要 Xcode）

```bash
xcrun safari-web-extension-converter ~/bl-price-lego-pab-extension --app-name "BL PAB" --macos-only
```

Xcode 開啟後按 ▶︎ Run → Safari「開發」選單勾「允許未簽署的延伸功能」→ Safari 設定「延伸功能」勾選 BL PAB，並對 bricklink.com、lego.com 選「永遠允許」。

---

## English

### Where it shows up

| BrickLink page | What you see |
|---|---|
| Part page `catalogitem.page?P=1751` | A floating panel in the bottom-right corner that you can drag, or collapse to a one-line bar: ① a verdict in large type, e.g. "PAB is 34% cheaper → buy on PAB" ② a three-row price table (PAB US, PAB NL with a USD conversion, BrickLink for-sale New with last-6-months sold as a note), cheapest row in green ③ element IDs and "Open on lego.com" ④ "Show the other N colours" for the full table (always starts hidden) |
| Category lists, search results | A price tag next to each part number, e.g. `$0.58–0.70` (colour count in the tooltip); parts not found on lego.com get their Alternate Item No looked up in the background; hover for both sites, click for every colour. A checkbox above the list shows only parts sold on PAB. |

- Prices are links that search lego.com for that element ID.
- **Bestseller** (blue) ships in about 5 (US) / 8 (NL) business days; **Standard** (grey) in up to 28 (paused on the US site since Nov 2026).
- **Max 999** (green, ≥500), **Max 50** (orange, 50–499), **Max 10** (red, <50): the per-order limit. Hidden when lego.com does not return one.
- **Different part numbers**: the **Alternate Item No** on the BrickLink part page is used automatically (e.g. 3006 → LEGO 92538) and shown as a blue note, as are built-in matches (4073 = 6141). Only fallbacks made by dropping a suffix (3069a → 3069) show a yellow warning, and their list tags start with "≈".
- **GDS colours**: the selected colour and the colour table show the matching GDS (Gobricks) colour number and Chinese name, e.g. "GDS 10 大红".
- **Colours**: about 70 built-in LEGO→BrickLink matches, and BrickLink colour names are shown first. Newer colours are matched by name against BrickLink's colour list ("matched by name"). For anything still unmatched, click "Set match" next to "no BL match" and pick a BrickLink colour or type its ID.
- **Lookup order**: the BrickLink number itself first; then Alternate Item Nos and built-in matches, only if lego.com has nothing under the number itself; dropping a suffix comes last.
- On windows narrower than 1100 px the panel starts collapsed, and it always stays inside the window.
- NL prices include 21% VAT.

### Where the data comes from

- **lego.com**: synced automatically the first time you open BrickLink, then whenever the data is older than 24 hours; both sites sync at the same time. Every 3 hours a background check refreshes stale data over a direct connection only (it never opens a tab). Older data stays on screen until the new data arrives. It connects directly first; if that fails it opens a background lego.com tab (30–60 s per site) that closes by itself. **Please leave that tab open.** If it is closed or times out, the sync retries once. Read-only: nothing is added to a cart and nobody is signed in.
- **Exchange rate**: the NL price in USD uses the European Central Bank rate (via frankfurter.app, updated daily). It is a reference value and includes VAT.
- **BrickLink prices**: when a colour is selected, the old BrickLink price guide (`catalogPG.asp`) is read for that colour only and cached for 6 hours. The % is only worked out for USD prices; if another currency comes back the first time, it reads again.
- **BrickLink colour list**: `catalogColors.asp` is read every 30 days; its status shows in the popup.

The toolbar popup shows each site's sync time, item counts, how many items have an order limit, and the colour-list status. It also lets you update now, choose sites, change how long data stays fresh, switch **language (中文 / English)**, and add part number and colour matches.

### Install: Google Chrome

1. Download the zip (on GitHub: Code → Download ZIP), unzip it, and keep the folder somewhere permanent.
2. Open `chrome://extensions`, turn on Developer mode, click "Load unpacked" and pick the folder.
3. **To update**: replace the folder's files with the new ones, then click ↻ on the extension in `chrome://extensions`.

### Install: Safari (macOS, needs Xcode)

```bash
xcrun safari-web-extension-converter ~/bl-price-lego-pab-extension --app-name "BL PAB" --macos-only
```

When Xcode opens, click ▶︎ Run. In Safari, tick "Allow Unsigned Extensions" in the Develop menu, enable BL PAB under Settings → Extensions, and choose "Always Allow" for bricklink.com and lego.com.

### Notes

- If lego.com changes and syncing fails (a red "sync failed" box in the panel), the GraphQL query in `src/pab-fetch.js` needs updating.
- Prices and stock are a snapshot from the last sync.
