// 路人 NPC：用房號當亂數種子、用伺服器時間算位置，所有玩家看到的人潮一模一樣
import { BALANCE } from '../config.js';

const NPC_ROWS = [3, 6, 8, 10, 12, 15]; // 地圖上沒有桌子的走道列

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 找出某一列包含 x 的可走區段
function walkRun(row, x) {
  let a = x, b = x;
  const walkable = ch => ch === '.' || ch === 'P';
  while (walkable(row[a - 1])) a--;
  while (walkable(row[b + 1])) b++;
  return [a, b];
}

export function makeNpcPlan(rows, seedText) {
  const rand = mulberry32([...String(seedText)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
  return Array.from({ length: BALANCE.npcCount }, (_, i) => {
    const y = NPC_ROWS[Math.floor(rand() * NPC_ROWS.length)];
    const row = rows[y];
    let x;
    do { x = 1 + Math.floor(rand() * (row.length - 2)); } while (row[x] !== '.');
    const [a, b] = walkRun(row, x);
    return { look: i % 4, y, a, b, phase: rand(), speed: BALANCE.npcSpeedTiles * (0.7 + rand() * 0.6) };
  });
}

// 回傳第 t 毫秒時 NPC 的格子座標（x 可為小數）、速度（格／秒）與面向
export function npcAt(plan, t) {
  const len = plan.b - plan.a;
  if (len <= 0) return { x: plan.a, y: plan.y, vx: 0, flip: false };
  const period = 2 * len;
  const d = ((plan.phase * period + (plan.speed * t) / 1000) % period + period) % period;
  return d < len
    ? { x: plan.a + d, y: plan.y, vx: plan.speed, flip: false }
    : { x: plan.b - (d - len), y: plan.y, vx: -plan.speed, flip: true };
}
