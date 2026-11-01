// 暫時素材：用程式畫出 16px 像素圖。之後換成老師繪製的 PNG（同樣的 key）即可。
import { STALLS, CHARACTERS, TILE } from './config.js';

function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const px = (color, x, y, pw = 1, ph = 1) => { g.fillStyle(color, 1); g.fillRect(x, y, pw, ph); };
  draw(px);
  g.generateTexture(key, w, h);
  g.destroy();
}

function person(px, body, skin = 0xf2c9a0, hair = 0x3b2a1a, pants = 0x2c3e50) {
  px(hair, 4, 1, 8, 3);          // 頭髮
  px(skin, 4, 4, 8, 6);          // 臉
  px(hair, 4, 4, 1, 2); px(hair, 11, 4, 1, 2);
  px(0x222222, 6, 6); px(0x222222, 9, 6); // 眼睛
  px(body, 3, 10, 10, 8);        // 身體
  px(skin, 2, 11, 1, 5); px(skin, 13, 11, 1, 5); // 手
  px(pants, 4, 18, 3, 5); px(pants, 9, 18, 3, 5); // 腳
  px(0x111111, 4, 23, 3, 1); px(0x111111, 9, 23, 3, 1);
}

export function makeTextures(scene) {
  make(scene, 'ground', TILE, TILE, px => {
    px(0x3a3030, 0, 0, 16, 16);
    [[2, 3], [9, 1], [13, 7], [5, 11], [11, 13], [1, 14]].forEach(([x, y]) => px(0x453a38, x, y));
  });
  make(scene, 'wall', TILE, TILE, px => {
    px(0x5a2e2e, 0, 0, 16, 16);
    px(0x6e3a36, 0, 0, 7, 3); px(0x6e3a36, 8, 0, 8, 3);
    px(0x6e3a36, 0, 4, 3, 3); px(0x6e3a36, 4, 4, 8, 3); px(0x6e3a36, 13, 4, 3, 3);
    px(0x6e3a36, 0, 8, 7, 3); px(0x6e3a36, 8, 8, 8, 3);
    px(0x6e3a36, 0, 12, 3, 3); px(0x6e3a36, 4, 12, 8, 3); px(0x6e3a36, 13, 12, 3, 3);
  });
  make(scene, 'obstacle', TILE, TILE, px => {
    px(0x3a3030, 0, 0, 16, 16);
    px(0x2e7d32, 4, 3, 8, 12); px(0x43a047, 3, 2, 10, 2); px(0x1b5e20, 5, 6, 1, 7); px(0x1b5e20, 10, 6, 1, 7);
  });
  make(scene, 'table', TILE, TILE, px => {
    px(0x3a3030, 0, 0, 16, 16);
    px(0x9c6b3e, 0, 3, 16, 9); px(0xb98552, 0, 3, 16, 2); px(0x6d4a2a, 1, 12, 2, 3); px(0x6d4a2a, 13, 12, 2, 3);
  });
  make(scene, 'seat', TILE, TILE, px => {
    px(0x3a3030, 0, 0, 16, 16);
    px(0xc0392b, 4, 6, 8, 6); px(0x922b21, 5, 12, 1, 3); px(0x922b21, 10, 12, 1, 3);
  });
  make(scene, 'lantern', 8, 10, px => {
    px(0x222222, 3, 0, 2, 1); px(0xe74c3c, 1, 1, 6, 7); px(0xf5b041, 2, 3, 4, 3); px(0xf1c40f, 3, 8, 2, 2);
  });

  // 攤位：4×2 格，上方有條紋遮雨棚
  STALLS.forEach((s, i) => {
    make(scene, `stall${i}`, TILE * 4, TILE * 2, px => {
      px(0x6d4a2a, 0, 0, 64, 32);
      for (let x = 0; x < 64; x += 8) px(x % 16 === 0 ? s.color : 0xf5f5f5, x, 0, 8, 10);
      px(0x000000, 0, 10, 64, 1);
      px(0xd7b98e, 2, 20, 60, 10);   // 檯面
      px(0x8d6e48, 2, 29, 60, 3);
    });
  });

  CHARACTERS.forEach(c => {
    make(scene, c.id, TILE, 24, px => {
      person(px, c.color, 0xf2c9a0, 0x3b2a1a, 0x34495e);
      px(c.color, 3, 0, 10, 2); px(c.color, 3, 2, 12, 1); // 跑腿帽
    });
  });

  const npcColors = [0x7f8c8d, 0x95a5a6, 0x5d6d7e, 0x8e7f6f];
  npcColors.forEach((c, i) => make(scene, `npc${i}`, TILE, 24, px => person(px, c, 0xe0b48c, 0x222222, 0x4d4d4d)));

  const custColors = [0x16a085, 0xd35400, 0x8e44ad, 0x2980b9];
  custColors.forEach((c, i) => make(scene, `customer${i}`, TILE, 24, px => person(px, c, 0xf0c39a, 0x5b3a1a, 0x2c3e50)));
}
