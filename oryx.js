// 將 dotenv 載入
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const axios = require('axios');
const _ = require('lodash');

const app = express();
const port = 3033;

// 創建 logs 目錄（若不存在）
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// 設定 morgan 來記錄請求資料
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// Middleware 來解析 JSON 請求
app.use(express.json());

// 取得 secret key 的函數
async function getSecret() {
    try {
        const response = await axios.post(
            'http://127.0.0.1/terraform/v1/hooks/srs/secret/query',
            {},
            {
                headers: {
                    'Authorization': `Bearer ${process.env.SRS_BEARER_TOKEN}`, // 使用環境變數中的 Token
                    'Content-Type': 'application/json'
                }
            }
        );

        const secret = _.get(response, 'data.data.publish');
        if (!secret) {
            throw new Error('Secret not found in response.');
        }
        return secret;
    } catch (error) {
        console.error('Error fetching secret:', error);
        return null;
    }
}

// 檢查 secret 的 middleware
async function checkSecret(req, res, next) {
    const param = req.body.param || '';
    const fetchedSecret = await getSecret();
    const match = param.match(/secret=([^&]*)/);
    const secretFromParam = match ? match[1] : null;

    if (!fetchedSecret || secretFromParam !== fetchedSecret) {
        return res.status(403).send('ERROR');
    }

    next();
}

// 發送訊息到 Telegram 的函數
async function sendTelegramMessage(action, vhost, app, stream) {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const message = `\`\`\`\nAction: ${action}\nVHost: ${vhost}\nApp: ${app}\nStream: ${stream}\n\`\`\``; // 使用 monospace 格式

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const data = {
        chat_id: chatId,
        text: message,
        parse_mode: 'MarkdownV2' // 使用 MarkdownV2 模式，以支援 monospace 格式
    };

    try {
        const response = await axios.post(url, data);
        //console.log('Telegram message sent successfully:', response.data);
    } catch (error) {
        console.error('Error sending Telegram message:', error.response ? error.response.data : error.message);
    }
}


app.post('/callback', async (req, res) => {
    console.log('Request body:', req.body); // 打印請求的整個 body

    const logData = {
        timestamp: new Date(),
        body: req.body,
        query: req.query,
        headers: req.headers,
    };

    fs.appendFile(path.join(logsDir, 'requests.log'), JSON.stringify(logData, null, 2) + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });

    const action = req.body.action; // 根據 action 進行判斷
    console.log('Action:', action); // 打印 action

    // 處理 on_unpublish 的情況，不進行檢查
    if (action === 'on_unpublish') {
        const vhost = req.body.vhost;
        const app = req.body.app;
        const stream = req.body.stream;

        // 直接發送 Telegram 通知
        await sendTelegramMessage(action, vhost, app, stream);

        // 返回 200 OK
        const response = { code: 0 };
        return res.status(200).json(response);
    }

    // 對於 on_publish 的情況，進行驗證檢查
    if (action === 'on_publish') {
        await checkSecret(req, res, async () => {
            const vhost = req.body.vhost;
            const app = req.body.app;
            const stream = req.body.stream;

            // 發送 Telegram 通知
            await sendTelegramMessage(action, vhost, app, stream);

            // 返回 200 OK
            const response = { code: 0 };
            return res.status(200).json(response);
        });
}

});


// 啟動伺服器並觸發一次 getSecret
app.listen(port, async () => {
    console.log(`Oryx SRS callback service is running on http://localhost:${port}`);
    await getSecret();
});

