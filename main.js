// メール取得の設定
const EMAIL_SETTINGS = {
    maxResults: 500,      // 1回の検索で取得する最大メール数
    daysToSearch: 60,     // 何日前までのメールを検索するか
    searchLabel: 'INBOX'  // 検索対象のラベル
};

// グローバル変数
let allDeadlines = [];

// その他の必要な補助関数
function showError(title, error) {
    const message = error.message || 'Unknown error';
    console.error(`${title}:`, error);
    document.getElementById('emails').innerHTML = `
        <div style="color: red; margin: 20px; padding: 10px; border: 1px solid red; border-radius: 4px;">
            <strong>${title}</strong><br>
            ${message}<br><br>
            <small>詳細はブラウザのコンソールを確認してください。</small>
        </div>
    `;
}

// モーダルを閉じる関数
function closeModal() {
    console.log('モーダルを閉じる処理を開始');
    const modal = document.getElementById('email-modal');
    if (modal) {
        console.log('モーダル要素が見つかりました');

        // アニメーションのために不透明度を0に設定
        modal.style.opacity = '0';

        // アニメーション完了後に非表示に
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);

        console.log('モーダルを非表示に設定しました');
    } else {
        console.log('モーダル要素が見つかりません');
    }
}

// モーダルを表示する関数
function showModal() {
    const modal = document.getElementById('email-modal');
    if (modal) {
        // 表示前に不透明度を0に設定
        modal.style.opacity = '0';
        modal.style.display = 'block';

        // 強制的な再描画を促す
        void modal.offsetHeight;

        // 不透明度を1に設定してフェードイン
        modal.style.opacity = '1';
    }
}

// DOMContentLoadedイベントが発火しているか確認
console.log('Script loaded');

// すべての初期化処理をまとめる
function initializeApp() {
    console.log('アプリケーションの初期化を開始');

    // コンテンツの表示
    const contentWrapper = document.querySelector('.content-wrapper');
    if (contentWrapper) {
        contentWrapper.style.display = 'flex';
    }

    // 各機能の初期化
    listMessages();
    initializeCalendarButtons();
    initializeKeyboardNavigation();
}

// DOMContentLoadedイベントリスナーを最初に設定
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded イベントが発火しました');

    // モーダルと閉じるボタンの取得
    const modal = document.getElementById('email-modal');
    console.log('モーダル要素:', modal);

    if (!modal) {
        console.error('モーダル要素が見つかりません');
        return;
    }

    const closeButton = modal.querySelector('.close');
    console.log('閉じるボタン要素:', closeButton);

    if (closeButton) {
        // 閉じるボタンのクリックイベントを設定
        closeButton.addEventListener('click', function (e) {
            console.log('閉じるボタンがクリックされました');
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });

        console.log('閉じるボタンのイベントリスナーを設定しました');
    } else {
        console.error('閉じるボタンが見つかりません');
    }

    // モーダルの外側をクリックしたときの処理を設定
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('email-modal');
        const modalContent = modal.querySelector('.modal-content');
        if (modal && modalContent) {
            // モーダルの外側がクリックされた場合のみ閉じる
            if (e.target === modal && !modalContent.contains(e.target)) {
                closeModal();
            }
        }
    });

    // モーダルコンテンツ内のクリックイベントの伝播を停止
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // アプリケーションの初期化
    initializeApp();
});

// カレンダーボタンの初期化
function initializeCalendarButtons() {
    console.log('カレンダーボタンの初期化を開始');
    const prevButton = document.getElementById('prev-month');
    const nextButton = document.getElementById('next-month');

    if (!prevButton || !nextButton) {
        console.error('カレンダーボタンが見つかりません');
        return;
    }

    console.log('カレンダーボタンが見つかりました');

    // 既存のイベントリスナーを削除
    prevButton.replaceWith(prevButton.cloneNode(true));
    nextButton.replaceWith(nextButton.cloneNode(true));

    // 新しいボタン要素を取得
    const newPrevButton = document.getElementById('prev-month');
    const newNextButton = document.getElementById('next-month');

    // 新しいイベントリスナーを設定
    newPrevButton.addEventListener('click', function () {
        console.log('前月へ移動ボタンがクリックされました');
        moveCalendar(-28);
    });

    newNextButton.addEventListener('click', function () {
        console.log('次月へ移動ボタンがクリックされました');
        moveCalendar(28);
    });

    console.log('カレンダーボタンの初期化が完了しました');
}

// キーボードナビゲーションの初期化
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function (event) {
        const modal = document.getElementById('email-modal');

        // モーダルが開いている場合
        if (modal.style.display === 'block') {
            if (event.key === 'Escape') {
                closeModal();
                event.preventDefault();
            }
            return;
        }

        // モーダルが閉じている場合のカレンダーナビゲーション
        switch (event.key) {
            case 'ArrowLeft':  // 左矢印
                moveCalendar(-28); // 4週間前へ
                event.preventDefault();
                break;
            case 'ArrowRight': // 右矢印
                moveCalendar(28);  // 4週間後へ
                event.preventDefault();
                break;
        }
    });
}

initializeApp();
