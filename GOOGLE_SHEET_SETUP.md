# 將預約表單寫入 Google Sheet（Apps Script Web App）

火化服務網上預約表單，除了開 WhatsApp，還可以同步把每筆預約寫入 Google Sheet，方便日後接自動化（Zapier / Make / 通知 / 統計）。

## 一、建立 Google Sheet
1. 開一個新的 Google Sheet，命名例如 `Resoul 預約`。
2. 第一列填標題（可選，方便閱讀）：
   `時間 | 主人稱呼 | 聯絡電話 | 火化方案 | 寵物類型 | 體重 | 接送地點 | 目前情況 | 方便時間 | 備註 | 來源`

## 二、加入 Apps Script
1. 在該 Sheet 上方選單：**擴充功能 Extensions → Apps Script**。
2. 刪除預設內容，貼上以下代碼：

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var d = JSON.parse(e.postData.contents);
    sheet.appendRow([
      new Date(),
      d.name || '',
      d.phone || '',
      d.plan || '',
      d.pet || '',
      d.weight || '',
      d.place || '',
      d.situation || '',
      d.time || '',
      d.note || '',
      d.source || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 儲存（💾）。

## 三、部署成 Web App
1. 右上角 **部署 Deploy → 新增部署作業 New deployment**。
2. 類型選 **網頁應用程式 Web app**。
3. 設定：
   - **執行身分 Execute as**：`我 (你的帳戶)`
   - **誰可以存取 Who has access**：`任何人 Anyone`
4. 按 **部署 Deploy**，第一次會要你**授權 Authorize**（用你自己的 Google 帳戶批准）。
5. 複製 **網頁應用程式網址 Web app URL**（形如 `https://script.google.com/macros/s/XXXX/exec`）。

## 四、把網址交給 Claude / 填入代碼
把上面的 Web app URL 貼給我，我會填入 `js/resoul.js` 的 `SHEET_ENDPOINT`。
之後每次有人提交預約，Sheet 就會自動新增一行。

> 注意：Apps Script Web App 網址等於「任何人都可以 POST」的收集端。它只用於接收預約，不會回傳 Sheet 內容。若日後擔心垃圾提交，可在 `doPost` 加一個共用密鑰檢查。

## 五、私隱
此功能會把預約者的姓名、電話等個人資料寫入你的 Google Sheet（由你保管）。建議在 `privacy.html` 補一句：預約資料會儲存於我們的 Google 試算表以作聯絡與安排之用。
