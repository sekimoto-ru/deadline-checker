// 日付抽出の設定
const DATE_PATTERNS = {
    // YYYY/MM/DD または YYYY-MM-DD
    standard: /(?<!\d)(\d{4}[-\/](?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12][0-9]|3[01]))(?!\d)/g,

    // MM/DD または MM月DD日
    shortDate: /(?<!\d)((?:0?[1-9]|1[0-2])[-\/月](?:0?[1-9]|[12][0-9]|3[01])[日]?)(?!\d)/g,

    // 「まで」「までに」などの期限表現
    deadline: /(?<!\d)((?:0?[1-9]|1[0-2])[\s]*[\/月][\s]*(?:0?[1-9]|[12][0-9]|3[01])[\s]*[日]?[\s]*(まで|までに|期限|締切|〆切|しめきり))(?!\d)/g,

    // 「◯日以内」「◯日間」などの相対表現
    relative: /(?<!\d)([1-9][0-9]?)\s*(日間|日以内|営業日|週間|ヶ月|カ月|ヵ月|か月)(?!\d)/g
};

// 日付の重複チェック用のキャッシュ
const dateCache = new Set();

/**
 * テキストから日付を抽出する
 * @param {string} text - 解析対象のテキスト
 * @param {Date} receivedDate - メールの受信日
 * @returns {Date[]} - 抽出された日付の配列
 */
function extractDeadlines(text, receivedDate) {
    if (!text) return [];

    // キャッシュをクリア
    dateCache.clear();

    const currentYear = receivedDate.getFullYear();
    const uniqueDates = new Map();

    // 日付文字列の正規化（全角数字を半角に、余分な空白を削除）
    text = text.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/\s+/g, ' ')
        .trim();

    // 標準形式の日付を抽出（重複チェック付き）
    const standardDates = Array.from(new Set(text.match(DATE_PATTERNS.standard) || []));
    standardDates.forEach(dateStr => {
        const normalizedDate = normalizeDate(dateStr, currentYear);
        if (normalizedDate) {
            const key = normalizedDate.toISOString().split('T')[0];
            if (!dateCache.has(key)) {
                dateCache.add(key);
                uniqueDates.set(key, normalizedDate);
            }
        }
    });

    // 短い形式の日付を抽出（重複チェック付き）
    const shortDates = Array.from(new Set(text.match(DATE_PATTERNS.shortDate) || []));
    shortDates.forEach(dateStr => {
        const normalizedDate = normalizeShortDate(dateStr, currentYear, receivedDate);
        if (normalizedDate) {
            const key = normalizedDate.toISOString().split('T')[0];
            if (!dateCache.has(key)) {
                dateCache.add(key);
                uniqueDates.set(key, normalizedDate);
            }
        }
    });

    // 期限表現を含む日付を抽出（重複チェック付き）
    const deadlineDates = Array.from(new Set(text.match(DATE_PATTERNS.deadline) || []));
    deadlineDates.forEach(dateStr => {
        const normalizedDate = normalizeDeadlineDate(dateStr, currentYear, receivedDate);
        if (normalizedDate) {
            const key = normalizedDate.toISOString().split('T')[0];
            if (!dateCache.has(key)) {
                dateCache.add(key);
                uniqueDates.set(key, normalizedDate);
            }
        }
    });

    // 相対的な日付表現を処理（重複チェック付き）
    const relativeDates = Array.from(new Set(text.match(DATE_PATTERNS.relative) || []));
    relativeDates.forEach(match => {
        const normalizedDate = normalizeRelativeDate(match, receivedDate);
        if (normalizedDate) {
            const key = normalizedDate.toISOString().split('T')[0];
            if (!dateCache.has(key)) {
                dateCache.add(key);
                uniqueDates.set(key, normalizedDate);
            }
        }
    });

    // 日付でソートして返す
    return Array.from(uniqueDates.values()).sort((a, b) => a - b);
}

/**
 * 標準形式の日付を正規化
 * @param {string} dateStr - 日付文字列
 * @param {number} currentYear - 現在の年
 * @returns {Date|null}
 */
function normalizeDate(dateStr, currentYear) {
    try {
        const [year, month, day] = dateStr.split(/[-\/]/).map(Number);

        // 日付の妥当性チェック
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }

        // 月ごとの日数チェック
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
            return null;
        }

        const date = new Date(year, month - 1, day);
        return isValidDate(date) ? date : null;
    } catch (error) {
        return null;
    }
}

/**
 * 短い形式の日付を正規化
 * @param {string} dateStr - 日付文字列
 * @param {number} currentYear - 現在の年
 * @param {Date} receivedDate - 受信日
 * @returns {Date|null}
 */
function normalizeShortDate(dateStr, currentYear, receivedDate) {
    try {
        const [month, day] = dateStr.replace(/[月日]/g, '/').split(/[-\/]/).map(Number);

        // 日付の妥当性チェック
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }

        // 月ごとの日数チェック
        const daysInMonth = new Date(currentYear, month, 0).getDate();
        if (day > daysInMonth) {
            return null;
        }

        let date = new Date(currentYear, month - 1, day);

        // 過去の日付の場合、来年の日付として解釈
        if (date < receivedDate) {
            date = new Date(currentYear + 1, month - 1, day);
        }

        return isValidDate(date) ? date : null;
    } catch (error) {
        return null;
    }
}

/**
 * 期限表現を含む日付を正規化
 * @param {string} dateStr - 日付文字列
 * @param {number} currentYear - 現在の年
 * @param {Date} receivedDate - 受信日
 * @returns {Date|null}
 */
function normalizeDeadlineDate(dateStr, currentYear, receivedDate) {
    try {
        const dateMatch = dateStr.match(/(\d{1,2})[\s]*[\/月][\s]*(\d{1,2})/);
        if (!dateMatch) return null;

        const [_, month, day] = dateMatch.map(Number);

        // 日付の妥当性チェック
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }

        // 月ごとの日数チェック
        const daysInMonth = new Date(currentYear, month, 0).getDate();
        if (day > daysInMonth) {
            return null;
        }

        let date = new Date(currentYear, month - 1, day);

        // 過去の日付の場合、来年の日付として解釈
        if (date < receivedDate) {
            date = new Date(currentYear + 1, month - 1, day);
            // 来年の日付でも月ごとの日数をチェック
            const daysInNextYearMonth = new Date(currentYear + 1, month, 0).getDate();
            if (day > daysInNextYearMonth) {
                return null;
            }
        }

        return isValidDate(date) ? date : null;
    } catch (error) {
        return null;
    }
}

/**
 * 相対的な日付表現を正規化
 * @param {string} dateStr - 日付文字列
 * @param {Date} receivedDate - 受信日
 * @returns {Date|null}
 */
function normalizeRelativeDate(dateStr, receivedDate) {
    try {
        const match = dateStr.match(/(\d{1,2})\s*(日間|日以内|営業日|週間|ヶ月|カ月|ヵ月|か月)/);
        if (!match) return null;

        const [_, number, unit] = match;
        const value = parseInt(number);

        // 値の妥当性チェック
        if (value <= 0 || value > 100) {
            return null;
        }

        const date = new Date(receivedDate);
        let result = null;

        switch (unit) {
            case '日間':
            case '日以内':
            case '営業日':
                date.setDate(date.getDate() + value);
                result = date;
                break;
            case '週間':
                date.setDate(date.getDate() + (value * 7));
                result = date;
                break;
            case 'ヶ月':
            case 'カ月':
            case 'ヵ月':
            case 'か月':
                date.setMonth(date.getMonth() + value);
                // 月末日の調整
                const expectedMonth = (receivedDate.getMonth() + value) % 12;
                if (date.getMonth() !== expectedMonth) {
                    date.setDate(0); // 前月の末日に設定
                }
                result = date;
                break;
        }

        return result && isValidDate(result) ? result : null;
    } catch (error) {
        return null;
    }
}

/**
 * 日付が有効かどうかをチェック
 * @param {Date} date - チェックする日付
 * @returns {boolean}
 */
function isValidDate(date) {
    return date instanceof Date && !isNaN(date) && date > new Date();
}

// モジュールをエクスポート
window.DateExtractor = {
    extractDeadlines,
    normalizeDate,
    normalizeShortDate,
    normalizeDeadlineDate,
    normalizeRelativeDate
};
