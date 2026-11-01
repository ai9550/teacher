// 找零題目與計分（純函式，之後多人版也共用）
import { STALLS, DIFFICULTY, BALANCE } from '../config.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// 依難度隨機產生餐點與付款金額，保證付款 ≥ 總價、找零不為負
export function makeBill(difficulty) {
  const d = DIFFICULTY[difficulty];
  const count = randInt(1, d.maxItems);
  const items = Array.from({ length: count }, () => pick(STALLS).id);
  const total = items.reduce((sum, id) => sum + stallById(id).price, 0);
  let paid;
  if (Math.random() < BALANCE.exactPayChance) {
    paid = total;
  } else {
    paid = pick(d.payOptions.filter(p => p > total));
  }
  return { items, total, paid, change: paid - total };
}

export function stallById(id) {
  return STALLS.find(s => s.id === id);
}

// 送達收入：基本報酬 + 速度小費 × 答對次數係數 + 連擊加成
export function calcPayout({ itemCount, remainFrac, attempt, combo }) {
  const base = itemCount * BALANCE.basePayPerItem;
  const rate = BALANCE.tipRateByAttempt[Math.min(attempt - 1, BALANCE.tipRateByAttempt.length - 1)] ?? 0;
  const speedTip = Math.round((BALANCE.maxSpeedTip * Math.max(0, remainFrac) * rate) / 5) * 5;
  const comboBonus = attempt === 1
    ? Math.min(BALANCE.comboBonusMax, Math.max(0, combo - 1) * BALANCE.comboBonusStep)
    : 0;
  return { base, speedTip, comboBonus, total: base + speedTip + comboBonus };
}
