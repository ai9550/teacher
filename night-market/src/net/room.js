// 房間：建房、加入、角色、狀態同步（Firebase Realtime Database）
import {
  ref, child, get, set, update, remove, push, onValue, onDisconnect, runTransaction, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js';
import { db, serverNow } from './firebase.js';
import { CHARACTERS, BALANCE } from '../config.js';

const ROOMS = 'nightMarket/rooms';
const SESSION_KEY = 'nightMarket.room';
const POS_INTERVAL = 100;
export const OFFLINE_RELEASE_MS = 30000;
const HOST_GRACE_MS = 5000;

export class RoomError extends Error {}

export class Room {
  constructor(uid, code) {
    this.uid = uid;
    this.code = code;
    this.root = ref(db, `${ROOMS}/${code}`);
    this.state = { meta: null, players: {}, chars: {}, stats: {}, orders: {}, pos: {} };
    this.listeners = new Set();
    this.unsubs = [];
    this.lastPosAt = 0;
    this.lastPosKey = '';
  }

  // ---------- 建房／加入 ----------
  static async create(uid, name) {
    for (let i = 0; i < 15; i++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const room = new Room(uid, code);
      try {
        await set(room.root, {
          meta: {
            host: uid, status: 'waiting', round: 0, createdAt: serverTimestamp(),
            settings: { difficulty: 'easy', durationMin: BALANCE.durationOptionsMin[0] },
          },
          players: { [uid]: { name, joinedAt: serverTimestamp(), online: true } },
          chars: { 0: uid },
        });
        await room.connect();
        return room;
      } catch (err) {
        if (!String(err).includes('PERMISSION_DENIED')) throw err;
        // 房號被用走了，換一個
      }
    }
    throw new RoomError('建立房間失敗，請再試一次');
  }

  static async join(uid, code, name) {
    if (!/^\d{4}$/.test(code)) throw new RoomError('房號是 4 位數字');
    const room = new Room(uid, code);
    const snap = await get(room.root);
    const data = snap.val();
    if (!data?.meta) throw new RoomError('找不到這個房間，請確認房號');
    const already = data.players?.[uid];
    if (!already) {
      if (data.meta.status !== 'waiting') throw new RoomError('這個房間已經開始遊戲了');
      const charIndex = await room.claimFreeChar(data.chars || {});
      if (charIndex < 0) throw new RoomError(`房間已滿（最多 ${CHARACTERS.length} 人）`);
      await set(child(room.root, `players/${uid}`), { name, joinedAt: serverTimestamp(), online: true });
    }
    await room.connect();
    return room;
  }

  // 重新整理頁面後回到原本的房間
  static async resume(uid) {
    const code = sessionStorage.getItem(SESSION_KEY);
    if (!code) return null;
    const room = new Room(uid, code);
    const snap = await get(child(room.root, `players/${uid}`));
    if (!snap.exists()) { sessionStorage.removeItem(SESSION_KEY); return null; }
    const meta = (await get(child(room.root, 'meta'))).val();
    if (!meta || meta.status === 'closed') { sessionStorage.removeItem(SESSION_KEY); return null; }
    await room.connect();
    return room;
  }

  async claimFreeChar(chars) {
    for (let i = 0; i < CHARACTERS.length; i++) {
      if (chars[i]) continue;
      const res = await runTransaction(child(this.root, `chars/${i}`), cur => (cur ? undefined : this.uid));
      if (res.committed) return i;
    }
    return -1;
  }

  async connect() {
    sessionStorage.setItem(SESSION_KEY, this.code);
    const me = child(this.root, `players/${this.uid}`);
    this.unsubs.push(onValue(ref(db, '.info/connected'), snap => {
      if (!snap.val()) return;
      onDisconnect(me).update({ online: false, lastSeen: serverTimestamp() });
      update(me, { online: true, lastSeen: serverTimestamp() });
    }));
    // 各部分資料分開監聽；全部第一次到齊之後才通知畫面，避免看到不完整的房間
    const keys = ['meta', 'players', 'chars', 'stats', 'orders', 'pos'];
    const loaded = new Set();
    await new Promise(resolve => {
      for (const key of keys) {
        this.unsubs.push(onValue(child(this.root, key), snap => {
          this.state[key] = snap.val() || (key === 'meta' ? null : {});
          if (!loaded.has(key)) {
            loaded.add(key);
            if (loaded.size === keys.length) resolve();
            return;
          }
          if (key !== 'pos') this.emit(key);
        }));
      }
    });
  }

  on(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  emit(key) { this.listeners.forEach(cb => cb(key, this.state)); }

  async leave() {
    sessionStorage.removeItem(SESSION_KEY);
    clearTimeout(this.hostTimer);
    const i = this.myChar();
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    const me = child(this.root, `players/${this.uid}`);
    await onDisconnect(me).cancel();
    const jobs = [remove(me), remove(child(this.root, `pos/${this.uid}`)), remove(child(this.root, `stats/${this.uid}`))];
    if (i >= 0) jobs.push(remove(child(this.root, `chars/${i}`)));
    await Promise.allSettled(jobs);
  }

  // ---------- 查詢 ----------
  get meta() { return this.state.meta; }
  isHost() { return this.state.meta?.host === this.uid; }
  myChar() { return this.charOf(this.uid); }
  charOf(uid) {
    const entry = Object.entries(this.state.chars).find(([, v]) => v === uid);
    return entry ? Number(entry[0]) : -1;
  }

  // 房間成員（照加入順序），附上角色
  members() {
    return Object.entries(this.state.players)
      .map(([uid, p]) => ({ uid, ...p, char: this.charOf(uid) }))
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  }

  onlineCount() {
    return this.members().filter(m => m.online).length;
  }

  // 本局排行（只算這一局的分數）
  ranking() {
    const round = this.state.meta?.round;
    return this.members()
      .map(m => {
        const s = this.state.stats[m.uid];
        const cur = s?.round === round ? s : {};
        return { ...m, money: cur.money || 0, delivered: cur.delivered || 0, firstTry: cur.firstTry || 0, bestCombo: cur.bestCombo || 0 };
      })
      .sort((a, b) => b.money - a.money);
  }

  // 房主斷線時，由最早加入且在線的玩家接手
  async checkHost() {
    const host = this.state.players[this.state.meta?.host];
    if (host?.online) return;
    if (host && serverNow() - (host.lastSeen || 0) < HOST_GRACE_MS) {
      // 房主可能只是重新整理，等一下再判斷
      clearTimeout(this.hostTimer);
      this.hostTimer = setTimeout(() => this.checkHost(), HOST_GRACE_MS);
      return;
    }
    const next = this.members().find(m => m.online);
    if (next?.uid === this.uid) await update(child(this.root, 'meta'), { host: this.uid });
  }

  // ---------- 等候室 ----------
  async pickChar(i) {
    const old = this.myChar();
    if (old === i) return true;
    const res = await runTransaction(child(this.root, `chars/${i}`), cur => (cur ? undefined : this.uid));
    if (!res.committed) return false;
    if (old >= 0) await remove(child(this.root, `chars/${old}`));
    return true;
  }

  setSettings(settings) {
    return update(child(this.root, 'meta/settings'), settings);
  }

  async startGame() {
    const startAt = serverNow() + 4000;
    await remove(child(this.root, 'orders'));
    await update(child(this.root, 'meta'), {
      status: 'playing',
      round: (this.state.meta.round || 0) + 1,
      startAt,
      endAt: startAt + this.state.meta.settings.durationMin * 60 * 1000,
    });
  }

  endGame() {
    return update(child(this.root, 'meta'), { status: 'ended' });
  }

  backToLobby() {
    return Promise.all([
      remove(child(this.root, 'orders')),
      update(child(this.root, 'meta'), { status: 'waiting' }),
    ]);
  }

  // ---------- 遊戲中 ----------
  sendPos(x, y, flip, carry, now) {
    const key = `${Math.round(x)},${Math.round(y)},${flip ? 1 : 0},${carry}`;
    if (key === this.lastPosKey || now - this.lastPosAt < POS_INTERVAL) return;
    this.lastPosAt = now;
    this.lastPosKey = key;
    set(child(this.root, `pos/${this.uid}`), { x: Math.round(x), y: Math.round(y), f: flip ? 1 : 0, c: carry });
  }

  writeStats(stats) {
    return set(child(this.root, `stats/${this.uid}`), { ...stats, round: this.state.meta.round });
  }

  async claimOrder(id) {
    const res = await runTransaction(child(this.root, `orders/${id}`), cur => {
      if (cur === null) return cur; // 本地還沒有資料時 Firebase 會先傳 null
      if (cur.owner) return undefined;
      return { ...cur, owner: this.uid };
    });
    return res.committed && res.snapshot.val()?.owner === this.uid;
  }

  pauseOrder(id) {
    return update(child(this.root, `orders/${id}`), { pausedAt: serverNow() });
  }

  completeOrder(id) {
    return remove(child(this.root, `orders/${id}`));
  }

  // ---------- 房主專用 ----------
  addOrder(order) {
    const r = push(child(this.root, 'orders'));
    return set(r, order);
  }

  removeOrder(id) {
    return remove(child(this.root, `orders/${id}`));
  }

  releaseOrder(id) {
    return update(child(this.root, `orders/${id}`), { owner: null, pausedAt: null });
  }
}
