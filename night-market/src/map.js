// 夜市地圖（每個字元 = 一格 16×16）
//  #  牆／建築      .  走道
//  A~H 攤位（對應 config.js 的 STALLS 第 1~8 個）
//  T  桌子          c  顧客座位（訂單會出現在這裡）
//  o  障礙物（垃圾桶、機車）
//  P  玩家出生點（走道）
export const MAP_ROWS = [
  '################################',
  '#..AAAA...BBBB...CCCC...DDDD...#',
  '#..AAAA...BBBB...CCCC...DDDD...#',
  '#..............................#',
  '#.........o.........o..........#',
  '###.....######....######.....###',
  '#..............................#',
  '#.cTTc....cTTc....cTTc....cTTc.#',
  '#..............................#',
  '#....cTTc....cTTc....cTTc......#',
  '#..............................#',
  '#.cTTc....cTTc....cTTc....cTTc.#',
  '#..............................#',
  '###.....######....######.....###',
  '#.........o.........o..........#',
  '#...............P..............#',
  '#..EEEE...FFFF...GGGG...HHHH...#',
  '#..EEEE...FFFF...GGGG...HHHH...#',
  '################################',
];

// 把字元地圖轉成遊戲要用的資料
export function parseMap(rows = MAP_ROWS) {
  const height = rows.length;
  const width = rows[0].length;
  const solids = [];   // { x, y, kind }
  const stallTiles = {}; // index -> [{x,y}]
  const tables = [];   // { id, x, y, len }
  const seats = [];    // { id, x, y, table }
  let spawn = { x: Math.floor(width / 2), y: height - 2 };

  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`地圖第 ${y} 行長度不對：${row.length}`);
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      if (ch === 'P') spawn = { x, y };
      else if (ch === '#') solids.push({ x, y, kind: 'wall' });
      else if (ch === 'o') solids.push({ x, y, kind: 'obstacle' });
      else if (ch === 'T') solids.push({ x, y, kind: 'table' });
      else if (ch >= 'A' && ch <= 'H') {
        const i = ch.charCodeAt(0) - 65;
        (stallTiles[i] ||= []).push({ x, y });
        solids.push({ x, y, kind: 'stall', stall: i });
      }
    }
    // 連續的 T 算一張桌子
    for (let x = 0; x < width; x++) {
      if (row[x] !== 'T' || row[x - 1] === 'T') continue;
      let len = 0;
      while (row[x + len] === 'T') len++;
      tables.push({ id: tables.length + 1, x, y, len });
    }
  });

  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      if (row[x] !== 'c') continue;
      const table = tables.find(t => t.y === y && (t.x - 1 === x || t.x + t.len === x));
      seats.push({ id: seats.length, x, y, table: table ? table.id : 0 });
    }
  });

  const stalls = Object.entries(stallTiles).map(([i, tiles]) => {
    const xs = tiles.map(t => t.x), ys = tiles.map(t => t.y);
    return {
      index: Number(i),
      x0: Math.min(...xs), y0: Math.min(...ys),
      x1: Math.max(...xs), y1: Math.max(...ys),
    };
  });

  return { width, height, rows, solids, stalls, tables, seats, spawn };
}
