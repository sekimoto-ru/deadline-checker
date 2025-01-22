/**
 * ログインボタンの設定
 */

function setupLoginButton() {
    const loginButton = document.getElementById('login_button');
    const logoutButton = document.getElementById('logout_button');
    const contentWrapper = document.querySelector('.content-wrapper');

    // すべての要素を初期状態で非表示に
    if (loginButton) loginButton.style.display = 'none';
    if (logoutButton) logoutButton.style.display = 'none';
    if (contentWrapper) contentWrapper.style.display = 'none';

    // トークンの存在確認
    const token = localStorage.getItem('gmail_token');
    if (token) {
        // トークンが存在する場合は認証チェックを待つ
        return;
    } else {
        // トークンが存在しない場合のみログインボタンを表示
        if (loginButton) loginButton.style.display = 'block';
    }

    // イベントリスナーの設定
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('initiateLogin'));
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}


/**
 * ログアウト処理
 */

function handleLogout() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        // トークンとタイムスタンプを削除
        localStorage.removeItem('gmail_token');
        localStorage.removeItem('gmail_token_data');

        // UI要素の表示制御
        const loginButton = document.getElementById('login_button');
        const logoutButton = document.getElementById('logout_button');
        const contentWrapper = document.querySelector('.content-wrapper');
        const emailContainer = document.querySelector('.email-container');
        const calendarContainer = document.querySelector('.calendar-container');

        // ログインボタンを表示、ログアウトボタンを非表示
        if (loginButton) loginButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';

        // コンテンツエリアを非表示
        if (contentWrapper) contentWrapper.style.display = 'none';
        if (emailContainer) emailContainer.style.display = 'none';
        if (calendarContainer) calendarContainer.style.display = 'none';

        // ログアウトイベントを発行
        window.dispatchEvent(new Event('authLogout'));
    }
}

/**
 * 保存されたトークンをチェック
 */

function checkStoredToken() {
    const token = localStorage.getItem('gmail_token');
    const loginButton = document.getElementById('login_button');

    if (token) {
        // トークンの有効期限をチェック（1時間）
        const tokenData = JSON.parse(localStorage.getItem('gmail_token_data') || '{}');
        const timestamp = tokenData.timestamp || 0;
        const ONE_HOUR = 60 * 60 * 1000;

        if (new Date().getTime() - timestamp > ONE_HOUR) {
            console.log('トークンの有効期限切れ');
            localStorage.removeItem('gmail_token');
            localStorage.removeItem('gmail_token_data');
            if (loginButton) {
                loginButton.style.display = 'block';
            }
            return;
        }

        gapi.client.setToken({
            access_token: token,
            scope: SCOPES
        });
        handleAuthSuccess({ access_token: token });
    } else {
        if (loginButton) {
            loginButton.style.display = 'block';
        }
    }
}

/**
 * 認証成功時の処理
 */

function handleAuthSuccess(response) {
    console.log('認証成功');
    // トークンとタイムスタンプを保存
    localStorage.setItem('gmail_token', response.access_token);
    localStorage.setItem('gmail_token_data', JSON.stringify({
        timestamp: new Date().getTime()
    }));

    // UI要素の表示制御
    const loginButton = document.getElementById('login_button');
    const logoutButton = document.getElementById('logout_button');
    const contentWrapper = document.querySelector('.content-wrapper');
    const emailContainer = document.querySelector('.email-container');
    const calendarContainer = document.querySelector('.calendar-container');

    // ログインボタンを非表示、ログアウトボタンを表示
    if (loginButton) loginButton.style.display = 'none';
    if (logoutButton) logoutButton.style.display = 'block';

    // コンテンツエリアを表示
    if (contentWrapper) contentWrapper.style.display = 'flex';
    if (emailContainer) emailContainer.style.display = 'block';
    if (calendarContainer) calendarContainer.style.display = 'block';

    // すでにスクリプトが存在するか確認
    if (!document.querySelector('script[src="main.js"]')) {
        const script = document.createElement('script');
        script.src = 'main.js';
        script.onload = () => {
            window.dispatchEvent(new CustomEvent('authSuccess', { detail: response }));
        };
        document.body.appendChild(script);
    } else {
        window.dispatchEvent(new CustomEvent('authSuccess', { detail: response }));
    }
}

/**
 * ログアウトボタンの設定
 */
function setupLogoutButton() {
    const logoutButton = document.getElementById('logout_button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            handleLogout();
        });
    }
}

// UIの初期化
setupLoginButton();
setupLogoutButton();  // ログアウトボタンの初期化を追加

// 初期化時にトークンをチェック
window.addEventListener('gapiInitialized', () => {
    checkStoredToken();
});

// イベントリスナーを設定
window.addEventListener('initiateLogin', async () => {
    try {
        const client = google.accounts.oauth2.initTokenClient({
            client_id: AUTH_CONFIG.CLIENT_ID,
            scope: SCOPES,
            callback: handleAuthSuccess
        });

        // トークンリクエストを開始
        client.requestAccessToken();
    } catch (err) {
        console.error('ログインエラー:', err);
    }
});
