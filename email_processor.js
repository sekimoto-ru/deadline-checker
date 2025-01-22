// Base64デコード関数を最適化
async function decodeBase64(data) {
    try {
        // デコード処理を最適化
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        const text = new TextDecoder().decode(
            Uint8Array.from(atob(base64), c => c.charCodeAt(0))
        );
        return text;
    } catch (err) {
        console.error('デコードエラー:', err);
        return '';
    }
}

// 日付の抽出
function extractDeadlines(text, receivedDate) {
    if (!text) {
        return [];
    }

    // 全角数字を半角数字に変換する関数
    const normalizeNumbers = (text) => {
        return text.replace(/[０-９]/g, function (s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
    };

    // テキストの正規化（全角数字を半角に変換）
    text = normalizeNumbers(text);

    // イベント開催日を探すための正規表現
    const eventDatePattern = /(\d{4})[\./年](\d{1,2})[\./月](\d{1,2})[日]?/;
    const eventDateMatch = text.match(eventDatePattern);
    let eventYear = null;
    if (eventDateMatch) {
        eventYear = parseInt(eventDateMatch[1]);
    }

    // 日付のパターン
    const patterns = [
        // 【ご回答締切：】などの形式に対応
        /[【\[［][^】\]］]*?(?:ご回答|回答)[^】\]］]*?(?:締切|〆切|期限)[^】\]］]*?(?:\s*[:：]\s*)?(\d{1,2})[\./月](\d{1,2})[日]?(?:\s*[(（][月火水木金土日]?[曜]?[)）])?[】\]］]/g,
        // 通常の日付形式
        /(\d{1,2})[\./月](\d{1,2})[日]?(?:\s*[(（][月火水木金土日]?[曜]?[)）])?/g,
        // 年を含む日付形式
        /(\d{4})[\./年](\d{1,2})[\./月](\d{1,2})[日]?(?:\s*[(（][月火水木金土日]?[曜]?[)）])?/g,
        // 英語の月名を含む日付形式（例：January 31, 2024 や Jan 31, 2024）
        /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*,?\s*(\d{4})/gi,
        // Deadline: や Due: の後に続く日付形式
        /(?:deadline|due|extended|submission|until)(?:[^.!?\n]*?)(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*,?\s*(\d{4})/gi,
        // 文中の英語日付形式（前後の文脈を問わない）
        /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})/gi
    ];

    const deadlines = [];
    const now = receivedDate || new Date();

    // 日付を適切な年に調整する関数
    const adjustYear = (date, baseDate) => {
        // 基準日より前の日付の場合は1年後に調整
        if (date < baseDate) {
            date.setFullYear(date.getFullYear() + 1);
        }
        return date;
    };

    // 英語の月名を数値に変換するヘルパー関数
    const monthNameToNumber = (monthName) => {
        const months = {
            'january': 1, 'jan': 1,
            'february': 2, 'feb': 2,
            'march': 3, 'mar': 3,
            'april': 4, 'apr': 4,
            'may': 5,
            'june': 6, 'jun': 6,
            'july': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sep': 9,
            'october': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'december': 12, 'dec': 12
        };
        return months[monthName.toLowerCase()];
    };

    for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            try {
                if (match[0].toLowerCase().match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
                    // 英語の月名形式の場合
                    const monthMatch = match[0].match(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i);
                    if (monthMatch) {
                        const month = monthNameToNumber(monthMatch[0]);
                        const dayMatch = match[0].match(/\d{1,2}(?:st|nd|rd|th)?/);
                        const yearMatch = match[0].match(/\d{4}/);

                        if (dayMatch && yearMatch) {
                            const day = parseInt(dayMatch[0]);
                            const year = parseInt(yearMatch[0]);
                            if (month && day && year) {
                                let date = new Date(year, month - 1, day, 9);
                                if (!isNaN(date.getTime())) {
                                    // 受信日を基準に年を調整
                                    date = adjustYear(date, now);
                                    deadlines.push(date);
                                }
                            }
                        }
                    }
                } else if (match.length === 3) {
                    // 月/日の形式の場合
                    const month = parseInt(match[1]);
                    const day = parseInt(match[2]);
                    // 月と日の値が有効かチェック
                    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

                    // イベント開催日の年が見つかっている場合はその年を使用
                    let year = eventYear || now.getFullYear();
                    let date = new Date(year, month - 1, day, 9); // 9時を指定して確実に日本時間の同日になるようにする

                    // イベント開催日の年が見つかっている場合は、その年を基準に前後の日付を判断
                    if (eventYear) {
                        const eventDate = new Date(eventYear, 0, 1); // イベント開催年の1月1日
                        if (date < eventDate) {
                            // イベント開催年より前の日付の場合はイベント開催年に設定
                            date.setFullYear(eventYear);
                        }
                    }

                    // 受信日を基準に年を調整
                    date = adjustYear(date, now);

                    if (!isNaN(date.getTime())) {
                        deadlines.push(date);
                    }
                } else if (match.length === 4) {
                    // 年/月/日の形式の場合
                    const year = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    const day = parseInt(match[3]);
                    // 年月日の値が有効かチェック
                    if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) continue;

                    let date = new Date(year, month - 1, day, 9); // 9時を指定して確実に日本時間の同日になるようにする
                    if (!isNaN(date.getTime())) {
                        // 受信日を基準に年を調整
                        date = adjustYear(date, now);
                        deadlines.push(date);
                    }
                }
            } catch (e) {
                console.error('日付の解析エラー:', e);
            }
        }
    }
    return deadlines;
}

// メール本文を取得する関数
async function findBodyContent(parts) {
    const { plainText, htmlContent } = await searchMailParts(parts);
    return plainText || await convertHtmlToPlainText(htmlContent) || '';
}

// メールパートを再帰的に検索する関数
async function searchMailParts(parts) {
    let plainText = null;
    let htmlContent = null;

    for (const part of parts) {
        const content = await extractPartContent(part);
        if (content) {
            if (content.type === 'plain') {
                plainText = content.content;
            } else if (content.type === 'html') {
                htmlContent = content.content;
            }
        }
        if (part.parts) {
            const nestedContent = await searchMailParts(part.parts);
            if (!plainText) plainText = nestedContent.plainText;
            if (!htmlContent) htmlContent = nestedContent.htmlContent;
        }
    }

    return { plainText, htmlContent };
}

// メールパートからコンテンツを抽出する関数
async function extractPartContent(part) {
    if (!part.body.data) return null;

    if (part.mimeType === 'text/plain') {
        return {
            type: 'plain',
            content: await decodeBase64(part.body.data)
        };
    } else if (part.mimeType === 'text/html') {
        return {
            type: 'html',
            content: await decodeBase64(part.body.data)
        };
    }
    return null;
}

// HTMLをプレーンテキストに変換する関数を最適化
async function convertHtmlToPlainText(html) {
    if (!html) return '';

    try {
        // DOMParserを再利用
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 不要な要素を一括で削除
        const unwantedElements = doc.querySelectorAll('script, style, link, meta');
        unwantedElements.forEach(element => element.remove());

        // テキスト抽出を最適化
        const text = doc.body ? doc.body.textContent || '' : '';
        return text.replace(/\s+/g, ' ').trim();
    } catch (err) {
        console.error('HTML変換エラー:', err);
        return html || '';
    }
}

// メールをアーカイブする関数
async function archiveEmail(messageId) {
    try {
        console.log('メールのアーカイブを開始:', messageId);

        // メッセージの現在のラベルを取得
        const message = await gapi.client.gmail.users.messages.get({
            'userId': 'me',
            'id': messageId,
            'format': 'minimal'
        });

        // 現在のラベルから INBOX を削除
        const currentLabels = message.result.labelIds || [];
        const newLabels = currentLabels.filter(label => label !== 'INBOX');

        // ラベルを更新
        const response = await gapi.client.gmail.users.messages.modify({
            'userId': 'me',
            'id': messageId,
            'resource': {
                'addLabelIds': [],
                'removeLabelIds': ['INBOX']
            }
        });

        console.log('アーカイブ成功:', response);
        return true;
    } catch (err) {
        console.error('アーカイブエラーの詳細:', {
            name: err.name,
            message: err.message,
            stack: err.stack,
            error: err
        });
        alert('メールのアーカイブに失敗しました。');
        return false;
    }
}

