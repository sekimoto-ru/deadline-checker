// カレンダーを指定日数分移動
function moveCalendar(days) {
    try {
        console.log('moveCalendar called with days:', days);
        // 現在表示中の日付を取得
        const currentDateText = document.getElementById('current-month').textContent;
        console.log('Current date text:', currentDateText);
        const [startDateStr] = currentDateText.split('～');

        // 日付文字列を解析（例: "2024年3月15日" → Date オブジェクト）
        const matches = startDateStr.trim().match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (!matches) {
            console.error('日付の解析に失敗しました:', startDateStr);
            return;
        }

        const [_, year, month, day] = matches;
        console.log('Parsed date:', year, month, day);
        const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        startDate.setDate(startDate.getDate() + days);

        // 現在の週の開始日（日曜日）に調整
        const currentWeekDay = startDate.getDay();
        startDate.setDate(startDate.getDate() - currentWeekDay);

        // 4週間後の日付を計算
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 27);

        // ヘッダーの更新
        document.getElementById('current-month').textContent =
            `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 ～ ${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`;

        // カレンダーの再描画
        updateCalendarWithDate(startDate);
    } catch (error) {
        console.error('カレンダー移動エラー:', error);
    }
}

// 指定された日付でカレンダーを更新
function updateCalendarWithDate(startDate) {
    const today = new Date();

    // カレンダーのクリア
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    // 曜日ヘッダーの追加
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'calendar-header-cell';
        cell.textContent = day;
        calendar.appendChild(cell);
    });

    // 4週間分の日付を追加
    const currentDate = new Date(startDate);
    for (let i = 0; i < 28; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';

        // 月が異なる場合は別の色にする
        if (currentDate.getMonth() !== today.getMonth()) {
            cell.classList.add('other-month');
        }

        cell.textContent = currentDate.getDate();

        // 今日の日付をハイライト
        if (currentDate.toDateString() === today.toDateString()) {
            cell.classList.add('today');
        }

        // 締切日をマーク
        const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const deadlinesOnThisDay = allDeadlines.filter(deadline =>
            deadline.toISOString().split('T')[0] === currentDateStr
        );

        if (deadlinesOnThisDay.length > 0) {
            cell.classList.add('has-deadline');
            if (deadlinesOnThisDay.length > 1) {
                // 複数の締切がある場合は丸数字を表示
                cell.classList.add('multiple-deadlines');
                const badge = document.createElement('div');
                badge.className = 'deadline-count';
                const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
                    '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
                const index = Math.min(deadlinesOnThisDay.length - 1, 19);
                badge.textContent = circleNumbers[index];
                cell.appendChild(badge);
            } else {
                // 1つの場合は点を表示
                const dot = document.createElement('div');
                dot.className = 'deadline-dot';
                cell.appendChild(dot);
            }
        }

        calendar.appendChild(cell);

        // 次の日に進める
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// 既存のupdateCalendar関数を修正
function updateCalendar() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentWeekDay = today.getDay();

    // 現在の週の開始日を計算
    const startDate = new Date(today);
    startDate.setDate(currentDay - currentWeekDay);

    // 4週間後の日付を計算
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 27);

    // ヘッダーの更新
    document.getElementById('current-month').textContent =
        `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 ～ ${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`;

    // カレンダーの再描画
    updateCalendarWithDate(startDate);
}
