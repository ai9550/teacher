// 畫面上的文字介面（大廳、等候室、HUD、結帳、結算），用 HTML 做比較清楚好讀
import { DIFFICULTY, BALANCE, CHARACTERS } from './config.js';

const $ = (root, sel) => root.querySelector(sel);
const hex = n => '#' + n.toString(16).padStart(6, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const NAME_KEY = 'nightMarket.name';
const BAD_WORDS = ['笨蛋', '白癡', '白痴', '智障', '幹', '靠北', '去死', '垃圾', '低能'];
export const cleanName = raw => {
  let name = String(raw || '').trim().slice(0, 8);
  BAD_WORDS.forEach(w => { name = name.split(w).join('＊'.repeat(w.length)); });
  return name;
};
const medal = i => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}`;

export class UI {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <section id="loading" class="screen"><div class="panel"><h1>🏮 夜市跑腿王</h1><p class="sub" id="loadingText">連線中…</p></div></section>

      <section id="home" class="screen" hidden>
        <div class="panel">
          <h1>🏮 夜市跑腿王</h1>
          <p class="sub">接單、取餐、送餐、算找零，看誰賺最多！</p>
          <label class="field"><span>你的名字</span><input id="nameInput" maxlength="8" placeholder="最多 8 個字" autocomplete="off"></label>
          <button id="createBtn" class="big">建立房間</button>
          <div class="divider">或是輸入房號加入</div>
          <div class="row">
            <input id="codeInput" class="code-input" inputmode="numeric" maxlength="4" placeholder="房號" autocomplete="off">
            <button id="joinBtn" class="big secondary">加入</button>
          </div>
          <p id="homeError" class="error"></p>
          <ol class="howto">
            <li>方向鍵 / WASD 移動</li>
            <li>走到頭上有餐點泡泡的客人旁，按 <kbd>空白鍵</kbd> 接單</li>
            <li>到攤位按 <kbd>空白鍵</kbd> 拿餐點（有些要站著等一下）</li>
            <li>回到客人身邊按 <kbd>空白鍵</kbd> 送餐，再算出要找多少錢</li>
            <li>拿錯了按 <kbd>Q</kbd> 丟掉</li>
          </ol>
        </div>
      </section>

      <section id="lobby" class="screen" hidden>
        <div class="panel wide">
          <div class="room-code">房號 <b id="roomCode"></b></div>
          <p class="sub">把房號告訴同學，最多 ${CHARACTERS.length} 人</p>
          <div class="field"><span>選角色</span><div id="charPicker" class="chars-grid"></div></div>
          <div class="field"><span>玩家（<i id="playerCount"></i>）</span><ul id="playerList" class="player-list"></ul></div>
          <div id="settingsBox"></div>
          <button id="startGameBtn" class="big">開始遊戲</button>
          <p id="waitHint" class="sub"></p>
          <button id="leaveBtn" class="link">離開房間</button>
        </div>
      </section>

      <section id="hud" hidden>
        <div class="topbar">
          <span id="time">⏱ 0:00</span>
          <span id="money">💰 $0</span>
          <span id="combo"></span>
        </div>
        <div id="board"></div>
        <ol id="rank"></ol>
        <div id="carry"></div>
        <div id="prompt"></div>
        <div id="toasts"></div>
      </section>

      <div id="countdown" hidden></div>

      <section id="checkout" class="screen dim" hidden>
        <div class="panel checkout">
          <h2>🧾 結帳</h2>
          <div id="bill"></div>
          <div id="paid"></div>
          <div class="question">要找多少錢？</div>
          <div id="answer" class="answer"></div>
          <div id="feedback"></div>
          <div id="keypad" class="keypad">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}
            <button data-k="back">⌫</button><button data-k="0">0</button><button data-k="ok" class="ok">✔</button>
          </div>
          <button id="revealOk" class="big" hidden>知道了</button>
        </div>
      </section>

      <section id="results" class="screen dim" hidden>
        <div class="panel wide">
          <h1>⏰ 收攤囉！</h1>
          <ol id="podium" class="podium"></ol>
          <div id="resultActions"></div>
        </div>
      </section>
    `;

    this.el = {};
    ['loading', 'loadingText', 'home', 'lobby', 'hud', 'countdown', 'checkout', 'results',
      'nameInput', 'createBtn', 'codeInput', 'joinBtn', 'homeError',
      'roomCode', 'charPicker', 'playerCount', 'playerList', 'settingsBox', 'startGameBtn', 'waitHint', 'leaveBtn',
      'time', 'money', 'combo', 'board', 'rank', 'carry', 'prompt', 'toasts',
      'bill', 'paid', 'answer', 'feedback', 'keypad', 'revealOk', 'podium', 'resultActions']
      .forEach(id => { this.el[id] = $(root, '#' + id); });

    // ---------- 首頁 ----------
    try { this.el.nameInput.value = localStorage.getItem(NAME_KEY) || ''; } catch { /* 無法使用 localStorage 就算了 */ }
    const readName = () => {
      const name = cleanName(this.el.nameInput.value);
      if (!name) { this.showError('請先輸入你的名字'); this.el.nameInput.focus(); return null; }
      try { localStorage.setItem(NAME_KEY, name); } catch { /* 略過 */ }
      return name;
    };
    this.el.createBtn.addEventListener('click', () => {
      const name = readName();
      if (name) this.busy(() => this.onCreate?.(name));
    });
    const join = () => {
      const name = readName();
      if (!name) return;
      const code = this.el.codeInput.value.trim();
      if (!/^\d{4}$/.test(code)) { this.showError('房號是 4 位數字'); return; }
      this.busy(() => this.onJoin?.(code, name));
    };
    this.el.joinBtn.addEventListener('click', join);
    this.el.codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') join(); });
    this.el.codeInput.addEventListener('input', () => { this.el.codeInput.value = this.el.codeInput.value.replace(/\D/g, ''); });

    // ---------- 等候室 ----------
    this.el.charPicker.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (btn && !btn.disabled) this.onPickChar?.(Number(btn.dataset.i));
    });
    this.el.settingsBox.addEventListener('click', e => {
      const btn = e.target.closest('button[data-key]');
      if (!btn) return;
      const key = btn.dataset.key;
      this.onSettings?.({ [key]: key === 'difficulty' ? btn.dataset.value : Number(btn.dataset.value) });
    });
    this.el.startGameBtn.addEventListener('click', () => this.onStartGame?.());
    this.el.leaveBtn.addEventListener('click', () => this.onLeave?.());

    // ---------- 結帳鍵盤 ----------
    this.el.keypad.addEventListener('pointerdown', e => {
      const btn = e.target.closest('button');
      if (btn) { e.preventDefault(); this.keypadPress(btn.dataset.k); }
    });
    window.addEventListener('keydown', e => {
      if (!this.checkoutState) return;
      if (/^[0-9]$/.test(e.key)) this.keypadPress(e.key);
      else if (e.key === 'Backspace') this.keypadPress('back');
      else if (e.key === 'Enter') {
        if (!this.el.revealOk.hidden) this.el.revealOk.click();
        else this.keypadPress('ok');
      } else return;
      e.preventDefault();
    });
    this.el.revealOk.addEventListener('click', () => this.closeCheckout());

    this.lastPrompt = null;
  }

  async busy(fn) {
    this.root.querySelectorAll('#home button').forEach(b => { b.disabled = true; });
    this.showError('');
    try { await fn(); } catch (err) { this.showError(err.message || String(err)); }
    this.root.querySelectorAll('#home button').forEach(b => { b.disabled = false; });
  }

  showError(text) { this.el.homeError.textContent = text; }

  hideAll() {
    ['loading', 'home', 'lobby', 'hud', 'countdown', 'checkout', 'results'].forEach(k => { this.el[k].hidden = true; });
    this.checkoutState = null;
    clearInterval(this.countdownTimer);
  }

  showLoading(text) {
    this.hideAll();
    this.el.loadingText.textContent = text;
    this.el.loading.hidden = false;
  }

  showHome(error = '') {
    this.hideAll();
    this.el.home.hidden = false;
    this.showError(error);
  }

  // ---------- 等候室 ----------
  showLobby(room) {
    if (this.el.lobby.hidden) { this.hideAll(); this.el.lobby.hidden = false; }
    const { meta } = room.state;
    const members = room.members();
    const mine = room.myChar();
    const isHost = room.isHost();

    this.el.roomCode.textContent = room.code;
    this.el.charPicker.innerHTML = CHARACTERS.map((c, i) => {
      const owner = room.state.chars[i];
      const taken = owner && owner !== room.uid;
      return `<button data-i="${i}" class="${i === mine ? 'on' : ''}" ${taken ? 'disabled' : ''} style="--c:${hex(c.color)}">
        <span class="swatch"></span>${c.name}${taken ? `<small>${esc(room.state.players[owner]?.name ?? '')}</small>` : ''}</button>`;
    }).join('');

    this.el.playerCount.textContent = `${members.length} / ${CHARACTERS.length}`;
    this.el.playerList.innerHTML = members.map(m => {
      const c = CHARACTERS[m.char];
      return `<li class="${m.online ? '' : 'offline'}"><span class="swatch" style="--c:${c ? hex(c.color) : '#555'}"></span>
        ${esc(m.name)}${m.uid === room.uid ? '（你）' : ''}${m.uid === meta.host ? '<em>房主</em>' : ''}${m.online ? '' : '<small>離線</small>'}</li>`;
    }).join('');

    const s = meta.settings;
    const choice = (key, value, label) =>
      `<button data-key="${key}" data-value="${value}" class="${String(s[key]) === String(value) ? 'on' : ''}" ${isHost ? '' : 'disabled'}>${label}</button>`;
    this.el.settingsBox.innerHTML = `
      <div class="field"><span>找零難度</span><div class="choices">
        ${Object.entries(DIFFICULTY).map(([k, d]) => choice('difficulty', k, d.label)).join('')}</div></div>
      <div class="field"><span>遊戲時間</span><div class="choices">
        ${BALANCE.durationOptionsMin.map(m => choice('durationMin', m, `${m} 分鐘`)).join('')}</div></div>`;

    this.el.startGameBtn.hidden = !isHost;
    this.el.waitHint.textContent = isHost ? '人到齊了就按開始（1 個人也能玩）' : '等房主按開始…';
  }

  // ---------- HUD ----------
  showHud() {
    this.hideAll();
    this.el.hud.hidden = false;
    this.el.toasts.innerHTML = '';
    this.lastPrompt = null;
  }

  startCountdown(startAt, now) {
    const el = this.el.countdown;
    el.hidden = false;
    clearInterval(this.countdownTimer);
    const tick = () => {
      const left = startAt - now();
      if (left <= -500) { el.hidden = true; clearInterval(this.countdownTimer); return; }
      el.textContent = left > 0 ? Math.ceil(left / 1000) : '開始！';
    };
    tick();
    this.countdownTimer = setInterval(tick, 100);
  }

  setRankTop(px) { this.el.rank.style.top = `${px}px`; }

  updateHud(d) {
    this.el.time.textContent = `⏱ ${fmtTime(d.timeLeft)}`;
    this.el.time.classList.toggle('hurry', d.timeLeft < 30000);
    this.el.money.textContent = `💰 $${d.money}`;
    this.el.combo.textContent = d.combo > 1 ? `🔥 連擊 ×${d.combo}` : '';
    this.el.combo.hidden = d.combo <= 1;

    this.el.board.innerHTML = d.orders.map(o => `
      <div class="order ${o.mine ? 'mine' : ''}" style="--c:${d.color}">
        <div class="head"><b>${o.table}號桌</b> ${o.customer}<span class="tag">${o.mine ? '你的單' : '可接'}</span></div>
        <div class="items">${o.items}${!o.mine ? '' : o.paying ? '<small>🧾 結帳中</small>' : o.missing ? `<small>還缺 ${o.missing}</small>` : '<small>✅ 可以送了</small>'}</div>
        <div class="bar"><i style="width:${(o.frac * 100).toFixed(1)}%;background:${o.frac > 0.5 ? '#2ecc71' : o.frac > 0.25 ? '#f1c40f' : '#e74c3c'}"></i></div>
      </div>`).join('') || '<div class="order empty">等待客人上門…</div>';

    this.el.rank.innerHTML = d.ranking.map((r, i) => {
      const c = CHARACTERS[r.char];
      return `<li class="${r.uid === d.me ? 'me' : ''} ${r.online ? '' : 'offline'}">
        <span class="pos">${medal(i)}</span><span class="swatch" style="--c:${c ? hex(c.color) : '#555'}"></span>
        <span class="nm">${esc(r.name)}</span><b>$${r.money}</b></li>`;
    }).join('');

    const slots = Array.from({ length: d.maxCarry }, (_, i) => `<span class="slot">${d.carrying[i] ?? ''}</span>`).join('');
    this.el.carry.innerHTML = `<div class="label">手上</div>${slots}<div class="hint">Q 丟掉</div>`;
  }

  setPrompt(text) {
    if (text === this.lastPrompt) return;
    this.lastPrompt = text;
    this.el.prompt.textContent = text;
    this.el.prompt.hidden = !text;
  }

  toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    this.el.toasts.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  // ---------- 結帳 ----------
  openCheckout({ order, items, onSubmit, onClose }) {
    this.checkoutState = { order, items, onSubmit, onClose, input: '', done: false };
    this.el.bill.innerHTML = items.map(s => `<div class="line"><span>${s.emoji} ${s.food}</span><b>$${s.price}</b></div>`).join('');
    this.el.paid.innerHTML = `${order.customer}付給你 <b class="cash">💵 $${order.paid}</b>`;
    this.el.feedback.textContent = '';
    this.el.feedback.className = '';
    this.el.keypad.classList.remove('disabled');
    this.el.revealOk.hidden = true;
    this.renderAnswer();
    this.el.checkout.hidden = false;
  }

  renderAnswer() {
    const s = this.checkoutState;
    this.el.answer.textContent = s.input === '' ? '？' : `$${s.input}`;
  }

  keypadPress(k) {
    const s = this.checkoutState;
    if (!s || s.done) return;
    if (k === 'back') s.input = s.input.slice(0, -1);
    else if (k === 'ok') {
      if (s.input === '') return;
      this.handleResult(s.onSubmit(Number(s.input)));
      return;
    } else if (s.input.length < 3) s.input = (s.input === '0' ? '' : s.input) + k;
    this.renderAnswer();
  }

  handleResult(r) {
    const s = this.checkoutState;
    if (!r) return;
    const fb = this.el.feedback;
    if (r.result === 'wrong') {
      fb.className = 'wrong';
      fb.textContent = `不對喔，再算一次！（還有 ${r.attemptsLeft} 次機會，小費會變少）`;
      s.input = '';
      this.renderAnswer();
      this.el.answer.classList.remove('shake');
      void this.el.answer.offsetWidth;
      this.el.answer.classList.add('shake');
      return;
    }
    s.done = true;
    this.el.keypad.classList.add('disabled');
    const p = r.pay;
    const parts = [`基本 $${p.base}`];
    if (p.speedTip) parts.push(`小費 $${p.speedTip}`);
    if (p.comboBonus) parts.push(`連擊 $${p.comboBonus}`);
    if (r.result === 'correct') {
      fb.className = 'right';
      fb.innerHTML = `答對了！🎉 <b>+$${p.total}</b><br><small>${parts.join('＋')}</small>`;
      setTimeout(() => { if (this.checkoutState === s) this.closeCheckout(); }, 1500);
    } else {
      const { order, items } = s;
      const sum = items.length > 1 ? `${items.map(i => `$${i.price}`).join(' + ')} = $${order.total}，` : '';
      fb.className = 'reveal';
      fb.innerHTML = `正確答案是 <b>$${order.change}</b><br>${sum}$${order.paid} − $${order.total} = $${order.change}<br><small>這次只拿到基本報酬 +$${p.total}</small>`;
      this.el.answer.textContent = `$${order.change}`;
      this.el.revealOk.hidden = false;
    }
  }

  closeCheckout() {
    const s = this.checkoutState;
    this.el.checkout.hidden = true;
    this.checkoutState = null;
    s?.onClose?.();
  }

  // ---------- 結算 ----------
  showResults(room, { onAgain, onLobby, onLeave }) {
    if (this.el.results.hidden) {
      this.el.checkout.hidden = true;
      this.checkoutState = null;
      this.el.countdown.hidden = true;
      this.setPrompt('');
      this.el.results.hidden = false;
    }
    this.el.podium.innerHTML = room.ranking().map((r, i) => {
      const c = CHARACTERS[r.char];
      const rate = r.delivered ? Math.round((r.firstTry / r.delivered) * 100) : 0;
      return `<li class="${r.uid === room.uid ? 'me' : ''}">
        <span class="pos">${medal(i)}</span><span class="swatch" style="--c:${c ? hex(c.color) : '#555'}"></span>
        <span class="nm">${esc(r.name)}${r.uid === room.uid ? '（你）' : ''}</span>
        <span class="detail">送 ${r.delivered} 單・一次答對 ${rate}%</span><b>$${r.money}</b></li>`;
    }).join('');
    const host = room.isHost();
    this.el.resultActions.innerHTML = host
      ? `<div class="row"><button class="big" data-act="again">再玩一局</button><button class="big secondary" data-act="lobby">回等候室</button></div>`
      : `<p class="sub">等房主決定要不要再玩一局…</p>`;
    this.el.resultActions.innerHTML += `<button class="link" data-act="leave">離開房間</button>`;
    this.el.resultActions.onclick = e => {
      const act = e.target.closest('button')?.dataset.act;
      if (act === 'again') onAgain();
      else if (act === 'lobby') onLobby();
      else if (act === 'leave') onLeave();
    };
  }
}
