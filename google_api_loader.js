async function initializeGoogleAuth() {
    console.log('GAPI, GIS 設定開始');
    try {
        if (!AUTH_CONFIG || !AUTH_CONFIG.CLIENT_ID) {
            throw new Error('認証設定が見つかりません。');
        }

        // GAPIクライアントの読み込み
        await new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    // Gmail APIのDiscovery Documentを読み込む
                    await gapi.client.load('gmail', 'v1');
                    resolve();
                } catch (err) {
                    console.error('GAPI初期化エラー:', err);
                    reject(err);
                }
            });
        });

        // GISクライアントの初期化
        const client = google.accounts.oauth2.initTokenClient({
            client_id: AUTH_CONFIG.CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.error !== undefined) {
                    console.error('GIS初期化エラー:', response);
                    window.dispatchEvent(new CustomEvent('authError', { detail: response }));
                    return;
                }
                // イベントを発行して、google_login_handler.jsで処理
                window.dispatchEvent(new CustomEvent('tokenReceived', { detail: response }));
            }
        });

        window.tokenClient = client;
        console.log('GAPI, GIS 設定完了');
        window.dispatchEvent(new Event('gapiInitialized'));
    } catch (err) {
        console.error('GAPI, GIS設定エラー:', err);
        window.dispatchEvent(new CustomEvent('authError', { detail: err }));
    }
}

// 初期化の実行
initializeGoogleAuth();
