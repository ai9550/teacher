# 線上題庫上傳服務設定步驟

exam語音報讀程式步驟二的「方式三：上傳到線上題庫」靠這個服務運作。
**密碼與權杖只存在 Google 的指令碼屬性，不要寫進任何網頁或 repo 檔案。**

## 1. 建立 GitHub 權杖（以 ai9550 帳號登入）

1. 開啟 <https://github.com/settings/personal-access-tokens/new>
2. Token name 填 `exam-upload`，Expiration 選一年（到期後重做此步驟與步驟 3）
3. Repository access 選 **Only select repositories** → `ai9550/teacher`
4. Permissions → Repository permissions → **Contents** 設為 **Read and write**
5. 按 Generate token，複製產生的權杖

## 2. 建立 Apps Script 專案

1. 開啟 <https://script.google.com/home/projects/create>，專案命名為 `exam-upload`
2. 把預設內容全部換成本資料夾 `Code.gs` 的內容，按儲存

## 3. 設定密碼與權杖

左側齒輪「專案設定」→ 最下方「指令碼屬性」→ 新增兩筆：

| 屬性 | 值 |
| --- | --- |
| `UPLOAD_PASSWORD` | 上傳密碼 |
| `GITHUB_TOKEN` | 步驟 1 複製的權杖 |

## 4. 部署

1. 右上角「部署」→「新增部署作業」→ 類型選「網頁應用程式」
2. 執行身分：**我**；誰可以存取：**所有人**
3. 按部署，依畫面授權，複製結尾是 `/exec` 的網址

## 5. 接上網頁

把 `/exec` 網址填進 `exam語音報讀程式步驟二.html` 的 `UPLOAD_ENDPOINT`，推送到 GitHub。

## 之後要改

- **改密碼或權杖**：改指令碼屬性即可，不必重新部署。
- **改 Code.gs**：「部署」→「管理部署作業」→ 編輯 → 版本選「新版本」，網址不變。

## 這個服務的保護

- 伺服器端驗證密碼，連續輸錯 10 次暫停上傳 10 分鐘
- 只寫入 `exam paper2` 資料夾，只接受內容確實是 PDF 的檔案，單檔上限 25 MB
- 同名檔案要使用者確認才覆蓋；舊版本仍保留在 Git 歷史中
