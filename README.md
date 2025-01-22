# メール締切チェッカー

Gmailアカウント内のメールを解析し、締切日時を自動で検出・管理するWebアプリケーションです。
メールの山から重要な締切を見逃さないようにサポートします。

## 主な機能 🚀

- **Gmail連携**: Gmailアカウントとのシームレスな連携
- **自動検出**: メール内の締切日時を高精度で自動検出
- **スマート管理**: 締切日時に基づくメールの整理・優先順位付け
- **直感的なUI**: カレンダー形式での締切表示とモーダル詳細表示
- **キーボードショートカット**: 効率的な操作をサポート

## システム要件 💻

- モダンなWebブラウザ（Chrome, Firefox, Safari, Edge）
- Googleアカウント
- インターネット接続

## ファイル構成 📁

```
.
├── index.html              # メインのHTMLファイル
├── styles.css              # アプリケーションのスタイル
├── main.js                 # メインのJavaScriptファイル
├── calendar_view.js        # カレンダービューの実装
├── mail_view.js           # メール表示の実装
├── email_processor.js     # メール処理ロジック
├── date_extractor.js      # 日付抽出ロジック
├── google_login_handler.js # Google認証処理
├── google_api_loader.js   # Google API読み込み
├── google_api_credentials.js # API認証情報
└── apis.js                # API関連の設定
```

## セットアップ手順 🔧

1. **Google Cloud Platformの設定**
   - 新規プロジェクトを作成
   - Gmail APIを有効化
   - OAuth 2.0クライアントIDを取得

2. **設定ファイルの準備**
   - `google_api_credentials.js`に必要な認証情報を設定
   - Google Cloud PlatformのクライアントIDとGemini APIキーが必要です

```javascript
// google_api_credentials.js の設定例
const AUTH_CONFIG = {
    CLIENT_ID: 'あなたのクライアントID',
    GEMINI_API_KEY: 'あなたのGemini APIキー'
};
```

3. **アプリケーションの起動**
   - Webサーバーでファイルを配信
   - ブラウザで`index.html`にアクセス

## 使用方法 📝

### 初期設定
1. アプリケーションにアクセス
2. 「Gmailでログイン」をクリック
3. Googleアカウントの認証を行う
4. メールの解析が自動的に開始

### 基本操作
- **カレンダー表示**
  - 締切日のあるメールが日付ごとに表示
  - 締切日は赤色の背景で表示
  - 今日の日付は青色の背景で表示
  - 締切日には赤い点で印（複数ある場合は丸数字）

- **メール管理**
  - メールをクリックで詳細表示
  - 「アーカイブ」ボタンでメールをアーカイブ

### 便利な機能
- 締切日による自動ソート
- 添付ファイルのプレビュー

### 注意事項
- 24時間以上アプリを使用していない場合は、再度「Gmailでログイン」が必要です
- インターネットに接続できない場合は、前回取得したメール情報のみ表示されます
- 複数の締切日がある場合、AI機能で1つに絞り込むことができますが、AI判断の正確性は保証されません
- このアプリケーションはGoogle Gemini APIを使用しており、AI分析のために送信されたメールデータは、Googleの機械学習に利用される可能性があります。個人情報や機密情報を含むメールの取り扱いには十分ご注意ください

## セキュリティ 🔒

- アクセストークン有効期限: 24時間
- 全通信のHTTPS暗号化
- ログアウト時のトークン完全破棄

## 技術スタック 🛠

- **フロントエンド**:
  - HTML5
  - CSS3
  - JavaScript (ES6+)
  - モジュラー設計によるコンポーネント分割
    - カレンダービュー（calendar_view.js）
    - メールビュー（mail_view.js）
    - メール処理（email_processor.js）
    - 日付抽出（date_extractor.js）

- **API/認証**:
  - Gmail API
  - Google OAuth 2.0
  - Gemini API（テキスト解析）

## ライセンス 📄

MIT License

## サポート 💬

問題や提案がある場合は、Issueを作成してください。
