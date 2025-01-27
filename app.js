const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// ミドルウェアの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// OAuth2クライアントの設定
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// Gmail APIの初期化
const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
});

// ルート設定
app.get('/', (req, res) => {
    if (!oauth2Client.credentials) {
        // 認証URLの生成
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/gmail.readonly']
        });
        res.render('index', {
            authUrl,
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
            SCOPES: process.env.SCOPES
        });
    } else {
        res.render('index', { 
            authUrl: null,
            deadlines: [] // ここに締切情報が入ります
        });
    }
});

// OAuth2コールバック
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        res.redirect('/');
    } catch (error) {
        console.error('Error getting oauth tokens:', error);
        res.status(500).send('認証エラーが発生しました');
    }
});

// メールから締切を取得するAPI
app.get('/api/deadlines', async (req, res) => {
    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'deadline OR 締切 OR 期限'
        });

        const deadlines = [];
        const messages = response.data.messages || [];

        for (const message of messages) {
            const messageDetails = await gmail.users.messages.get({
                userId: 'me',
                id: message.id
            });

            const subject = messageDetails.data.payload.headers
                .find(header => header.name.toLowerCase() === 'subject');
            const date = messageDetails.data.payload.headers
                .find(header => header.name.toLowerCase() === 'date');

            deadlines.push({
                subject: subject ? subject.value : '件名なし',
                date: date ? date.value : '日付なし',
                snippet: messageDetails.data.snippet
            });
        }

        res.json(deadlines);
    } catch (error) {
        console.error('Error fetching deadlines:', error);
        res.status(500).json({ error: 'メールの取得中にエラーが発生しました' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
