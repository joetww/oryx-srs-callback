# Oryx SRS Callback Service

這個服務是用來接收 SRS 串流伺服器的回呼訊息，並透過 Telegram 通知使用者。

## 功能

* 接收 SRS 的 `on_publish` 和 `on_unpublish` 回呼訊息。
* 驗證回呼訊息的來源。
* 發送 Telegram 通知。

## 安裝

1.  安裝 Node.js 和 npm。
2.  複製程式碼到你的伺服器。
3.  安裝 dependencies：
    ```bash
    npm install express fs morgan axios lodash
    ```

## 使用方法

1.  設定環境變數：
    *   `SRS_BEARER_TOKEN`:  用來取得 Secret Key 的 Bearer Token。
    *   `TELEGRAM_CHAT_ID`:  要接收通知的 Telegram 聊天室 ID。
    *   `TELEGRAM_BOT_TOKEN`:  你的 Telegram Bot Token。
2.  啟動服務：
    ```bash
    node oryx.js
    ```

## 其他說明

*   程式碼會將 HTTP 請求的資訊記錄到 `logs/access.log` 檔案中。
*   程式碼會將每個 HTTP 請求的詳細資訊記錄到 `logs/packets.log` 檔案中。
*   程式碼會將接收到的回呼訊息和處理結果記錄到 `logs/requests.log` 檔案中。
