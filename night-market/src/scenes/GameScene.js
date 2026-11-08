import { STALLS, BALANCE, CHARACTERS, T, SCALE } from '../config.js';
import { parseMap } from '../map.js';
import { makeTextures } from '../textures.js';
import { createOrder, openTarget, remainFrac, isExpired, nextSpawnDelay } from '../logic/orders.js';
import { stallById, calcPayout } from '../logic/checkout.js';
import { makeNpcPlan, npcAt } from '../logic/npc.js';
import { serverNow } from '../net/firebase.js';
import { OFFLINE_RELEASE_MS } from '../net/room.js';

const FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
const HOST_TICK_MS = 250;
const hex = n => '#' + n.toString(16).padStart(6, '0');
const emojis = ids => ids.map(id => stallById(id).emoji).join('');
const parseCarry = c => (c ? String(c).split(',').filter(id => stallById(id)) : []);
const emptyStats = () => ({ money: 0, delivered: 0, firstTry: 0, combo: 0, bestCombo: 0, expired: 0 });

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(data) {
    this.room = data.room;
    this.ui = data.ui;
    this.me = this.room.uid;
  }

  get meta() { return this.room.meta; }

  create() {
    makeTextures(this);
    this.map = parseMap();
    this.worldW = this.map.width * T;
    this.worldH = this.map.height * T;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.round = this.meta.round;
    this.settings = this.meta.settings;
    this.character = CHARACTERS[Math.max(0, this.room.myChar())];

    this.mainOnlyObjs = [];
    this.drawMap();
    this.createPlayer();
    this.createNpcs();
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.npcs);

    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH)
      .startFollow(this.player, true, 0.15, 0.15)
      .setBackgroundColor('#1a1414');
    this.createMinimap();

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q');
    this.input.keyboard.on('keydown-SPACE', () => this.interact());
    this.input.keyboard.on('keydown-Q', () => this.discard());
    this.ui.onAction = () => this.interact();
    this.ui.onDrop = () => this.discard();
    this.actionKey = this.ui.isTouch ? '' : '空白鍵：';
    this.dropHint = this.ui.isTouch ? '按丟掉鈕丟一樣' : '按 Q 丟掉一樣';

    this.customers = new Map();
    this.remotes = new Map();
    this.myOrderIds = new Set();
    this.completedIds = new Set();
    this.claiming = false;
    this.cooking = null;
    this.checkout = null;
    this.modalOpen = false;
    this.hudAt = 0;
    this.hostAt = 0;
    this.hostCheckAt = 0;
    this.nextSpawnAt = 0;
    this.running = false;
    this.finished = false;

    // 斷線重連：還原分數、位置、手上的餐點
    const saved = this.room.state.stats[this.me];
    this.stats = saved?.round === this.round ? { ...emptyStats(), ...saved } : emptyStats();
    delete this.stats.round;
    this.carrying = [];
    const pos = this.room.state.pos[this.me];
    if (saved?.round === this.round && pos) {
      this.player.setPosition(pos.x, pos.y);
      this.carrying = parseCarry(pos.c);
    }
    this.room.writeStats(this.stats);

    this.cookBar = this.mainOnly(this.add.graphics().setDepth(5000));
    this.ui.showHud();
    this.pushHud(serverNow());
    if (serverNow() < this.meta.startAt) this.ui.startCountdown(this.meta.startAt, serverNow);
  }

  // ---------- 地圖 ----------
  drawMap() {
    const { solids, stalls, seats } = this.map;
    this.add.tileSprite(0, 0, this.worldW / SCALE, this.worldH / SCALE, 'ground').setOrigin(0).setScale(SCALE);
    seats.forEach(s => this.add.image(s.x * T, s.y * T, 'seat').setOrigin(0).setScale(SCALE));

    this.solids = this.physics.add.staticGroup();
    solids.forEach(s => {
      if (s.kind !== 'stall') this.add.image(s.x * T, s.y * T, s.kind).setOrigin(0).setScale(SCALE);
      const r = this.add.rectangle(s.x * T + T / 2, s.y * T + T / 2, T, T).setVisible(false);
      this.solids.add(r);
    });

    // 燈籠裝飾（牆上每隔 3 格一個）
    solids.filter(s => s.kind === 'wall' && s.y > 0 && s.y < this.map.height - 1
      && s.x > 0 && s.x < this.map.width - 1 && s.x % 3 === 1)
      .forEach(s => this.add.image(s.x * T + T / 2, s.y * T + T * 0.7, 'lantern').setScale(SCALE).setDepth(s.y * T + T));

    stalls.forEach(s => {
      const info = STALLS[s.index];
      const x = s.x0 * T, y = s.y0 * T, w = (s.x1 - s.x0 + 1) * T;
      this.add.image(x, y, `stall${s.index}`).setOrigin(0).setScale(SCALE).setDepth(y);
      this.mainOnly(this.add.text(x + w / 2, y + 15, `${info.stall} $${info.price}`, {
        fontFamily: FONT, fontSize: '18px', color: '#fff', backgroundColor: '#000a', padding: { x: 6, y: 2 },
      }).setOrigin(0.5, 0).setDepth(y + 1));
      this.mainOnly(this.add.text(x + w / 2, y + T * 1.55, info.emoji.repeat(3), {
        fontFamily: FONT, fontSize: '26px',
      }).setOrigin(0.5).setDepth(y + 1));
    });
  }

  createPlayer() {
    const start = this.map.spawn;
    this.player = this.physics.add.sprite((start.x + 0.5) * T, (start.y + 0.5) * T - 24, this.character.id).setScale(SCALE);
    this.player.body.setSize(10, 8).setOffset(3, 16);
    this.player.setCollideWorldBounds(true);
    this.nameTag = this.mainOnly(this.makeNameTag('你', this.character.color));
    this.carryText = this.mainOnly(this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '22px' }).setOrigin(0.5, 1));
  }

  makeNameTag(text, color) {
    return this.add.text(0, 0, text, {
      fontFamily: FONT, fontSize: '14px', color: '#fff', backgroundColor: hex(color), padding: { x: 4, y: 1 },
    }).setOrigin(0.5, 1).setDepth(6400);
  }

  // 路人由房號決定路線，每個玩家看到的一樣
  createNpcs() {
    this.npcs = this.physics.add.group({ allowGravity: false, immovable: true });
    this.npcPlans = makeNpcPlan(this.map.rows, `${this.room.code}:${this.round}`);
    this.npcPlans.forEach(plan => {
      const p = npcAt(plan, 0);
      const npc = this.npcs.create((p.x + 0.5) * T, (p.y + 0.5) * T - 24, `npc${plan.look}`).setScale(SCALE);
      npc.body.setSize(10, 8).setOffset(3, 16);
      npc.setImmovable(true);
      npc.plan = plan;
    });
  }

  // 用路線的固定步速移動（平順），再輕輕修正跟路線的誤差（大家看到的位置一致）
  syncNpcs(now) {
    const live = now >= this.meta.startAt && now < this.meta.endAt;
    const t = Phaser.Math.Clamp(now - this.meta.startAt, 0, this.meta.endAt - this.meta.startAt);
    this.npcs.getChildren().forEach(npc => {
      const p = npcAt(npc.plan, t);
      const tx = (p.x + 0.5) * T, ty = (p.y + 0.5) * T - 24;
      if (!live || Math.abs(tx - npc.x) > T * 2) {
        npc.body.reset(tx, ty);
      } else {
        npc.setVelocity(p.vx * T + (tx - npc.x) * 2, (ty - npc.y) * 2);
      }
      npc.setFlipX(p.flip);
      npc.setDepth(npc.y);
    });
  }

  // ---------- 其他玩家 ----------
  syncRemotes(delta) {
    const { pos, players } = this.room.state;
    const seen = new Set();
    for (const [uid, p] of Object.entries(pos)) {
      if (uid === this.me || !players[uid]) continue;
      seen.add(uid);
      let r = this.remotes.get(uid);
      if (!r) {
        const char = CHARACTERS[Math.max(0, this.room.charOf(uid))];
        const sprite = this.add.sprite(p.x, p.y, char.id).setScale(SCALE);
        r = {
          sprite,
          tag: this.mainOnly(this.makeNameTag(players[uid].name, char.color)),
          carry: this.mainOnly(this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '20px' }).setOrigin(0.5, 1).setDepth(6500)),
          marker: this.miniOnly(this.add.circle(p.x, p.y, T * 0.7, char.color).setDepth(9997)),
        };
        this.remotes.set(uid, r);
      }
      const k = Math.min(1, (delta / 1000) * 12);
      r.sprite.x += (p.x - r.sprite.x) * k;
      r.sprite.y += (p.y - r.sprite.y) * k;
      r.sprite.setFlipX(!!p.f).setDepth(r.sprite.y).setAlpha(players[uid].online ? 1 : 0.4);
      r.tag.setPosition(r.sprite.x, r.sprite.y - T * 0.8);
      r.carry.setText(emojis(parseCarry(p.c))).setPosition(r.sprite.x, r.sprite.y - T * 1.15);
      r.marker.setPosition(r.sprite.x, r.sprite.y);
    }
    for (const [uid, r] of this.remotes) {
      if (seen.has(uid)) continue;
      [r.sprite, r.tag, r.carry, r.marker].forEach(o => o.destroy());
      this.remotes.delete(uid);
    }
  }

  // ---------- 小地圖 ----------
  createMinimap() {
    this.minimap = this.cameras.add(0, 0, 10, 10).setBackgroundColor('#000').setBounds(0, 0, this.worldW, this.worldH);
    this.minimap.ignore(this.mainOnlyObjs);
    this.playerMarker = this.miniOnly(this.add.circle(0, 0, T * 0.9, this.character.color).setStrokeStyle(12, 0xffffff).setDepth(9999));
    this.layoutMinimap();
    this.scale.on('resize', this.layoutMinimap, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layoutMinimap, this));
  }

  layoutMinimap() {
    const w = Math.min(280, this.scale.width * 0.3);
    const zoom = w / this.worldW;
    this.minimap.setViewport(this.scale.width - w - 12, 12, w, this.worldH * zoom).setZoom(zoom);
    this.minimap.centerOn(this.worldW / 2, this.worldH / 2);
    this.ui.setRankTop(12 + this.worldH * zoom + 10);
  }

  mainOnly(obj) {
    if (this.minimap) this.minimap.ignore(obj); else this.mainOnlyObjs.push(obj);
    return obj;
  }

  miniOnly(obj) {
    this.cameras.main.ignore(obj);
    return obj;
  }

  // ---------- 訂單與顧客 ----------
  orderList() {
    return Object.entries(this.room.state.orders).map(([id, o]) => ({ id, ...o }));
  }

  ownerColor(owner) {
    if (owner === this.me) return this.character.color;
    return CHARACTERS[Math.max(0, this.room.charOf(owner))].color;
  }

  ownerName(owner) {
    return this.room.state.players[owner]?.name ?? '別人';
  }

  addCustomer(order) {
    const seat = this.map.seats[order.seat];
    const x = seat.x * T + T / 2, y = seat.y * T + T / 2;
    const sprite = this.add.image(x, y - 10, `customer${order.look ?? 0}`).setScale(SCALE).setDepth(y);
    const bubble = this.mainOnly(this.add.text(x, y - T * 1.1, emojis(order.items), {
      fontFamily: FONT, fontSize: '24px', backgroundColor: '#fffbea', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(6000));
    const label = this.mainOnly(this.add.text(x, y - T * 1.1 - 40, `${order.table}號桌`, {
      fontFamily: FONT, fontSize: '15px', color: '#fff', backgroundColor: '#000a', padding: { x: 4, y: 1 },
    }).setOrigin(0.5, 1).setDepth(6000));
    const bar = this.mainOnly(this.add.graphics().setDepth(6000));
    const marker = this.miniOnly(this.add.circle(x, y, T * 0.8, 0xffffff).setDepth(9998));
    this.customers.set(order.id, { sprite, bubble, label, bar, marker, x, y });
  }

  removeCustomer(orderId, message, color = '#ffe066') {
    const c = this.customers.get(orderId);
    if (!c) return;
    this.customers.delete(orderId);
    [c.bubble, c.label, c.bar, c.marker].forEach(o => o.destroy());
    this.tweens.add({ targets: c.sprite, alpha: 0, y: c.sprite.y - 20, duration: 600, onComplete: () => c.sprite.destroy() });
    if (message) this.floatText(c.x, c.y - T, message, color);
  }

  floatText(x, y, text, color) {
    const t = this.mainOnly(this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(7000));
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
  }

  syncCustomers(now) {
    const orders = this.orderList();
    const ids = new Set(orders.map(o => o.id));

    for (const id of [...this.customers.keys()]) {
      if (ids.has(id)) continue;
      if (this.completedIds.has(id)) continue; // 自己送達的已經處理過
      if (this.myOrderIds.has(id)) {
        this.stats.expired++;
        this.stats.combo = 0;
        this.room.writeStats(this.stats);
        this.ui.toast('客人等太久走掉了 😢');
        this.removeCustomer(id, '😠', '#ff6b6b');
      } else {
        this.removeCustomer(id);
      }
    }

    const mine = new Set();
    for (const o of orders) {
      if (!this.customers.has(o.id)) this.addCustomer(o);
      if (o.owner === this.me) mine.add(o.id);
      const c = this.customers.get(o.id);
      const frac = remainFrac(o, now);
      c.bubble.setBackgroundColor(o.owner ? hex(this.ownerColor(o.owner)) : '#fffbea');
      c.marker.setFillStyle(o.owner === this.me ? this.character.color : o.owner ? 0x555555 : 0xffffff);
      c.bar.clear();
      c.bar.fillStyle(0x000000, 0.6).fillRect(c.x - 26, c.y - T * 1.1 + 4, 52, 7);
      c.bar.fillStyle(frac > 0.5 ? 0x2ecc71 : frac > 0.25 ? 0xf1c40f : 0xe74c3c, 1)
        .fillRect(c.x - 25, c.y - T * 1.1 + 5, 50 * frac, 5);
    }
    // 自己的單被房主收回（斷線太久）
    for (const id of this.myOrderIds) {
      if (ids.has(id) && !mine.has(id) && !this.completedIds.has(id)) this.ui.toast('斷線太久，訂單被收回了');
    }
    this.myOrderIds = mine;
  }

  // ---------- 房主：出單、收逾時單、結束 ----------
  hostTick(now) {
    const orders = this.orderList();
    for (const o of orders) {
      if (isExpired(o, now)) this.room.removeOrder(o.id);
    }
    const players = this.room.state.players;
    for (const o of orders) {
      const p = o.owner && players[o.owner];
      if (o.owner && (!p || (!p.online && now - (p.lastSeen || 0) > OFFLINE_RELEASE_MS))) this.room.releaseOrder(o.id);
    }
    const open = orders.filter(o => !o.owner && !isExpired(o, now)).length;
    if (open < openTarget(this.room.onlineCount()) && now >= this.nextSpawnAt) {
      const order = createOrder({ seats: this.map.seats, orders, difficulty: this.settings.difficulty, now });
      if (order) this.room.addOrder(order);
      this.nextSpawnAt = now + nextSpawnDelay();
    }
  }

  // ---------- 互動 ----------
  feet() {
    return { x: this.player.body.center.x, y: this.player.body.center.y };
  }

  distToStall(s) {
    const { x, y } = this.feet();
    const dx = Math.max(s.x0 * T - x, 0, x - (s.x1 + 1) * T);
    const dy = Math.max(s.y0 * T - y, 0, y - (s.y1 + 1) * T);
    return Math.hypot(dx, dy);
  }

  findTarget() {
    const { x, y } = this.feet();
    let best = null, bestD = Infinity;
    for (const o of this.orderList()) {
      const c = this.customers.get(o.id);
      if (!c) continue;
      const d = Math.hypot(x - c.x, y - c.y);
      if (d < T * 1.6 && d < bestD) { best = { type: 'customer', order: o }; bestD = d; }
    }
    if (best) return best;
    for (const s of this.map.stalls) {
      const d = this.distToStall(s);
      if (d < T * 0.9 && d < bestD) { best = { type: 'stall', stall: s }; bestD = d; }
    }
    return best;
  }

  missingItems(order) {
    const pool = [...this.carrying];
    return order.items.filter(id => {
      const i = pool.indexOf(id);
      if (i === -1) return true;
      pool.splice(i, 1);
      return false;
    });
  }

  promptFor(target) {
    if (!target) return this.carrying.length ? '帶著餐點去找你的客人' : '走到客人旁邊接單';
    if (target.type === 'stall') {
      const info = STALLS[target.stall.index];
      if (this.cooking) return `${info.food} 製作中…站著別動`;
      if (this.carrying.length >= BALANCE.maxCarry) return `手上拿滿了（${this.dropHint}）`;
      return `${this.actionKey}拿 ${info.emoji} ${info.food}${info.cookSec ? `（等 ${info.cookSec} 秒）` : ''}`;
    }
    const o = target.order;
    if (!o.owner) {
      if (this.myOrderIds.size >= BALANCE.maxOrdersPerPlayer) return `你已經有 ${BALANCE.maxOrdersPerPlayer} 張單了，先送完再接`;
      return `${this.actionKey}接單（${o.customer}要 ${emojis(o.items)}）`;
    }
    if (o.owner !== this.me) return `這張單是 ${this.ownerName(o.owner)} 的`;
    const missing = this.missingItems(o);
    return missing.length ? `還缺 ${emojis(missing)}` : `${this.actionKey}送餐給${o.customer}`;
  }

  // 觸控動作鈕上的字；空字串表示現在沒有可做的事
  actionLabel(target) {
    if (!target || this.modalOpen) return '';
    if (target.type === 'stall') return !this.cooking && this.carrying.length < BALANCE.maxCarry ? '拿餐' : '';
    const o = target.order;
    if (!o.owner) return this.myOrderIds.size < BALANCE.maxOrdersPerPlayer ? '接單' : '';
    return o.owner === this.me && !this.missingItems(o).length ? '送餐' : '';
  }

  async interact() {
    if (!this.running || this.modalOpen) return;
    const target = this.findTarget();
    if (!target) return;
    if (target.type === 'customer') {
      const o = target.order;
      if (!o.owner) {
        if (this.myOrderIds.size >= BALANCE.maxOrdersPerPlayer) { this.ui.toast(`最多同時 ${BALANCE.maxOrdersPerPlayer} 張單喔`); return; }
        if (this.claiming) return;
        this.claiming = true;
        const ok = await this.room.claimOrder(o.id).catch(() => false);
        this.claiming = false;
        this.ui.toast(ok ? `接到${o.customer}的單：${emojis(o.items)}` : '慢了一步，被別人搶走了！');
      } else if (o.owner === this.me) {
        const missing = this.missingItems(o);
        if (missing.length) { this.ui.toast(`還缺 ${emojis(missing)}`); return; }
        o.items.forEach(id => this.carrying.splice(this.carrying.indexOf(id), 1));
        this.startCheckout(o);
      } else {
        this.ui.toast(`這張單是 ${this.ownerName(o.owner)} 的`);
      }
      return;
    }
    const info = STALLS[target.stall.index];
    if (this.cooking) return;
    if (this.carrying.length >= BALANCE.maxCarry) { this.ui.toast(`手上拿滿了，${this.dropHint}`); return; }
    if (!info.cookSec) this.giveItem(info);
    else this.cooking = { stall: target.stall, start: this.time.now, dur: info.cookSec * 1000 };
  }

  giveItem(info) {
    this.carrying.push(info.id);
    this.floatText(this.player.x, this.player.y - T, `+${info.emoji}`, '#fff');
  }

  discard() {
    if (!this.running || this.modalOpen || !this.carrying.length) return;
    const id = this.carrying.pop();
    this.ui.toast(`丟掉了 ${stallById(id).emoji}`);
  }

  updateCooking() {
    this.cookBar.clear();
    if (!this.cooking) return;
    const { stall, start, dur } = this.cooking;
    if (this.distToStall(stall) > T * 0.9) {
      this.cooking = null;
      this.ui.toast('走開了，餐點沒拿到');
      return;
    }
    const frac = Math.min(1, (this.time.now - start) / dur);
    const x = this.player.x - 30, y = this.player.y - T * 1.25;
    this.cookBar.fillStyle(0x000000, 0.7).fillRect(x, y, 60, 10);
    this.cookBar.fillStyle(0xf39c12, 1).fillRect(x + 2, y + 2, 56 * frac, 6);
    if (frac >= 1) {
      this.cooking = null;
      this.giveItem(STALLS[stall.index]);
    }
  }

  // ---------- 結帳 ----------
  startCheckout(order) {
    const pausedAt = serverNow();
    this.room.pauseOrder(order.id);
    this.checkout = { order: { ...order, pausedAt }, attempt: 1 };
    this.modalOpen = true;
    this.player.setVelocity(0);
    this.ui.openCheckout({
      order,
      items: order.items.map(stallById),
      onSubmit: v => this.submitAnswer(v),
      onClose: () => { this.modalOpen = false; },
    });
  }

  submitAnswer(value) {
    const c = this.checkout;
    if (!c) return null;
    if (value === c.order.change) return this.finishCheckout(c.attempt, 'correct');
    if (c.attempt >= BALANCE.maxAttempts) return this.finishCheckout(c.attempt + 1, 'reveal');
    c.attempt++;
    return { result: 'wrong', attemptsLeft: BALANCE.maxAttempts - c.attempt + 1 };
  }

  finishCheckout(attempt, result) {
    const { order } = this.checkout;
    const s = this.stats;
    if (result === 'correct' && attempt === 1) { s.combo++; s.firstTry++; } else s.combo = 0;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const pay = calcPayout({
      itemCount: order.items.length,
      remainFrac: remainFrac(order, order.pausedAt),
      attempt,
      combo: s.combo,
    });
    s.money += pay.total;
    s.delivered++;
    this.completedIds.add(order.id);
    this.room.completeOrder(order.id);
    this.room.writeStats(s);
    this.removeCustomer(order.id, `+$${pay.total}`);
    this.checkout = null;
    return { result, pay, combo: s.combo };
  }

  // ---------- 主迴圈 ----------
  update(_time, delta) {
    const now = serverNow();
    this.syncRemotes(delta);
    this.syncCustomers(now);

    if (!this.running && !this.finished && now >= this.meta.startAt) this.running = true;
    if (this.running && now >= this.meta.endAt) this.finish();
    this.syncNpcs(now);
    // 原房主離線、由我接手時，幫忙把結束時間到的遊戲收尾
    if (this.finished && this.room.isHost() && this.meta.status === 'playing' && now - this.hostCheckAt > 2000) {
      this.hostCheckAt = now;
      this.room.endGame();
    }

    if (!this.running) {
      this.player.setVelocity(0);
      this.drawSelf();
      return;
    }

    if (this.room.isHost() && now - this.hostAt > HOST_TICK_MS) { this.hostAt = now; this.hostTick(now); }

    this.movePlayer();
    this.updateCooking();
    this.drawSelf();
    this.room.sendPos(this.player.x, this.player.y, this.player.flipX, this.carrying.join(','), now);

    const target = this.findTarget();
    this.ui.setPrompt(this.modalOpen ? '' : this.promptFor(target));
    this.ui.setAction(this.actionLabel(target));
    if (now - this.hudAt > 100) { this.hudAt = now; this.pushHud(now); }
  }

  drawSelf() {
    this.player.setDepth(this.player.y);
    this.nameTag.setPosition(this.player.x, this.player.y - T * 0.8);
    this.carryText.setText(emojis(this.carrying)).setPosition(this.player.x, this.player.y - T * 1.15).setDepth(6500);
    this.playerMarker.setPosition(this.player.x, this.player.y);
  }

  movePlayer() {
    const k = this.keys;
    let vx = 0, vy = 0;
    if (!this.modalOpen) {
      if (k.LEFT.isDown || k.A.isDown) vx -= 1;
      if (k.RIGHT.isDown || k.D.isDown) vx += 1;
      if (k.UP.isDown || k.W.isDown) vy -= 1;
      if (k.DOWN.isDown || k.S.isDown) vy += 1;
      if (!vx && !vy) ({ x: vx, y: vy } = this.ui.stick);
    }
    const len = Math.hypot(vx, vy) || 1;
    const speed = BALANCE.playerSpeedTiles * T;
    this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
    if (vx) this.player.setFlipX(vx < 0);
  }

  pushHud(now) {
    const orders = this.orderList()
      .filter(o => !o.owner || o.owner === this.me)
      .sort((a, b) => (b.owner === this.me) - (a.owner === this.me) || a.expiresAt - b.expiresAt)
      .map(o => ({
        id: o.id,
        table: o.table,
        customer: o.customer,
        items: emojis(o.items),
        mine: o.owner === this.me,
        frac: remainFrac(o, now),
        paying: !!o.pausedAt,
        missing: o.owner === this.me ? emojis(this.missingItems(o)) : '',
      }));
    this.ui.updateHud({
      timeLeft: this.meta.endAt - Math.max(now, this.meta.startAt),
      money: this.stats.money,
      combo: this.stats.combo,
      orders,
      carrying: this.carrying.map(id => stallById(id).emoji),
      maxCarry: BALANCE.maxCarry,
      color: hex(this.character.color),
      ranking: this.room.ranking(),
      me: this.me,
    });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.player.setVelocity(0);
    this.cooking = null;
    this.cookBar.clear();
    this.ui.closeCheckout();
    this.ui.setPrompt('');
    if (this.room.isHost()) this.room.endGame();
  }
}
