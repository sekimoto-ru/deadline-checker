const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();
const app = express();
app.use(express.json());

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Gemini APIエンドポイント
app.post('/api/analyze-deadlines', async (req, res) => {
    try {
        const { subject, body, deadlines } = req.body;
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `以下のメールから最も重要な締切日を1つ選んでください。複数の候補がある場合は、文脈から最も重要そうな締切日を1つ選択してください。
        締切日の候補: ${deadlines.join(', ')}
        
        件名: ${subject}
        本文:
        ${body}
        
        回答は以下のJSON形式で返してください:
        {
            "selected_date": "YYYY-MM-DD",
            "reason": "選択理由を1文で"
        }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // JSONの文字列を抽出して解析
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI応答からJSONを抽出できませんでした');
        }
        
        const aiResponse = JSON.parse(jsonMatch[0]);
        
        // 日付の妥当性チェック
        const parsedDate = new Date(aiResponse.selected_date);
        if (isNaN(parsedDate.getTime())) {
            throw new Error('AIが返した日付が無効です: ' + aiResponse.selected_date);
        }

        res.json(aiResponse);
    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ 
            error: 'AI分析に失敗しました',
            details: error.message 
        });
    }
});

// ルートハンドラー (EJS テンプレートのレンダリング)
app.get('/', (req, res) => {
    res.render('index', { title: 'Welcome to the Home Page' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
