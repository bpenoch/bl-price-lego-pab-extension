// LEGO 官方顏色編號（PAB facets.color.key）→ BrickLink 顏色編號／名稱／色碼。
// 沒列在這裡的顏色，會以「同一個零件在 BrickLink 頁面選的顏色名稱」做名稱比對，
// 或在彈出視窗的「顏色對照」裡手動補上。
// [LEGO ID, BrickLink ID, BrickLink 名稱, 色碼]
const BLPAB_COLOR_TABLE = [
  [1, 1, 'White', '#FFFFFF'],
  [5, 2, 'Tan', '#E4CD9E'],
  [9, 23, 'Pink', '#FECCCF'],
  [18, 28, 'Nougat', '#D09168'],
  [21, 5, 'Red', '#C91A09'],
  [23, 7, 'Blue', '#0055BF'],
  [24, 3, 'Yellow', '#F2CD37'],
  [26, 11, 'Black', '#05131D'],
  [28, 6, 'Green', '#237841'],
  [29, 37, 'Medium Green', '#73DCA1'],
  [37, 36, 'Bright Green', '#4B9F4A'],
  [38, 68, 'Dark Orange', '#A95500'],
  [107, 39, 'Dark Turquoise', '#008F9B'],
  [45, 62, 'Light Blue', '#B4D2E3'],
  [102, 42, 'Medium Blue', '#5A93DB'],
  [104, 24, 'Purple', '#81007B'],
  [106, 4, 'Orange', '#FE8A18'],
  [119, 34, 'Lime', '#BBE90B'],
  [124, 71, 'Magenta', '#923978'],
  [135, 55, 'Sand Blue', '#6074A1'],
  [138, 69, 'Dark Tan', '#958A73'],
  [140, 63, 'Dark Blue', '#0A3463'],
  [141, 80, 'Dark Green', '#184632'],
  [151, 48, 'Sand Green', '#A0BCAC'],
  [154, 59, 'Dark Red', '#720E0F'],
  [191, 110, 'Bright Light Orange', '#F8BB3D'],
  [192, 88, 'Reddish Brown', '#582A12'],
  [194, 86, 'Light Bluish Gray', '#A0A5A9'],
  [199, 85, 'Dark Bluish Gray', '#6C6E68'],
  [208, 99, 'Very Light Bluish Gray', '#E6E3DA'],
  [212, 105, 'Bright Light Blue', '#9FC3E9'],
  [221, 47, 'Dark Pink', '#C870A0'],
  [222, 104, 'Bright Pink', '#E4ADC8'],
  [226, 103, 'Bright Light Yellow', '#FFF03A'],
  [268, 89, 'Dark Purple', '#3F3691'],
  [283, 90, 'Light Nougat', '#F6D7B3'],
  [308, 120, 'Dark Brown', '#352100'],
  [312, 150, 'Medium Nougat', '#AA7D55'],
  [321, 153, 'Dark Azure', '#078BC9'],
  [322, 156, 'Medium Azure', '#36AEBF'],
  [323, 152, 'Light Aqua', '#ADC3C0'],
  [324, 157, 'Medium Lavender', '#AC78BA'],
  [325, 154, 'Lavender', '#E1D5ED'],
  [326, 158, 'Yellowish Green', '#DFEEA5'],
  [330, 155, 'Olive Green', '#9B9A5A'],
  [353, 220, 'Coral', '#FF698F'],
  // 以下 5 色由 BrickLink catalogColors 頁面確認（v1.2 測試）
  [402, 167, 'Reddish Orange', '#CA4C0B'],
  [368, 236, 'Neon Yellow', '#FFF700'],
  [430, 175, 'Warm Pink', '#F785B1'],
  [371, 241, 'Medium Tan', '#CC9F6E'],
  [431, 174, 'Blue Violet', '#4354A3'],
  // v1.3 測試由 BrickLink 顏色表確認
  [129, 102, 'Glitter Trans-Purple', '#A5A5CB'],
  [366, 232, 'Satin Trans-Dark Blue', '#0020A0'],
  [336, 67, 'Metallic Silver', '#A5A9B4'],
  // 以下來自使用者的 data/lego_bl_color_map.json，status = to_confirm（第 5 欄 true = 待確認）
  [362, 223, 'Satin Trans-Light Blue', '#AEEFEC', true],
  [365, 230, 'Satin Trans-Purple', '#A5A5CB', true],
  [367, 233, 'Satin Trans-Bright Green', '#D9E4A7', true],
  // v1.7 測試：4073 的 LEGO #360 Transparent W/ Opalescence（待確認）
  [360, 228, 'Satin Trans-Clear', '#F2F2F2', true],
  // data/lego_bl_color_map.json 2026-11-27 更新（待確認）
  [375, 251, 'Trans-Black', '#3A3A3A', true],
  [40, 12, 'Trans-Clear', '#EEEEEE'],
  [41, 17, 'Trans-Red', '#C91A09'],
  [42, 15, 'Trans-Light Blue', '#AEEFEC'],
  [43, 14, 'Trans-Dark Blue', '#0020A0'],
  [44, 19, 'Trans-Yellow', '#F5CD2F'],
  [47, 18, 'Trans-Neon Orange', '#FF800D'],
  [48, 20, 'Trans-Green', '#84B68D'],
  [49, 16, 'Trans-Neon Green', '#F8F184'],
  [111, 13, 'Trans-Brown', '#635F52'],   // BrickLink 已把 13 改名為 Trans-Brown
  [113, 50, 'Trans-Dark Pink', '#DF6695'],
  [126, 51, 'Trans-Purple', '#A5A5CB'],
  [143, 74, 'Trans-Medium Blue', '#CFE2F7'],
  [182, 98, 'Trans-Orange', '#F08F1C'],
  [311, 108, 'Trans-Bright Green', '#D9E4A7'],
  [294, 118, 'Glow In Dark Trans', '#BDC6AD'],
  [329, 159, 'Glow In Dark White', '#F5F3D7'],
  [297, 115, 'Pearl Gold', '#AA7F2E'],
  [315, 95, 'Flat Silver', '#898788'],
  [316, 77, 'Pearl Dark Gray', '#575857'],
];

// 沒列在表上的顏色：用 LEGO 名稱比對 BrickLink 顏色表（BrickLink 新顏色多半直接沿用 LEGO 名稱，例如 Reddish Orange、Warm Tan）
// 正規化名稱，用來比對 LEGO 與 BrickLink 顏色名稱
function blpabNorm(s) {
  return String(s || '').toLowerCase().replace(/transparent|tr\.\s*/g, 'trans-').replace(/gr[ae]y/g, 'gray').replace(/[^a-z]/g, '');
}

function blpabBuildColorMaps(overrides) {
  const legoToBl = {}, blToLego = {}, hex = {};
  const all = BLPAB_COLOR_TABLE.map(r => r.slice());
  for (const [lego, bl] of Object.entries(overrides || {})) {
    const row = all.find(r => r[0] === Number(lego));
    if (row) row[1] = Number(bl); else all.push([Number(lego), Number(bl), '', '']);
  }
  for (const [lego, bl, name, h, tc] of all) {
    legoToBl[lego] = { id: bl, name, tc: !!tc };
    (blToLego[bl] = blToLego[bl] || []).push(lego);
    if (h) hex[lego] = h;
  }
  return { legoToBl, blToLego, hex };
}

// LEGO 顏色編號 → [GDS（Gobricks）色號, 中文名]，來源：20240311_GDS_STD_color_list_total.xlsx（表內更新日期 2022-10-4）
const BLPAB_GDS = {"1": [90, "白色"], "5": [31, "杏黄"], "21": [10, "大红"], "23": [50, "蓝色"], "24": [30, "黄色"], "26": [80, "黑色"], "28": [40, "绿色"], "37": [43, "果绿"], "38": [83, "咖啡"], "40": [180, "全透明"], "41": [110, "明红"], "42": [152, "明浅蓝"], "43": [150, "明蓝"], "44": [130, "明黄"], "48": [140, "明绿"], "49": [141, "明草绿"], "102": [52, "浅蓝"], "106": [21, "橙黄"], "111": [170, "明茶"], "113": [111, "明紫红"], "119": [42, "草绿"], "124": [13, "紫红"], "126": [160, "明紫"], "135": [54, "蓝灰"], "138": [34, "土黄"], "140": [55, "宝蓝"], "141": [47, "墨绿"], "151": [48, "渐绿"], "154": [14, "柿红"], "182": [120, "明橙"], "191": [36, "深黄"], "192": [81, "棕色"], "194": [71, "浅灰"], "199": [72, "深灰"], "212": [53, "粉蓝"], "221": [12, "桃红"], "222": [11, "粉红"], "226": [33, "牙黄"], "268": [60, "紫色"], "283": [32, "浅肉"], "297": [35, "金黄"], "308": [82, "棕枣"], "312": [84, "浅咖啡"], "315": [73, "浅银灰"], "321": [51, "天蓝"], "322": [46, "翠绿"], "323": [45, "粉绿"], "324": [62, "蓝光紫"], "325": [63, "浅紫"], "326": [44, "浅绿"], "330": [49, "马丁绿"]};
