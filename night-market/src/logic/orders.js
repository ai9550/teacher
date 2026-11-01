// 訂單規則（純函式）：房主用來產生／判定逾時，所有玩家用來算剩餘時間
import { DIFFICULTY, BALANCE, CUSTOMER_NAMES } from '../config.js';
import { makeBill, randInt } from './checkout.js';

// 結帳中的訂單暫停倒數；但結帳太久（例如玩家斷線）還是會被收掉
const STUCK_CHECKOUT_MS = 60000;

export function openTarget(playerCount) {
  return Math.max(BALANCE.minOpenOrders, Math.ceil(playerCount * BALANCE.openOrdersPerPlayer));
}

export function createOrder({ seats, orders, difficulty, now }) {
  const used = new Set(orders.map(o => o.seat));
  const free = seats.filter(s => !used.has(s.id));
  if (!free.length) return null;
  const seat = free[Math.floor(Math.random() * free.length)];
  const [minT, maxT] = DIFFICULTY[difficulty].orderTimeSec;
  const timeLimit = randInt(minT, maxT) * 1000;
  return {
    seat: seat.id,
    table: seat.table,
    customer: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
    look: randInt(0, 3),
    ...makeBill(difficulty),
    createdAt: now,
    timeLimit,
    expiresAt: now + timeLimit,
  };
}

export function remainFrac(order, now) {
  const t = order.pausedAt ?? now;
  return Math.max(0, Math.min(1, (order.expiresAt - t) / order.timeLimit));
}

export function isExpired(order, now) {
  if (order.pausedAt) return now > order.pausedAt + STUCK_CHECKOUT_MS;
  return now >= order.expiresAt;
}

export function nextSpawnDelay() {
  const [a, b] = BALANCE.spawnDelaySec;
  return randInt(a * 1000, b * 1000);
}
