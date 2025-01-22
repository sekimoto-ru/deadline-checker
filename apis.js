function waitForAPIs() {
    if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && typeof AUTH_CONFIG !== 'undefined') {
        // 読み込むスクリプトファイルの配列
        const scripts = [
            'google_api_loader.js',
            'google_login_handler.js'
        ];

        // 配列内の各スクリプトを順番に読み込む
        for (const scriptSrc of scripts) {
            const script = document.createElement('script');
            script.src = scriptSrc;
            document.body.appendChild(script);
        }
    } else {
        setTimeout(waitForAPIs, 100);
    }
}
waitForAPIs();


