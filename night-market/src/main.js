import { GameScene } from './scenes/GameScene.js';
import { UI } from './ui.js';
import { signIn } from './net/firebase.js';
import { Room } from './net/room.js';

const ui = new UI(document.getElementById('ui'));
let uid = null;
let room = null;
let game = null;
let playingRound = null;

function scene() {
  return game?.scene.getScene('game');
}

function startScene() {
  if (!game) {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#1a1414',
      pixelArt: true,
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      physics: { default: 'arcade', arcade: { debug: false } },
    });
    game.scene.add('game', GameScene, true, { room, ui });
    if (new URLSearchParams(location.search).has('debug')) window.game = game; // 測試用
  } else {
    game.scene.start('game', { room, ui });
  }
}

function stopScene() {
  if (game?.scene.isActive('game')) game.scene.stop('game');
  playingRound = null;
}

function onRoomChange() {
  if (!room) return;
  const { meta, players } = room.state;
  if (!meta || !players[uid]) {
    // 房間不見了或被移出
    leaveRoom('你已經離開房間');
    return;
  }
  room.checkHost();
  if (meta.status === 'waiting') {
    stopScene();
    ui.showLobby(room);
  } else if (meta.status === 'playing') {
    if (playingRound !== meta.round) {
      playingRound = meta.round;
      startScene();
    }
  } else if (meta.status === 'ended') {
    if (playingRound !== meta.round) {
      // 重新整理時遊戲已結束：直接看結果
      playingRound = meta.round;
      ui.hideAll();
    }
    if (game?.scene.isActive('game')) scene().finish();
    ui.showResults(room, {
      onAgain: () => room.startGame(),
      onLobby: () => room.backToLobby(),
      onLeave: () => leaveRoom(),
    });
  }
}

function enterRoom(r) {
  room = r;
  room.on(onRoomChange);
  onRoomChange();
}

async function leaveRoom(message = '') {
  const r = room;
  room = null;
  stopScene();
  if (r) await r.leave().catch(() => {});
  ui.showHome(message);
}

ui.onCreate = async name => enterRoom(await Room.create(uid, name));
ui.onJoin = async (code, name) => enterRoom(await Room.join(uid, code, name));
ui.onPickChar = async i => {
  if (!(await room.pickChar(i))) ui.showLobby(room);
};
ui.onSettings = s => room.setSettings(s);
ui.onStartGame = () => room.startGame();
ui.onLeave = () => leaveRoom();

(async () => {
  ui.showLoading('連線中…');
  try {
    uid = await signIn();
    const resumed = await Room.resume(uid);
    if (resumed) enterRoom(resumed);
    else ui.showHome();
  } catch (err) {
    console.error(err);
    ui.showLoading('連線失敗，請重新整理頁面再試一次');
  }
})();
