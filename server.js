const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// 静的ファイルの提供
app.use(express.static('.'));

// 認証設定を提供するエンドポイント
app.get('/api/auth-config', (req, res) => {
    res.json({
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        SCOPES: process.env.SCOPE || 'https://www.googleapis.com/auth/gmail.readonly',
        DISCOVERY_DOC: process.env.DISCOVERY_DOC || 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
    });
});

// ルートハンドラー
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
