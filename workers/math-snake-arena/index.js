import { DurableObject } from "cloudflare:workers";
const MATH_UNIT_OPTIONS = [
  { value: "all", label: "全部單元（第 1～9 單元隨機）" },
  { value: "u1", label: "第 1 單元：10000 以內的數" },
  { value: "u2", label: "第 2 單元：10000 以內的加減" },
  { value: "u3", label: "第 3 單元：毫米與數線" },
  { value: "u4", label: "第 4 單元：乘法" },
  { value: "u5", label: "第 5 單元：角與形狀" },
  { value: "u6", label: "第 6 單元：除法" },
  { value: "u7", label: "第 7 單元：公斤與公克" },
  { value: "u8", label: "第 8 單元：分數" },
  { value: "u9", label: "第 9 單元：列表與規律" }
];
function getMathUnitLabel(unit) {
  return MATH_UNIT_OPTIONS.find((u) => u.value === unit)?.label ?? "第 1～9 單元";
}
const GRID_WIDTH = 88;
const GRID_HEIGHT = 56;
const RESOURCES_PER_QUIZ = 30;
const TARGET_RESOURCES = 224;
const PLAYER_COLORS = [
  "#EF4444",
  // Red
  "#3B82F6",
  // Blue
  "#10B981",
  // Emerald
  "#F59E0B",
  // Amber
  "#8B5CF6",
  // Violet
  "#EC4899",
  // Pink
  "#06B6D4",
  // Cyan
  "#F97316"
  // Orange
];
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function makeNumericOptions(answer, candidates, format = (n) => String(n)) {
  const set = /* @__PURE__ */ new Set([answer]);
  for (const c of shuffle(candidates)) {
    if (set.size >= 4) break;
    if (c >= 0 && c !== answer) set.add(c);
  }
  while (set.size < 4) {
    const fallback = Math.max(0, answer + randInt(-10, 15));
    if (fallback !== answer) set.add(fallback);
  }
  return shuffle(Array.from(set)).map(format);
}
function buildQuestion(unit, prompt, answer, options) {
  return {
    id: crypto.randomUUID(),
    unit,
    unitLabel: getMathUnitLabel(unit),
    prompt,
    answer,
    options: shuffle(options)
  };
}
function genUnit1() {
  const kind = randInt(1, 4);
  if (kind === 1) {
    const th = randInt(1, 8);
    const hu = randInt(1, 9);
    const ans = th * 1e3 + hu * 100;
    return buildQuestion(
      "u1",
      `${th} 個千和 ${hu} 個百，合起來是多少？`,
      String(ans),
      makeNumericOptions(ans, [
        th * 1e3 + hu * 10,
        hu * 1e3 + th * 100,
        ans + 100,
        ans + 1e3,
        Math.max(100, ans - 100)
      ])
    );
  }
  if (kind === 2) {
    const k = randInt(1, 5);
    const h = randInt(1, 8);
    const ans = k * 1e3 + h * 100;
    return buildQuestion(
      "u1",
      `${k} 張 1000 元和 ${h} 張 100 元，共有幾元？`,
      `${ans} 元`,
      makeNumericOptions(
        ans,
        [ans + 100, ans - 100, ans + 1e3, k * 100 + h * 10],
        (n) => `${n} 元`
      )
    );
  }
  if (kind === 3) {
    const th = randInt(1, 9);
    const hu = randInt(0, 9);
    const te = randInt(0, 9);
    const on = randInt(0, 9);
    const num = th * 1e3 + hu * 100 + te * 10 + on;
    return buildQuestion(
      "u1",
      `數字 ${num} 中，「千位」數字是多少？`,
      String(th),
      makeNumericOptions(th, [hu, te, on, th % 9 + 1, Math.max(1, th - 1)])
    );
  }
  const base = randInt(2, 7) * 1e3;
  const nums = [
    base + randInt(10, 90),
    base + randInt(110, 390),
    base + randInt(410, 690),
    base + randInt(710, 980)
  ];
  const maxVal = Math.max(...nums);
  return buildQuestion(
    "u1",
    "下面哪一個數「最大」？",
    String(maxVal),
    nums.map(String)
  );
}
function genUnit2() {
  const kind = randInt(1, 3);
  if (kind === 1) {
    const a4 = randInt(10, 45) * 100;
    const b4 = randInt(5, 35) * 100;
    const ans2 = a4 + b4;
    return buildQuestion(
      "u2",
      `${a4} + ${b4} = ?`,
      String(ans2),
      makeNumericOptions(ans2, [ans2 + 100, ans2 - 100, ans2 + 1e3, ans2 - 200])
    );
  }
  if (kind === 2) {
    const a4 = randInt(30, 80) * 100;
    const b4 = randInt(5, 25) * 100;
    const ans2 = a4 - b4;
    return buildQuestion(
      "u2",
      `${a4} − ${b4} = ?`,
      String(ans2),
      makeNumericOptions(ans2, [ans2 + 100, ans2 - 100, ans2 + 200, ans2 + 1e3])
    );
  }
  const a1 = randInt(1, 4);
  const a2 = randInt(1, 4);
  const a3 = randInt(1, 4);
  const b1 = randInt(1, 4);
  const b2 = randInt(1, 4);
  const b3 = randInt(1, 4);
  const a = a1 * 1e3 + a2 * 100 + a3 * 10;
  const b = b1 * 1e3 + b2 * 100 + b3 * 10;
  const ans = a + b;
  return buildQuestion(
    "u2",
    `${a} + ${b} = ?`,
    String(ans),
    makeNumericOptions(ans, [ans + 10, ans - 10, ans + 100, ans - 100])
  );
}
function genUnit3() {
  const kind = randInt(1, 4);
  if (kind === 1) {
    const cm = randInt(2, 12);
    const ans = cm * 10;
    return buildQuestion(
      "u3",
      `${cm} 公分等於幾毫米？`,
      `${ans} 毫米`,
      makeNumericOptions(
        ans,
        [cm, cm * 100, ans + 10, Math.max(10, ans - 10)],
        (n) => `${n} 毫米`
      )
    );
  }
  if (kind === 2) {
    const cm = randInt(1, 8);
    const mm = randInt(1, 9);
    const ans = cm * 10 + mm;
    return buildQuestion(
      "u3",
      `${cm} 公分 ${mm} 毫米等於幾毫米？`,
      `${ans} 毫米`,
      makeNumericOptions(
        ans,
        [cm + mm, ans + 10, ans - 10, mm * 10 + cm],
        (n) => `${n} 毫米`
      )
    );
  }
  if (kind === 3) {
    const a = randInt(2, 6);
    const b = randInt(1, 5);
    const ans = a + b;
    return buildQuestion(
      "u3",
      `數線上，從 ${a * 10} 往右數 ${b * 10} 格會到哪裡？`,
      String(ans * 10),
      makeNumericOptions(ans * 10, [
        (ans + 1) * 10,
        Math.max(0, (ans - 1) * 10),
        Math.abs(a - b) * 10,
        (ans + 2) * 10
      ])
    );
  }
  const mmVal = randInt(2, 9) * 10;
  const cmVal = mmVal / 10;
  return buildQuestion(
    "u3",
    `${mmVal} 毫米等於幾公分？`,
    `${cmVal} 公分`,
    makeNumericOptions(cmVal, [cmVal + 1, cmVal - 1, mmVal, cmVal + 2], (n) => `${n} 公分`)
  );
}
function genUnit4() {
  const kind = randInt(1, 4);
  if (kind === 1) {
    const a = randInt(2, 9) * 10;
    const b2 = randInt(2, 6);
    const ans = a * b2;
    return buildQuestion(
      "u4",
      `${a} × ${b2} = ?`,
      String(ans),
      makeNumericOptions(ans, [ans + 10, ans - 10, ans + a, Math.max(10, ans - a)])
    );
  }
  if (kind === 2) {
    const tens = randInt(1, 3);
    const ones = randInt(1, 3);
    const b2 = randInt(2, 3);
    const a = tens * 10 + ones;
    const ans = a * b2;
    return buildQuestion(
      "u4",
      `${a} × ${b2} = ?`,
      String(ans),
      makeNumericOptions(ans, [ans + b2, ans - b2, ans + 10, Math.max(2, ans - 10)])
    );
  }
  if (kind === 3) {
    const a = randInt(1, 4) * 100;
    const b2 = randInt(2, 4);
    const ans = a * b2;
    return buildQuestion(
      "u4",
      `${a} × ${b2} = ?`,
      String(ans),
      makeNumericOptions(ans, [ans + 100, ans - 100, ans / 10, ans + a])
    );
  }
  const h = randInt(1, 3);
  const b = randInt(2, 4);
  const near = h * 100 - pick([1, 2, 3]);
  const est = h * 100 * b;
  return buildQuestion(
    "u4",
    `估估看，${near} × ${b} 大約是多少？`,
    String(est),
    makeNumericOptions(est, [est + 100, est - 100, est + 200, Math.max(100, est - 200)])
  );
}
const UNIT5_BANK = [
  {
    prompt: "一個角有幾個頂點和幾條邊？",
    answer: "1 個頂點、2 條邊",
    options: ["1 個頂點、2 條邊", "2 個頂點、1 條邊", "2 個頂點、2 條邊", "1 個頂點、3 條邊"]
  },
  {
    prompt: "正方形有幾個直角？",
    answer: "4 個",
    options: ["4 個", "2 個", "3 個", "1 個"]
  },
  {
    prompt: "長方形有幾個直角？",
    answer: "4 個",
    options: ["4 個", "2 個", "3 個", "0 個"]
  },
  {
    prompt: "關於「角的大小」，哪一句話是正確的？",
    answer: "兩邊張開越大，角越大",
    options: [
      "兩邊張開越大，角越大",
      "邊畫得越長，角越大",
      "邊畫得越短，角越小",
      "所有的角都一樣大"
    ]
  },
  {
    prompt: "正方形的 4 條邊有什麼特色？",
    answer: "4 條邊都一樣長",
    options: ["4 條邊都一樣長", "只有 2 條邊一樣長", "4 條邊都不一樣長", "沒有直角"]
  },
  {
    prompt: "長方形的邊有什麼特色？",
    answer: "兩組對邊分別一樣長",
    options: ["兩組對邊分別一樣長", "4 條邊一定都一樣長", "只有 3 條邊", "沒有直角"]
  },
  {
    prompt: "我們常用哪一個工具來檢查是不是「直角」？",
    answer: "三角板的直角",
    options: ["三角板的直角", "圓規", "量杯", "天平"]
  },
  {
    prompt: "一張正方形的色紙，四個角都是什麼角？",
    answer: "直角",
    options: ["直角", "比直角小的角", "比直角大的角", "不是角"]
  },
  {
    prompt: "把一個角的兩條邊畫長一點，這個角會變大嗎？",
    answer: "不會，一樣大",
    options: ["不會，一樣大", "會變大", "會變小", "會變成直角"]
  },
  {
    prompt: "一個長方形共有幾條邊？",
    answer: "4 條邊",
    options: ["4 條邊", "3 條邊", "5 條邊", "6 條邊"]
  }
];
function genUnit5() {
  const item = pick(UNIT5_BANK);
  return buildQuestion("u5", item.prompt, item.answer, item.options);
}
function genUnit6() {
  const kind = randInt(1, 3);
  if (kind === 1) {
    const b2 = randInt(2, 9);
    const ans = randInt(2, 9);
    const a2 = b2 * ans;
    return buildQuestion(
      "u6",
      `${a2} ÷ ${b2} = ?`,
      String(ans),
      makeNumericOptions(ans, [ans + 1, ans - 1, ans + 2, Math.max(1, ans - 2)])
    );
  }
  if (kind === 2) {
    const people = randInt(2, 8);
    const each = randInt(2, 9);
    const total = people * each;
    return buildQuestion(
      "u6",
      `${total} 顆糖果平分給 ${people} 人，每人有幾顆？`,
      `${each} 顆`,
      makeNumericOptions(each, [each + 1, each - 1, each + 2, people], (n) => `${n} 顆`)
    );
  }
  const b = randInt(3, 6);
  const q = randInt(2, 5);
  const r = randInt(1, b - 1);
  const a = b * q + r;
  return buildQuestion(
    "u6",
    `${a} ÷ ${b} 的「餘數」是多少？`,
    String(r),
    makeNumericOptions(r, [0, r + 1, Math.max(0, r - 1), q, b])
  );
}
function genUnit7() {
  const kind = randInt(1, 4);
  if (kind === 1) {
    const kg = randInt(1, 6);
    const ans2 = kg * 1e3;
    return buildQuestion(
      "u7",
      `${kg} 公斤等於幾公克？`,
      `${ans2} 公克`,
      makeNumericOptions(
        ans2,
        [kg * 100, kg * 10, ans2 + 1e3, Math.max(100, ans2 - 500)],
        (n) => `${n} 公克`
      )
    );
  }
  if (kind === 2) {
    const kg = randInt(1, 4);
    const g = pick([100, 200, 300, 500, 600, 800]);
    const ans2 = kg * 1e3 + g;
    return buildQuestion(
      "u7",
      `${kg} 公斤 ${g} 公克等於幾公克？`,
      `${ans2} 公克`,
      makeNumericOptions(
        ans2,
        [ans2 + 100, ans2 - 100, kg * 100 + g, ans2 + 1e3],
        (n) => `${n} 公克`
      )
    );
  }
  if (kind === 3) {
    const kg = randInt(2, 7);
    const g = kg * 1e3;
    return buildQuestion(
      "u7",
      `${g} 公克等於幾公斤？`,
      `${kg} 公斤`,
      makeNumericOptions(kg, [kg + 1, kg - 1, kg * 10, kg + 2], (n) => `${n} 公斤`)
    );
  }
  const a = randInt(1, 4) * 100;
  const b = randInt(1, 5) * 100;
  const ans = a + b;
  return buildQuestion(
    "u7",
    `蘋果重 ${a} 公克、橘子重 ${b} 公克，合起來重幾公克？`,
    `${ans} 公克`,
    makeNumericOptions(ans, [ans + 100, Math.max(100, ans - 100), ans + 200, ans + 50], (n) => `${n} 公克`)
  );
}
function genUnit8() {
  const kind = randInt(1, 4);
  if (kind === 1) {
    const den2 = randInt(4, 9);
    const num = randInt(1, den2 - 1);
    const ans2 = `${num}/${den2}`;
    const opts = /* @__PURE__ */ new Set([ans2]);
    opts.add(`${den2}/${num}`);
    opts.add(`${Math.min(den2, num + 1)}/${den2}`);
    opts.add(`${Math.max(1, num - 1)}/${den2}`);
    opts.add(`1/${den2}`);
    opts.add(`${num}/${den2 + 1}`);
    return buildQuestion(
      "u8",
      `1 個披薩平分成 ${den2} 塊，吃了 ${num} 塊，是吃了幾個披薩？`,
      ans2,
      Array.from(opts).slice(0, 4)
    );
  }
  if (kind === 2) {
    const den2 = randInt(3, 10);
    return buildQuestion(
      "u8",
      `幾個 1/${den2} 合起來剛好等於 1？`,
      `${den2} 個`,
      makeNumericOptions(den2, [den2 - 1, den2 + 1, 1, den2 + 2], (n) => `${n} 個`)
    );
  }
  if (kind === 3) {
    const den2 = randInt(5, 9);
    const a = randInt(1, den2 - 3);
    const b = a + randInt(1, 2);
    const ans2 = `${b}/${den2}`;
    return buildQuestion(
      "u8",
      `哪一個分數比較「大」？（分母都是 ${den2}）`,
      ans2,
      [`${b}/${den2}`, `${a}/${den2}`, `${Math.max(1, a - 1)}/${den2}`, `0/${den2}`]
    );
  }
  const den = randInt(4, 8);
  const ans = `${den}/${den}`;
  return buildQuestion(
    "u8",
    `下面哪一個分數等於「1」？`,
    ans,
    [ans, `1/${den}`, `${den - 1}/${den}`, `2/${den}`]
  );
}
const UNIT9_PATTERN_BANK = [
  {
    prompt: "找規律：○ △ ○ △ ○ ( ? )",
    answer: "△",
    options: ["△", "○", "□", "★"]
  },
  {
    prompt: "找規律：★ ★ ● ★ ★ ● ★ ★ ( ? )",
    answer: "●",
    options: ["●", "★", "▲", "■"]
  },
  {
    prompt: "找規律：🔴 🔵 🟡 🔴 🔵 ( ? )",
    answer: "🟡",
    options: ["🟡", "🔴", "🔵", "🟢"]
  },
  {
    prompt: "統計表格中，畫 1 個「正」字代表幾票？",
    answer: "5 票",
    options: ["5 票", "4 票", "3 票", "10 票"]
  },
  {
    prompt: "統計表格中，畫 3 個「正」字代表幾票？",
    answer: "15 票",
    options: ["15 票", "10 票", "12 票", "20 票"]
  },
  {
    prompt: "統計表格中，2 個「正」字再多 2 畫，代表幾票？",
    answer: "12 票",
    options: ["12 票", "10 票", "14 票", "7 票"]
  }
];
function genUnit9() {
  if (Math.random() < 0.5) {
    const item = pick(UNIT9_PATTERN_BANK);
    return buildQuestion("u9", item.prompt, item.answer, item.options);
  }
  const step = pick([2, 3, 5, 10]);
  const start = randInt(1, 5) * step;
  const seq = [start, start + step, start + step * 2, start + step * 3];
  const ans = start + step * 4;
  return buildQuestion(
    "u9",
    `找數字規律：${seq.join("、")}、( ? )`,
    String(ans),
    makeNumericOptions(ans, [ans + step, ans - step, ans + 1, ans + 2])
  );
}
const ALL_UNITS = [
  "u1",
  "u2",
  "u3",
  "u4",
  "u5",
  "u6",
  "u7",
  "u8",
  "u9"
];
function generateMathQuestion(selectedUnit) {
  const unit = selectedUnit === "all" ? pick(ALL_UNITS) : selectedUnit;
  switch (unit) {
    case "u1":
      return genUnit1();
    case "u2":
      return genUnit2();
    case "u3":
      return genUnit3();
    case "u4":
      return genUnit4();
    case "u5":
      return genUnit5();
    case "u6":
      return genUnit6();
    case "u7":
      return genUnit7();
    case "u8":
      return genUnit8();
    case "u9":
      return genUnit9();
  }
}
const OPPOSITE_DIR = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};
const DIR_DELTA = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
async function ensureD1Schema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS snake1123_matches (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL,
        math_ops TEXT NOT NULL,
        duration_sec INTEGER NOT NULL,
        player_count INTEGER NOT NULL,
        ended_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS snake1123_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT NOT NULL,
        room_code TEXT NOT NULL,
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        resources_collected INTEGER NOT NULL,
        math_correct INTEGER NOT NULL,
        math_total INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `)
  ]);
}
class SnakeRoom extends DurableObject {
  roomCode = "";
  phase = "lobby";
  settings = {
    maxPlayers: 8,
    mathUnit: "all",
    durationSec: 180
  };
  players = /* @__PURE__ */ new Map();
  resources = [];
  nextResourceId = 1;
  endsAtMs = 0;
  rankings = [];
  hostSockets = /* @__PURE__ */ new Set();
  playerSockets = /* @__PURE__ */ new Map();
  tickTimer = null;
  constructor(ctx, env) {
    super(ctx, env);
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/init")) {
      const code2 = url.searchParams.get("code") || "";
      if (code2) this.roomCode = code2.toUpperCase();
      return Response.json({ ok: true, roomCode: this.roomCode });
    }
    if (url.pathname.endsWith("/info")) {
      return Response.json({
        roomCode: this.roomCode,
        phase: this.phase,
        settings: this.settings,
        playerCount: this.players.size
      });
    }
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const role = url.searchParams.get("role") || "player";
    const code = url.searchParams.get("code") || this.roomCode;
    if (code && !this.roomCode) {
      this.roomCode = code.toUpperCase();
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    if (role === "host") {
      this.handleHostSocket(server);
    } else {
      const rawName = (url.searchParams.get("name") || "").trim().slice(0, 14);
      const requestedId = (url.searchParams.get("playerId") || "").trim();
      this.handlePlayerSocket(server, rawName, requestedId);
    }
    return new Response(null, { status: 101, webSocket: client });
  }
  handleHostSocket(ws) {
    this.hostSockets.add(ws);
    this.safeSend(ws, { type: "welcome", role: "host", roomCode: this.roomCode });
    this.safeSend(ws, { type: "state", state: this.getSnapshot() });
    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        this.onHostMessage(msg);
      } catch {
      }
    });
    ws.addEventListener("close", () => {
      this.hostSockets.delete(ws);
    });
    ws.addEventListener("error", () => {
      this.hostSockets.delete(ws);
    });
  }
  handlePlayerSocket(ws, rawName, requestedId) {
    if (!rawName && !requestedId) {
      this.safeSend(ws, { type: "preview_state", state: this.getSnapshot() });
      this.playerSockets.set(ws, "__preview__");
      ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === "join" && typeof msg.name === "string") {
            const clean = msg.name.trim().slice(0, 14);
            if (!clean) {
              this.safeSend(ws, { type: "error", message: "請輸入你的名字！" });
              return;
            }
            this.attachPlayer(ws, clean, typeof msg.playerId === "string" ? msg.playerId : "");
          } else {
            const pid = this.playerSockets.get(ws);
            if (pid && pid !== "__preview__") {
              this.onPlayerMessage(ws, pid, msg);
            }
          }
        } catch {
        }
      });
      ws.addEventListener("close", () => this.onPlayerClose(ws));
      ws.addEventListener("error", () => this.onPlayerClose(ws));
      return;
    }
    this.attachPlayer(ws, rawName || "小蛇玩家", requestedId);
    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        const pid = this.playerSockets.get(ws);
        if (pid && pid !== "__preview__") {
          this.onPlayerMessage(ws, pid, msg);
        }
      } catch {
      }
    });
    ws.addEventListener("close", () => this.onPlayerClose(ws));
    ws.addEventListener("error", () => this.onPlayerClose(ws));
  }
  attachPlayer(ws, name, requestedId) {
    let player = requestedId ? this.players.get(requestedId) : void 0;
    if (player) {
      player.connected = true;
      if (name) player.name = name;
      for (const [sock, pid] of this.playerSockets.entries()) {
        if (pid === player.id && sock !== ws) {
          this.playerSockets.delete(sock);
          try {
            sock.close(1e3, "Replaced by new session");
          } catch {
          }
        }
      }
      this.playerSockets.set(ws, player.id);
    } else {
      if (this.players.size >= this.settings.maxPlayers) {
        this.safeSend(ws, {
          type: "error",
          message: `房間人數已滿（上限 ${this.settings.maxPlayers} 人）`
        });
        return;
      }
      const id = crypto.randomUUID().slice(0, 8);
      const color = this.pickAvailableColor();
      player = {
        id,
        name,
        color,
        connected: true,
        score: 0,
        resourcesCollected: 0,
        resourceProgress: 0,
        mathCorrect: 0,
        mathTotal: 0,
        pendingQuestion: null,
        invulnerableTicks: 15,
        dir: "right",
        nextDir: "right",
        growPending: 0,
        segments: []
      };
      if (this.phase === "playing") {
        this.spawnSnake(player);
      }
      this.players.set(id, player);
      this.playerSockets.set(ws, id);
    }
    this.safeSend(ws, {
      type: "welcome",
      role: "player",
      roomCode: this.roomCode,
      playerId: player.id,
      playerName: player.name,
      color: player.color
    });
    if (player.pendingQuestion) {
      const { answer: _hidden, ...publicQ } = player.pendingQuestion;
      this.safeSend(ws, { type: "math_question", question: publicQ });
    }
    this.broadcastState();
  }
  onPlayerClose(ws) {
    const pid = this.playerSockets.get(ws);
    this.playerSockets.delete(ws);
    if (!pid || pid === "__preview__") return;
    const player = this.players.get(pid);
    if (!player) return;
    if (this.phase === "lobby") {
      this.players.delete(pid);
    } else {
      player.connected = false;
    }
    this.broadcastState();
  }
  onHostMessage(msg) {
    switch (msg.type) {
      case "update_settings": {
        if (this.phase !== "lobby") return;
        const maxPlayers = Number(msg.maxPlayers);
        if (Number.isFinite(maxPlayers)) {
          this.settings.maxPlayers = Math.max(2, Math.min(8, Math.round(maxPlayers)));
        }
        const durationSec = Number(msg.durationSec);
        if (Number.isFinite(durationSec)) {
          this.settings.durationSec = Math.max(30, Math.min(600, Math.round(durationSec)));
        }
        if (typeof msg.mathUnit === "string") {
          const valid = MATH_UNIT_OPTIONS.some((u) => u.value === msg.mathUnit);
          if (valid) {
            this.settings.mathUnit = msg.mathUnit;
          }
        }
        this.broadcastState();
        break;
      }
      case "kick_player": {
        const targetId = String(msg.playerId || "");
        if (!targetId || !this.players.has(targetId)) return;
        this.players.delete(targetId);
        for (const [sock, pid] of this.playerSockets.entries()) {
          if (pid === targetId) {
            this.safeSend(sock, {
              type: "kicked",
              message: "房主已將你移出房間。"
            });
            this.playerSockets.delete(sock);
            try {
              sock.close(4001, "Kicked by host");
            } catch {
            }
          }
        }
        this.broadcastState();
        break;
      }
      case "start_game": {
        if (this.phase !== "lobby") return;
        this.startGame();
        break;
      }
      case "end_game": {
        if (this.phase === "playing") {
          void this.finishGame();
        }
        break;
      }
      case "reset_lobby": {
        this.stopTickLoop();
        this.phase = "lobby";
        this.endsAtMs = 0;
        this.rankings = [];
        this.resources = [];
        for (const [id, p] of this.players.entries()) {
          if (!p.connected) {
            this.players.delete(id);
            continue;
          }
          p.score = 0;
          p.resourcesCollected = 0;
          p.resourceProgress = 0;
          p.mathCorrect = 0;
          p.mathTotal = 0;
          p.pendingQuestion = null;
          p.segments = [];
          p.invulnerableTicks = 0;
        }
        this.broadcastState();
        break;
      }
    }
  }
  onPlayerMessage(ws, playerId, msg) {
    const player = this.players.get(playerId);
    if (!player) return;
    if (msg.type === "set_dir" && this.phase === "playing") {
      const dir = msg.dir;
      if (dir !== "up" && dir !== "down" && dir !== "left" && dir !== "right") return;
      player.nextDir = dir;
      return;
    }
    if (msg.type === "answer_math" && this.phase === "playing") {
      const q = player.pendingQuestion;
      if (!q) return;
      if (String(msg.questionId || "") !== q.id) return;
      const choice = String(msg.choice ?? "");
      const isCorrect = choice === q.answer;
      player.mathTotal += 1;
      if (isCorrect) {
        player.mathCorrect += 1;
        player.score += 50;
        player.growPending += 2;
      }
      player.pendingQuestion = null;
      player.invulnerableTicks = 12;
      this.safeSend(ws, {
        type: "math_result",
        correct: isCorrect,
        correctAnswer: q.answer,
        bonus: isCorrect ? 50 : 0
      });
      this.broadcastState();
    }
  }
  startGame() {
    this.phase = "playing";
    this.rankings = [];
    this.resources = [];
    this.endsAtMs = Date.now() + this.settings.durationSec * 1e3;
    for (const p of this.players.values()) {
      p.score = 0;
      p.resourcesCollected = 0;
      p.resourceProgress = 0;
      p.mathCorrect = 0;
      p.mathTotal = 0;
      p.pendingQuestion = null;
      p.growPending = 0;
      this.spawnSnake(p);
    }
    this.refillResources();
    this.broadcastState();
    this.startTickLoop();
  }
  startTickLoop() {
    this.stopTickLoop();
    this.tickTimer = setInterval(() => {
      this.stepGame();
    }, 135);
  }
  stopTickLoop() {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
  stepGame() {
    if (this.phase !== "playing") {
      this.stopTickLoop();
      return;
    }
    if (Date.now() >= this.endsAtMs) {
      void this.finishGame();
      return;
    }
    const bodyCells = /* @__PURE__ */ new Map();
    for (const p of this.players.values()) {
      if (!p.connected || p.segments.length === 0 || p.pendingQuestion) continue;
      for (let i = 0; i < p.segments.length; i++) {
        const seg = p.segments[i];
        bodyCells.set(`${seg.x},${seg.y}`, p.id);
      }
    }
    for (const p of this.players.values()) {
      if (!p.connected) continue;
      if (p.segments.length === 0) {
        this.spawnSnake(p);
        continue;
      }
      if (p.pendingQuestion) {
        continue;
      }
      if (p.invulnerableTicks > 0) {
        p.invulnerableTicks -= 1;
      }
      p.dir = p.nextDir;
      const head = p.segments[0];
      const delta = DIR_DELTA[p.dir];
      const nextHead = { x: head.x + delta.x, y: head.y + delta.y };
      const hitWall = nextHead.x < 0 || nextHead.x >= GRID_WIDTH || nextHead.y < 0 || nextHead.y >= GRID_HEIGHT;
      const cellOwner = bodyCells.get(`${nextHead.x},${nextHead.y}`);
      const hitBody = p.invulnerableTicks === 0 && cellOwner !== void 0 && cellOwner !== p.id;
      if (hitWall || hitBody) {
        p.score = Math.max(0, p.score - 5);
        this.spawnSnake(p);
        continue;
      }
      p.segments.unshift(nextHead);
      if (p.growPending > 0 && p.segments.length < 24) {
        p.growPending -= 1;
      } else {
        p.segments.pop();
      }
      const resIdx = this.resources.findIndex(
        (r) => r.x === nextHead.x && r.y === nextHead.y
      );
      if (resIdx !== -1) {
        this.resources.splice(resIdx, 1);
        p.score += 2;
        p.resourcesCollected += 1;
        p.resourceProgress += 1;
        if (p.segments.length < 24) {
          p.growPending += 1;
        }
        if (p.resourceProgress >= RESOURCES_PER_QUIZ) {
          p.resourceProgress = 0;
          const question = generateMathQuestion(this.settings.mathUnit);
          p.pendingQuestion = question;
          const { answer: _hidden, ...publicQ } = question;
          this.sendToPlayer(p.id, { type: "math_question", question: publicQ });
        }
      }
    }
    this.refillResources();
    this.broadcastState();
  }
  async finishGame() {
    if (this.phase === "ended") return;
    this.stopTickLoop();
    this.phase = "ended";
    this.endsAtMs = 0;
    for (const p of this.players.values()) {
      p.pendingQuestion = null;
    }
    const sorted = Array.from(this.players.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.mathCorrect !== a.mathCorrect) return b.mathCorrect - a.mathCorrect;
      return b.resourcesCollected - a.resourcesCollected;
    });
    this.rankings = sorted.map((p, idx) => ({
      rank: idx + 1,
      playerId: p.id,
      name: p.name,
      color: p.color,
      score: p.score,
      resourcesCollected: p.resourcesCollected,
      mathCorrect: p.mathCorrect,
      mathTotal: p.mathTotal
    }));
    this.broadcastState();
    if (this.rankings.length > 0 && this.env.DB) {
      try {
        await ensureD1Schema(this.env.DB);
        const matchId = crypto.randomUUID();
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const stmts = [
          this.env.DB.prepare(
            `INSERT INTO snake1123_matches (id, room_code, math_ops, duration_sec, player_count, ended_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            matchId,
            this.roomCode || "ROOM",
            this.settings.mathUnit,
            this.settings.durationSec,
            this.rankings.length,
            nowIso
          )
        ];
        for (const r of this.rankings) {
          stmts.push(
            this.env.DB.prepare(
              `INSERT INTO snake1123_scores (match_id, room_code, player_name, score, resources_collected, math_correct, math_total, rank, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              matchId,
              this.roomCode || "ROOM",
              r.name,
              r.score,
              r.resourcesCollected,
              r.mathCorrect,
              r.mathTotal,
              r.rank,
              nowIso
            )
          );
        }
        await this.env.DB.batch(stmts);
      } catch (err) {
        console.error("Failed to save match to D1:", err);
      }
    }
  }
  spawnSnake(player) {
    const occupied = /* @__PURE__ */ new Set();
    for (const p of this.players.values()) {
      if (p.id === player.id) continue;
      for (const seg of p.segments) {
        occupied.add(`${seg.x},${seg.y}`);
      }
    }
    const dirs = ["right", "left", "up", "down"];
    let bestX = Math.floor(GRID_WIDTH / 2);
    let bestY = Math.floor(GRID_HEIGHT / 2);
    let bestDir = "right";
    for (let attempt = 0; attempt < 60; attempt++) {
      const x = 4 + Math.floor(Math.random() * (GRID_WIDTH - 8));
      const y = 4 + Math.floor(Math.random() * (GRID_HEIGHT - 8));
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const back2 = DIR_DELTA[OPPOSITE_DIR[dir]];
      const pts = [
        { x, y },
        { x: x + back2.x, y: y + back2.y },
        { x: x + back2.x * 2, y: y + back2.y * 2 }
      ];
      const clear = pts.every((pt) => !occupied.has(`${pt.x},${pt.y}`));
      if (clear) {
        bestX = x;
        bestY = y;
        bestDir = dir;
        break;
      }
    }
    const back = DIR_DELTA[OPPOSITE_DIR[bestDir]];
    player.dir = bestDir;
    player.nextDir = bestDir;
    player.growPending = 0;
    player.invulnerableTicks = 15;
    player.segments = [
      { x: bestX, y: bestY },
      { x: bestX + back.x, y: bestY + back.y },
      { x: bestX + back.x * 2, y: bestY + back.y * 2 }
    ];
  }
  refillResources() {
    if (this.resources.length >= TARGET_RESOURCES) return;
    const occupied = /* @__PURE__ */ new Set();
    for (const r of this.resources) occupied.add(`${r.x},${r.y}`);
    for (const p of this.players.values()) {
      for (const seg of p.segments) occupied.add(`${seg.x},${seg.y}`);
    }
    let tries = 0;
    while (this.resources.length < TARGET_RESOURCES && tries < 250) {
      tries++;
      const x = Math.floor(Math.random() * GRID_WIDTH);
      const y = Math.floor(Math.random() * GRID_HEIGHT);
      const key = `${x},${y}`;
      if (occupied.has(key)) continue;
      occupied.add(key);
      this.resources.push({
        id: this.nextResourceId++,
        x,
        y,
        kind: this.nextResourceId % 3
      });
    }
  }
  pickAvailableColor() {
    const used = new Set(Array.from(this.players.values()).map((p) => p.color));
    for (const c of PLAYER_COLORS) {
      if (!used.has(c)) return c;
    }
    return PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];
  }
  getSnapshot() {
    const remainingSec = this.phase === "playing" ? Math.max(0, Math.ceil((this.endsAtMs - Date.now()) / 1e3)) : this.settings.durationSec;
    const players = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      connected: p.connected,
      score: p.score,
      resourcesCollected: p.resourcesCollected,
      resourceProgress: p.resourceProgress,
      mathCorrect: p.mathCorrect,
      mathTotal: p.mathTotal,
      answeringMath: p.pendingQuestion !== null,
      invulnerableTicks: p.invulnerableTicks,
      dir: p.dir,
      segments: p.segments
    }));
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      resourcesPerQuiz: RESOURCES_PER_QUIZ,
      settings: this.settings,
      remainingSec,
      players,
      resources: this.resources,
      rankings: this.rankings
    };
  }
  broadcastState() {
    const payload = JSON.stringify({ type: "state", state: this.getSnapshot() });
    for (const ws of this.hostSockets) {
      this.safeSendRaw(ws, payload);
    }
    for (const ws of this.playerSockets.keys()) {
      this.safeSendRaw(ws, payload);
    }
  }
  sendToPlayer(playerId, data) {
    const raw = JSON.stringify(data);
    for (const [ws, pid] of this.playerSockets.entries()) {
      if (pid === playerId) {
        this.safeSendRaw(ws, raw);
      }
    }
  }
  safeSend(ws, data) {
    this.safeSendRaw(ws, JSON.stringify(data));
  }
  safeSendRaw(ws, raw) {
    try {
      ws.send(raw);
    } catch {
    }
  }
}
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function jsonWithCors(data, init) {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return Response.json(data, { ...init, headers });
}
const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const code = generateRoomCode();
      const id = env.SNAKE_ROOMS.idFromName(code);
      const stub = env.SNAKE_ROOMS.get(id);
      await stub.fetch(`https://room.internal/init?code=${code}`);
      return jsonWithCors({ roomCode: code });
    }
    const infoMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]{4,8})$/);
    if (infoMatch && request.method === "GET") {
      const code = infoMatch[1].toUpperCase();
      const id = env.SNAKE_ROOMS.idFromName(code);
      const stub = env.SNAKE_ROOMS.get(id);
      const resp = await stub.fetch(`https://room.internal/info`);
      const body = await resp.json();
      return jsonWithCors(body, { status: resp.status });
    }
    if (url.pathname === "/api/leaderboard/clear" && request.method === "POST") {
      const expectedToken = env.ADMIN_TOKEN;
      if (!expectedToken || request.headers.get("Authorization") !== `Bearer ${expectedToken}`) {
        return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
      }
      try {
        await ensureD1Schema(env.DB);
        await env.DB.batch([
          env.DB.prepare("DELETE FROM snake1123_scores"),
          env.DB.prepare("DELETE FROM snake1123_matches")
        ]);
        return jsonWithCors({ ok: true });
      } catch (err) {
        return jsonWithCors(
          { error: err instanceof Error ? err.message : "DB error" },
          { status: 500 }
        );
      }
    }    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      try {
        await ensureD1Schema(env.DB);
        const top = await env.DB.prepare(
          `SELECT player_name, score, resources_collected, math_correct, math_total, room_code, created_at
           FROM snake1123_scores
           ORDER BY score DESC, math_correct DESC
           LIMIT 15`
        ).all();
        return jsonWithCors({ scores: top.results ?? [] });
      } catch (err) {
        return jsonWithCors(
          { scores: [], error: err instanceof Error ? err.message : "DB error" },
          { status: 500 }
        );
      }
    }
    const wsMatch = url.pathname.match(/^\/ws\/([A-Za-z0-9]{4,8})$/);
    if (wsMatch) {
      const code = wsMatch[1].toUpperCase();
      const id = env.SNAKE_ROOMS.idFromName(code);
      const stub = env.SNAKE_ROOMS.get(id);
      const forwardUrl = new URL(request.url);
      forwardUrl.searchParams.set("code", code);
      return stub.fetch(new Request(forwardUrl.toString(), request));
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
const workerEntry = worker ?? {};
export {
  SnakeRoom,
  workerEntry as default
};
//# sourceMappingURL=index.js.map
