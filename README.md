# BrickLink × LEGO PAB 價格 / Prices

Chrome／Safari 擴充功能：在 BrickLink 上看零件時，直接顯示 LEGO.com Pick a Brick 的各顏色價格、庫存、限購，並和 BrickLink 價格比較。
A Chrome/Safari extension that shows LEGO.com Pick a Brick prices, stock and order limits for every colour while you browse BrickLink, and compares them with BrickLink prices.

[中文](#中文) · [English](#english)

---

## 中文

### 會出現在哪裡

| BrickLink 頁面 | 顯示 |
|---|---|
| 零件頁 `catalogitem.page?P=1751` | 浮動面板（可拖曳、可收合）：①大字結論「PAB 便宜 34% → 建議去 PAB 買」②目前顏色在美國站／荷蘭站的價格 ③BrickLink 現貨 New Qty Avg 與近 6 月成交 ④每站一行摘要（同價顏色合併）⑤「展開全部顏色」看完整表格 |
| 分類清單、搜尋結果 | 零件編號旁的精簡標籤 `$0.58+ · 9色`，滑鼠移上去看兩站，點一下展開明細；清單上方可勾「只看 lego.com PAB 有賣」 |

- 價格可以點，會在 lego.com 用 Element ID 搜尋該零件
- **Bestseller**（藍）：熱銷件，美國約 5、荷蘭約 8 個工作天；**Standard**（灰）：最長 28 個工作天（美國站自 2026-11 起暫停 Standard）
- **限購 999**（綠，≥500）、**限購 50**（橘，50–499）、**限購 10**（紅，<50）；lego.com 沒回傳數量時不顯示
- **零件編號不同**：自動使用 BrickLink 零件頁上的 **Alternate Item No**（例如 3006 → LEGO 92538），藍色提示；內建對照（4073 = 6141）也是藍色。只有去掉字尾推測的（3069a → 3069）才是黃色警告，清單標籤前加「≈」
- **顏色**：內建約 60 色 LEGO→BrickLink 對照，其他新顏色用名稱比對 BrickLink 顏色表（標「名稱推定」）。還是對不到的，在面板「BL 無對照」旁按「設定對照」輸入 BrickLink 顏色編號
- 視窗寬度小於 1100px 時，面板每次都先收合；面板拖到哪都會留在視窗內
- 荷蘭站價格含 21% 增值稅

### 資料怎麼來

- **lego.com**：第一次打開 BrickLink（或資料超過 24 小時）時自動同步。先直接連線；不行就在背景開一個 lego.com 分頁抓（每站 30–60 秒），抓完自動關閉，**請不要手動關掉它**。分頁被關掉或逾時會自動再試一次。只讀，不加入購物車、不登入。
- **BrickLink 價格**：選了顏色時讀 BrickLink 舊版價格指南（`catalogPG.asp`），只讀目前顏色。必須是 USD 才會算 %；第一次讀到別的幣別會自動再讀一次。
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
| Part page `catalogitem.page?P=1751` | A floating panel you can drag and collapse: ① a verdict in large type, e.g. "PAB is 34% cheaper → buy on PAB" ② the selected colour's price on the US and NL sites ③ BrickLink for-sale New qty avg and last-6-months sold ④ one summary line per site (colours with the same price grouped) ⑤ "Show all colours" for the full table |
| Category lists, search results | A short tag next to each part number, e.g. `$0.58+ · 9c`; hover for both sites, click for every colour. A checkbox above the list shows only parts sold on PAB. |

- Prices are links that search lego.com for that element ID.
- **Bestseller** (blue) ships in about 5 (US) / 8 (NL) business days; **Standard** (grey) in up to 28 (paused on the US site since Nov 2026).
- **Max 999** (green, ≥500), **Max 50** (orange, 50–499), **Max 10** (red, <50): the per-order limit. Hidden when lego.com does not return one.
- **Different part numbers**: the **Alternate Item No** on the BrickLink part page is used automatically (e.g. 3006 → LEGO 92538) and shown as a blue note, as are built-in matches (4073 = 6141). Only fallbacks made by dropping a suffix (3069a → 3069) show a yellow warning, and their list tags start with "≈".
- **Colours**: about 60 built-in LEGO→BrickLink matches; newer colours are matched by name against BrickLink's colour list ("matched by name"). For anything still unmatched, click "Set match" next to "no BL match" and enter the BrickLink colour ID.
- On windows narrower than 1100 px the panel starts collapsed, and it always stays inside the window.
- NL prices include 21% VAT.

### Where the data comes from

- **lego.com**: synced automatically the first time you open BrickLink, then whenever the data is older than 24 hours. It connects directly first; if that fails it opens a background lego.com tab (30–60 s per site) that closes by itself. **Please leave that tab open.** If it is closed or times out, the sync retries once. Read-only: nothing is added to a cart and nobody is signed in.
- **BrickLink prices**: when a colour is selected, the old BrickLink price guide (`catalogPG.asp`) is read for that colour only. The % is only worked out for USD prices; if another currency comes back the first time, it reads again.
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
