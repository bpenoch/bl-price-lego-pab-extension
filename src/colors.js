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
  [40, 12, 'Trans-Clear', '#EEEEEE'],
  [41, 17, 'Trans-Red', '#C91A09'],
  [42, 15, 'Trans-Light Blue', '#AEEFEC'],
  [43, 14, 'Trans-Dark Blue', '#0020A0'],
  [44, 19, 'Trans-Yellow', '#F5CD2F'],
  [47, 18, 'Trans-Neon Orange', '#FF800D'],
  [48, 20, 'Trans-Green', '#84B68D'],
  [49, 16, 'Trans-Neon Green', '#F8F184'],
  [111, 13, 'Trans-Black', '#635F52'],
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
  for (const [lego, bl, name, h] of all) {
    legoToBl[lego] = { id: bl, name };
    (blToLego[bl] = blToLego[bl] || []).push(lego);
    if (h) hex[lego] = h;
  }
  return { legoToBl, blToLego, hex };
}
