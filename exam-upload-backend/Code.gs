/**
 * exam語音報讀程式步驟二「方式三：上傳到線上題庫」的中繼服務（Google Apps Script）。
 *
 * 網頁是公開的靜態檔案，不能存放密碼或 GitHub 權杖，所以由這支程式負責：
 *   1. 在伺服器端驗證上傳密碼
 *   2. 檢查檔案確實是 PDF
 *   3. 用權杖把檔案寫進 ai9550/teacher 的 exam paper2 資料夾
 *
 * 這個檔案不含任何機密，可以放在公開 repo。
 * 密碼與權杖都存在「指令碼屬性」(Script Properties)，設定步驟見同資料夾的 README.md：
 *   UPLOAD_PASSWORD  上傳密碼
 *   GITHUB_TOKEN     只授權 ai9550/teacher 內容寫入的 fine-grained 權杖
 */

var OWNER = 'ai9550';
var REPO = 'teacher';
var BRANCH = 'main';
var FOLDER = 'exam paper2';
var MAX_BYTES = 25 * 1024 * 1024; // 單檔上限 25 MB（網頁端也用同樣的上限）
var MAX_FAILS = 10;               // 連續輸錯幾次密碼後暫停上傳
var LOCK_SECONDS = 600;           // 暫停與錯誤計數的時間（秒）
var FAIL_KEY = 'failedPasswordCount';

function doPost(e) {
  var result;
  try {
    result = handleUpload_(JSON.parse(e.postData.contents));
  } catch (err) {
    console.error(err);
    result = fail_('SERVER_ERROR', '上傳服務發生錯誤，請稍後再試。');
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpload_(req) {
  var props = PropertiesService.getScriptProperties();
  var password = props.getProperty('UPLOAD_PASSWORD');
  var token = props.getProperty('GITHUB_TOKEN');
  if (!password || !token) {
    return fail_('NOT_CONFIGURED', '上傳服務尚未設定完成（缺少指令碼屬性）。');
  }

  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get(FAIL_KEY) || 0);
  if (fails >= MAX_FAILS) {
    return fail_('LOCKED', '密碼錯誤次數過多，請 10 分鐘後再試。');
  }
  if (String(req.password || '') !== password) {
    cache.put(FAIL_KEY, String(fails + 1), LOCK_SECONDS);
    return fail_('BAD_PASSWORD', '密碼錯誤，無法上傳。');
  }
  cache.remove(FAIL_KEY);

  var name = cleanFileName_(req.name);
  if (!name) {
    return fail_('INVALID_FILE', '檔名不正確，只接受 .pdf 檔案。');
  }

  var bytes;
  try {
    bytes = Utilities.base64Decode(String(req.contentBase64 || ''));
  } catch (err) {
    return fail_('INVALID_FILE', '檔案內容無法讀取，請重新選擇檔案。');
  }
  if (bytes.length > MAX_BYTES) {
    return fail_('TOO_LARGE', '檔案超過 25 MB，無法上傳。');
  }
  if (!isPdf_(bytes)) {
    return fail_('INVALID_FILE', '這個檔案不是有效的 PDF。');
  }

  // 同時有人上傳時排隊，避免 GitHub 回應提交衝突
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return commitToGitHub_(name, bytes, req.overwrite === true, token);
  } finally {
    lock.releaseLock();
  }
}

function commitToGitHub_(name, bytes, overwrite, token) {
  var url = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' +
    encodeURIComponent(FOLDER) + '/' + encodeURIComponent(name);

  var existing = gitHubRequest_(url + '?ref=' + BRANCH, 'get', token);
  var sha = null;
  if (existing.status === 200) {
    if (!overwrite) {
      return fail_('EXISTS', '題庫已有同名檔案：' + name);
    }
    sha = existing.body.sha;
  } else if (existing.status !== 404) {
    return gitHubFailure_(existing.status);
  }

  var payload = {
    message: (sha ? '更新題庫考卷：' : '新增題庫考卷：') + name,
    content: Utilities.base64Encode(bytes),
    branch: BRANCH
  };
  if (sha) payload.sha = sha;

  var saved = gitHubRequest_(url, 'put', token, payload);
  if (saved.status !== 200 && saved.status !== 201) {
    return gitHubFailure_(saved.status);
  }
  return { ok: true, name: name, downloadUrl: saved.body.content.download_url };
}

function gitHubRequest_(url, method, token, payload) {
  var options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  var response = UrlFetchApp.fetch(url, options);
  var status = response.getResponseCode();
  var text = response.getContentText();
  if (status >= 400 && status !== 404) {
    console.error('GitHub ' + method + ' ' + status + ': ' + text);
  }
  var body = null;
  try { body = JSON.parse(text); } catch (err) { /* 錯誤頁可能不是 JSON */ }
  return { status: status, body: body };
}

function gitHubFailure_(status) {
  if (status === 401 || status === 403) {
    return fail_('GITHUB_AUTH', 'GitHub 權杖失效或權限不足，請管理者更新權杖。');
  }
  return fail_('GITHUB_ERROR', '寫入 GitHub 失敗（代碼 ' + status + '），請稍後再試。');
}

/** 把檔名整理成可安全寫入資料夾的名稱；不合格時回傳空字串。 */
function cleanFileName_(rawName) {
  var name = String(rawName || '')
    .replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/^[.\s]+/, '')
    .trim();
  if (!/\.pdf$/i.test(name) || name.length > 150) return '';
  var base = name.slice(0, -4);
  if (!base.trim()) return '';
  // 副檔名統一小寫：方式二的清單只認小寫 .pdf
  return base + '.pdf';
}

function isPdf_(bytes) {
  var magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  if (bytes.length < magic.length) return false;
  for (var i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

function fail_(code, message) {
  return { ok: false, code: code, error: message };
}
