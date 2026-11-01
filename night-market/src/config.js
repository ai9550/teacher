// 遊戲設定檔：改菜單、價格、平衡參數都在這裡，不用動其他程式。

// 攤位菜單（PRD 3.2.1）。cookSec = 出餐等待秒數；emoji 是暫時圖示，之後換成像素圖。
export const STALLS = [
  { id: 'tanghulu', stall: '糖葫蘆攤', food: '糖葫蘆', price: 10, cookSec: 0, emoji: '🍡', color: 0xd94a4a },
  { id: 'qq',       stall: '地瓜球攤', food: '地瓜球', price: 15, cookSec: 0, emoji: '🟠', color: 0xe8a33d },
  { id: 'sausage',  stall: '香腸攤',   food: '烤香腸', price: 20, cookSec: 1, emoji: '🌭', color: 0xb5523b },
  { id: 'ice',      stall: '剉冰攤',   food: '剉冰',   price: 25, cookSec: 1, emoji: '🍧', color: 0x6fb7d9 },
  { id: 'bubble',   stall: '飲料攤',   food: '珍珠奶茶', price: 30, cookSec: 0, emoji: '🧋', color: 0xc49a6c },
  { id: 'tofu',     stall: '臭豆腐攤', food: '臭豆腐', price: 35, cookSec: 2, emoji: '🧆', color: 0x8a6a3b },
  { id: 'chicken',  stall: '雞排攤',   food: '炸雞排', price: 40, cookSec: 2, emoji: '🍗', color: 0xd9a03d },
  { id: 'oyster',   stall: '蚵仔煎攤', food: '蚵仔煎', price: 45, cookSec: 3, emoji: '🍳', color: 0x7aa35a },
];

// 找零難度（PRD 3.5）
export const DIFFICULTY = {
  easy: {
    label: '簡單（低年級）',
    maxItems: 1,
    payOptions: [50, 100],
    orderTimeSec: [60, 80],
  },
  normal: {
    label: '普通（中年級）',
    maxItems: 2,
    payOptions: [100, 500],
    orderTimeSec: [45, 70],
  },
};

// 平衡參數（PRD 10）
export const BALANCE = {
  durationOptionsMin: [3, 5],
  exactPayChance: 0.1,        // 顧客剛好付整數、找 0 元的機率
  minOpenOrders: 2,           // 看板上至少保持幾張可接的單
  openOrdersPerPlayer: 1.5,
  spawnDelaySec: [1, 3],      // 補單間隔
  maxOrdersPerPlayer: 2,
  maxCarry: 3,
  playerSpeedTiles: 4,        // 每秒幾格
  basePayPerItem: 20,
  maxSpeedTip: 30,
  tipRateByAttempt: [1, 0.5, 0], // 第 1 次答對 100%、第 2 次 50%、之後 0%
  maxAttempts: 3,             // 第 3 次答錯就公布答案
  comboBonusStep: 5,
  comboBonusMax: 20,
  npcCount: 6,
  npcSpeedTiles: 1.5,
};

// 6 個角色（正式美術之前先用顏色區分）
export const CHARACTERS = [
  { id: 'char0', name: '小紅', color: 0xe74c3c },
  { id: 'char1', name: '小藍', color: 0x3498db },
  { id: 'char2', name: '小綠', color: 0x2ecc71 },
  { id: 'char3', name: '小黃', color: 0xf1c40f },
  { id: 'char4', name: '小紫', color: 0x9b59b6 },
  { id: 'char5', name: '小橘', color: 0xe67e22 },
];

export const CUSTOMER_NAMES = ['阿伯', '阿姨', '小妹妹', '大哥哥', '阿嬤', '叔叔', '姊姊', '小弟弟'];

// 像素尺寸：素材以 16px 繪製，遊戲中放大 3 倍
export const TILE = 16;
export const SCALE = 3;
export const T = TILE * SCALE; // 畫面上一格的像素
