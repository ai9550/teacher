// Firebase 連線設定（匿名登入 + Realtime Database）
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, signInAnonymously, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBFzKZyy3sUSfh0GkMcYOtC1e7NyqEfyOM',
  authDomain: 'mygame-1af09.firebaseapp.com',
  databaseURL: 'https://mygame-1af09-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'mygame-1af09',
  storageBucket: 'mygame-1af09.firebasestorage.app',
  messagingSenderId: '388340775447',
  appId: '1:388340775447:web:0769fb994834e68939ba52',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// 伺服器時間：所有玩家用同一個時鐘算訂單倒數與遊戲時間
let offset = 0;
onValue(ref(db, '.info/serverTimeOffset'), snap => { offset = snap.val() || 0; });
export const serverNow = () => Date.now() + offset;

// 每個分頁各自一個匿名身分（重新整理還是同一人，方便斷線重連；同一台電腦開多個分頁也能測多人）
export async function signIn() {
  await setPersistence(auth, browserSessionPersistence);
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}
