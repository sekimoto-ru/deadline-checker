const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// EJS テンプレートエンジンを使用
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 認証設定を提供するエンドポイント
app.get('/api/auth-config', (req, res) => {
    res.json({
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        SCOPES: process.env.SCOPE || 'https://www.googleapis.com/auth/gmail.readonly',
        DISCOVERY_DOC: process.env.DISCOVERY_DOC || 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
    });
});

// ルートハンドラー (EJS テンプレートのレンダリング)
app.get('/', (req, res) => {
    res.render('index', { title: 'Welcome to the Home Page' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});