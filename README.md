# 豪小老師教學

## 大家來找碴圖卡生成器

目前的圖卡生成器已改用 OpenAI GPT-Image-2，保留原本的語詞輸入、原圖／找碴版生成、差異類型與批次處理功能。生成完成後，按「儲存全部到圖庫」，圖片會寫入 `大家來找碴圖庫`。

### 啟動方式

1. 將 `.env.example` 複製成 `.env.local`。
2. 在 `.env.local` 填入自己的 `OPENAI_API_KEY`。
3. 在此資料夾執行 `npm start`。
4. 開啟 <http://127.0.0.1:4173>。

`.env.local` 已列入 `.gitignore`，不會被提交到 GitHub。
