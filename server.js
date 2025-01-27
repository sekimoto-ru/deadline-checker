const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// テンプレートエンジンの設定
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// 静的ファイルの提供
app.use(express.static('.'));

// ルートハンドラー
app.get('/', (req, res) => {
    res.render('index.html', {
        process: {
            env: {
                GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
                GOOGLE_SCOPES: process.env.GOOGLE_SCOPES
                // GOOGLE_SCOPES: process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/gmail.modify'
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
