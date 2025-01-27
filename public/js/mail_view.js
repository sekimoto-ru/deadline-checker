// 締切日のキーワード
const keywordQuery = [
    '締切', '〆切', 'deadline', '期限', 'リマインド', 'Reminder',
    '至急', '申込', 'お伺い', '推薦', '依頼', '採点', '報告', '提出', '成績', '出勤'
];

// メール一覧の取得
async function listMessages() {
    try {
        console.log('メール一覧の取得を開始します...');
        // メール一覧の取得
        const searchDate = new Date();
        searchDate.setDate(searchDate.getDate() - EMAIL_SETTINGS.daysToSearch);
        // 検索クエリを最適化：締切関連のキーワードを直接指定
        const queryParts = keywordQuery.map(keyword => {
            // 英語のキーワードの場合のみ大文字小文字のバリエーションを追加
            if (/^[a-zA-Z]+$/.test(keyword)) {
                const variations = [
                    keyword.toLowerCase(),
                    keyword.toUpperCase(),
                    keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase()
                ];
                // 単純な OR 検索に変更
                return variations.join(' OR ');
            } else {
                // 日本語のキーワードはそのまま使用
                return keyword;
            }
        });

        // クエリを単純化
        const query = `{${queryParts.join(' OR ')}} after:${searchDate.getFullYear()}/${(searchDate.getMonth() + 1).toString().padStart(2, '0')}/${searchDate.getDate().toString().padStart(2, '0')}`;

        // クエリの内容を詳細に出力
        console.log('生成された検索クエリの詳細:', {
            keywordCount: keywordQuery.length,
            uniqueTerms: new Set(query.match(/subject:"([^"]+)"/g)).size,
            queryParts: queryParts,  // 各キーワードのクエリ部分を個別に表示
            dateCondition: `after:${searchDate.getFullYear()}/${(searchDate.getMonth() + 1).toString().padStart(2, '0')}/${searchDate.getDate().toString().padStart(2, '0')}`,
            fullQuery: query
        });

        console.log('Gmail APIを呼び出します...', {
            query: query,
            maxResults: EMAIL_SETTINGS.maxResults,
            label: EMAIL_SETTINGS.searchLabel,
            searchDate: searchDate.toISOString()
        });

        try {
            const response = await gapi.client.gmail.users.messages.list({
                'userId': 'me',
                'labelIds': [EMAIL_SETTINGS.searchLabel],
                'q': query,
                'maxResults': EMAIL_SETTINGS.maxResults
            });

            console.log('Gmail APIからレスポンスを受信:', {
                status: response.status,
                statusText: response.statusText,
                hasMessages: response.result.messages ? true : false,
                messageCount: response.result.messages ? response.result.messages.length : 0,
                resultKeys: Object.keys(response.result)
            });

            const messages = response.result.messages;
            if (!messages || messages.length === 0) {
                console.log('メールが見つかりませんでした');
                document.getElementById('emails').innerHTML = 'メールが見つかりませんでした。';
                return;
            }

            console.log('検索結果:', {
                totalMessages: messages.length,
                query: query
            });

            // メール詳細の取得
            const emailsContainer = document.getElementById('emails');
            emailsContainer.innerHTML = '<div style="text-align: center;">メールを読み込んでいます...</div>';

            // バッチサイズを増やして並列処理を効率化
            const batchSize = 20;
            const filteredEmails = [];
            let processedCount = 0;

            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                const batchPromises = batch.map(message =>
                    gapi.client.gmail.users.messages.get({
                        'userId': 'me',
                        'id': message.id,
                        'format': 'full'
                    })
                );

                const batchDetails = await Promise.all(batchPromises);
                processedCount += batch.length;

                // メール処理を最適化
                const processedBatch = await Promise.all(batchDetails.map(async (details) => {
                    const email = details.result;
                    const headers = email.payload.headers;
                    const subject = headers.find(header => header.name === 'Subject')?.value || '';
                    const receivedDate = new Date(headers.find(header => header.name === 'Date')?.value || '');

                    // 本文の取得を最適化
                    let body = '';
                    if (email.payload.parts) {
                        body = await findBodyContent(email.payload.parts);
                    } else if (email.payload.body.data) {
                        body = await decodeBase64(email.payload.body.data);
                    }

                    // キーワードマッチングを実行
                    const normalizedSubject = subject.normalize('NFKC').toLowerCase();
                    const normalizedBody = body.normalize('NFKC').toLowerCase();
                    const matchedKeywords = keywordQuery.filter(keyword => {
                        const normalizedKeyword = keyword.normalize('NFKC').toLowerCase();
                        return normalizedSubject.includes(normalizedKeyword) ||
                            normalizedBody.includes(normalizedKeyword);
                    });

                    // マッチしたキーワードがない場合はnullを返してフィルタリング
                    if (matchedKeywords.length === 0) {
                        return null;
                    }

                    console.log('キーワードマッチング:', {
                        subject: normalizedSubject,
                        bodyPreview: normalizedBody.substring(0, 100),
                        matchedKeywords: matchedKeywords
                    });

                    // 締切日の抽出
                    const deadlines = [
                        ...extractDeadlines(subject, receivedDate),
                        ...extractDeadlines(body, receivedDate)
                    ];

                    console.log('メール処理中:', {
                        subject: subject,
                        rawDeadlines: deadlines.map(d => d.toLocaleDateString('ja-JP')),
                        bodyLength: body.length,
                        matchedKeywords: matchedKeywords
                    });

                    // 重複を除去し、日付順にソート
                    const uniqueDeadlines = Array.from(new Set(
                        deadlines.map(d => d.toISOString().split('T')[0])
                    )).map(d => new Date(d)).sort((a, b) => a - b);

                    if (uniqueDeadlines.length > 0 && uniqueDeadlines.length < 10) {
                        email.processedBody = body;
                        email.processedInfo = {
                            deadlines: uniqueDeadlines,
                            hasMultipleDeadlines: uniqueDeadlines.length > 1,
                            matchedKeywords: matchedKeywords
                        };
                        console.log('処理されたメール詳細:', {
                            subject: subject,
                            deadlines: uniqueDeadlines.map(d => d.toLocaleDateString('ja-JP')),
                            deadlinesCount: uniqueDeadlines.length,
                            hasMultipleDeadlines: uniqueDeadlines.length > 1,
                            body: body.substring(0, 100) + '...' // 本文の最初の100文字のみ表示
                        });
                        return details;
                    }
                    return null;
                }));

                // nullをフィルタリング
                filteredEmails.push(...processedBatch.filter(Boolean));
            }

            emailsContainer.innerHTML = '';

            if (filteredEmails.length === 0) {
                emailsContainer.innerHTML = '「締切」を含むメールが見つかりませんでした。';
                return;
            }

            // 締切日でソート
            filteredEmails.sort((a, b) => {
                const aInfo = a.result.processedInfo;
                const bInfo = b.result.processedInfo;

                // 締切日がないメールは後ろに
                if (!aInfo.deadlines.length && !bInfo.deadlines.length) return 0;
                if (!aInfo.deadlines.length) return 1;
                if (!bInfo.deadlines.length) return -1;

                // 最も早い締切日で比較
                const aEarliestDeadline = Math.min(...aInfo.deadlines.map(d => d.getTime()));
                const bEarliestDeadline = Math.min(...bInfo.deadlines.map(d => d.getTime()));
                return aEarliestDeadline - bEarliestDeadline;
            });

            // 締切日の収集（すべての締切日を収集）
            allDeadlines = [];
            filteredEmails.forEach(details => {
                const email = details.result;
                const info = email.processedInfo;
                if (info.deadlines && info.deadlines.length > 0) {
                    allDeadlines.push(...info.deadlines);
                }
            });

            // カレンダーの更新
            updateCalendar();

            // メールの表示
            filteredEmails.forEach(details => {
                const email = details.result;
                const headers = email.payload.headers;
                const subject = headers.find(header => header.name === 'Subject')?.value || '件名なし';
                const from = headers.find(header => header.name === 'From')?.value || '送信者不明';
                const date = new Date(headers.find(header => header.name === 'Date')?.value || '').toLocaleString('ja-JP');
                const info = email.processedInfo;

                // メール表示前のデバッグログ
                console.log('メール表示処理:', {
                    subject: subject,
                    deadlines: info.deadlines.map(d => d.toLocaleDateString('ja-JP')),
                    hasMultipleDeadlines: info.hasMultipleDeadlines,
                    matchedKeywords: info.matchedKeywords
                });

                // 保存された本文を使用
                const body = email.processedBody || '';

                const emailDiv = document.createElement('div');
                emailDiv.className = 'email';
                emailDiv.dataset.messageId = email.id;
                emailDiv.innerHTML = `
                    ${info.deadlines.length > 0 ? `
                        <div class="email-deadline">
                            締切日: ${info.hasMultipleDeadlines ?
                            info.deadlines.sort((a, b) => a - b).map(d => d.toLocaleDateString('ja-JP')).join(', ') :
                            info.deadlines[0].toLocaleDateString('ja-JP')}
                            ${info.hasMultipleDeadlines ? ' (複数)' : ''}
                        </div>
                    ` : ''}
                    <div class="email-subject">${subject}</div>
                    <div class="email-from">${from}</div>
                    <div class="email-date">受信日時: ${date}</div>
                    <div class="email-keywords">検出キーワード: ${info.matchedKeywords.join(', ')}</div>
                    ${info.hasMultipleDeadlines ? `<button class="ai-deadline-btn">AIで締切日を絞り込む</button>` : ''}
                    <button class="view-details-btn">詳細を見る</button>
                `;

                // AIボタンの追加後のデバッグログ
                if (info.hasMultipleDeadlines) {
                    console.log('AIボタンを追加:', {
                        subject: subject,
                        deadlinesCount: info.deadlines.length
                    });
                }

                // AIで締切日を絞り込むボタンのクリックイベントの追加
                if (info.hasMultipleDeadlines) {
                    const aiDeadlineBtn = emailDiv.querySelector('.ai-deadline-btn');
                    console.log('AIボタンのイベントリスナーを設定:', {
                        subject: subject,
                        buttonExists: !!aiDeadlineBtn
                    });

                    if (aiDeadlineBtn) {
                        aiDeadlineBtn.addEventListener('click', async function () {
                            try {
                                console.log('AIボタンがクリックされました:', {
                                    subject: subject,
                                    deadlines: info.deadlines.map(d => d.toLocaleDateString('ja-JP'))
                                });

                                aiDeadlineBtn.disabled = true;
                                aiDeadlineBtn.textContent = 'AIが分析中...';

                                console.log('サーバーにリクエストを送信:', {
                                    deadlinesCount: info.deadlines.length,
                                    bodyLength: body.length
                                });

                                const response = await fetch('/api/analyze-deadlines', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        subject: subject,
                                        body: body,
                                        deadlines: info.deadlines.map(d => d.toISOString().split('T')[0])
                                    })
                                });

                                if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.error || 'AI分析に失敗しました');
                                }

                                const aiResponse = await response.json();

                                // 日付の妥当性チェック
                                const parsedDate = new Date(aiResponse.selected_date);
                                if (isNaN(parsedDate.getTime())) {
                                    throw new Error('AIが返した日付が無効です: ' + aiResponse.selected_date);
                                }

                                console.log('解析されたAIレスポンス:', {
                                    selectedDate: parsedDate.toLocaleDateString('ja-JP'),
                                    reason: aiResponse.reason
                                });

                                // メール一覧の表示も更新
                                const listDeadlineDiv = emailDiv.querySelector('.email-deadline');
                                listDeadlineDiv.innerHTML = `
                                    締切日: ${parsedDate.toLocaleDateString('ja-JP')}
                                    <div class="ai-reason" style="font-size: 0.9em; color: #666; margin-top: 5px;">
                                        ${aiResponse.reason}
                                    </div>
                                `;

                                // ボタンを非表示に
                                aiDeadlineBtn.style.display = 'none';

                                // allDeadlinesの更新
                                const emailIndex = filteredEmails.findIndex(e => e.result.id === email.id);
                                if (emailIndex !== -1) {
                                    filteredEmails[emailIndex].result.processedInfo.deadlines = [parsedDate];
                                    filteredEmails[emailIndex].result.processedInfo.hasMultipleDeadlines = false;
                                    updateCalendar();
                                }
                            } catch (error) {
                                console.error('AI分析エラーの詳細:', {
                                    name: error.name,
                                    message: error.message,
                                    stack: error.stack,
                                    error: error
                                });
                                aiDeadlineBtn.textContent = 'AI分析エラー';
                                setTimeout(() => {
                                    aiDeadlineBtn.disabled = false;
                                    aiDeadlineBtn.textContent = 'AIで締切日を絞り込む';
                                }, 3000);
                            }
                        });
                    }
                }

                // 詳細を見るボタンのクリックイベントの追加
                const viewDetailsBtn = emailDiv.querySelector('.view-details-btn');
                viewDetailsBtn.addEventListener('click', function () {
                    const modal = document.getElementById('email-modal');
                    const modalContent = document.getElementById('modal-email-content');

                    // 添付ファイルの情報を収集
                    const attachments = [];
                    const collectAttachments = (parts) => {
                        if (!parts) return;
                        for (const part of parts) {
                            if (part.filename && part.body.attachmentId) {
                                attachments.push({
                                    filename: part.filename,
                                    attachmentId: part.body.attachmentId,
                                    mimeType: part.mimeType
                                });
                            }
                            if (part.parts) {
                                collectAttachments(part.parts);
                            }
                        }
                    };
                    collectAttachments(email.payload.parts);

                    modalContent.innerHTML = `
                        <span class="close">&times;</span>
                        <div class="header">
                            ${info.deadlines.length > 0 ? `
                                <div class="email-deadline">
                                    締切日: ${info.hasMultipleDeadlines ?
                                info.deadlines.sort((a, b) => a - b).map(d => d.toLocaleDateString('ja-JP')).join(', ') :
                                info.deadlines[0].toLocaleDateString('ja-JP')}
                                ${info.hasMultipleDeadlines ? ' (複数)' : ''}
                                </div>
                            ` : ''}
                            <div class="email-subject">${subject}</div>
                            <div class="email-from">${from}</div>
                            <div class="email-date">受信日時: ${date}</div>
                            <div class="email-keywords">検出キーワード: ${info.matchedKeywords.join(', ')}</div>
                            ${info.hasMultipleDeadlines ? `<button class="ai-deadline-btn">AIで締切日を絞り込む</button>` : ''}
                            <button class="archive-btn" data-message-id="${email.id}">アーカイブ</button>
                        </div>
                        ${attachments.length > 0 ? `
                            <div class="attachments" style="margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
                                <div style="font-weight: bold; margin-bottom: 8px;">添付ファイル:</div>
                                ${attachments.map(attachment => `
                                    <div class="attachment-item" style="margin: 4px 0;">
                                        <a href="#" class="attachment-link" 
                                           data-message-id="${email.id}"
                                           data-attachment-id="${attachment.attachmentId}"
                                           style="display: flex; align-items: center; text-decoration: none; color: #2196f3;">
                                            <svg style="width: 16px; height: 16px; margin-right: 8px;" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                            </svg>
                                            ${attachment.filename}
                                        </a>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="content" style="margin-top: 20px; white-space: pre-wrap;">${body}</div>
                    `;

                    // モーダル内のAIで締切日を絞り込むボタンのイベントリスナーを設定
                    if (info.hasMultipleDeadlines) {
                        const modalAiDeadlineBtn = modalContent.querySelector('.ai-deadline-btn');
                        modalAiDeadlineBtn.addEventListener('click', async function () {
                            try {
                                modalAiDeadlineBtn.disabled = true;
                                modalAiDeadlineBtn.textContent = 'AIが分析中...';

                                console.log('サーバーにリクエストを送信:', {
                                    deadlinesCount: info.deadlines.length,
                                    bodyLength: body.length
                                });

                                const response = await fetch('/api/analyze-deadlines', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        subject: subject,
                                        body: body,
                                        deadlines: info.deadlines.map(d => d.toISOString().split('T')[0])
                                    })
                                });

                                if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.error || 'AI分析に失敗しました');
                                }

                                const aiResponse = await response.json();

                                // 日付の妥当性チェック
                                const parsedDate = new Date(aiResponse.selected_date);
                                if (isNaN(parsedDate.getTime())) {
                                    throw new Error('AIが返した日付が無効です: ' + aiResponse.selected_date);
                                }

                                console.log('解析されたAIレスポンス:', {
                                    selectedDate: parsedDate.toLocaleDateString('ja-JP'),
                                    reason: aiResponse.reason
                                });

                                // メール一覧とモーダル内の表示を更新
                                const updateDeadlineDisplay = (container) => {
                                    const deadlineDiv = container.querySelector('.email-deadline');
                                    if (deadlineDiv) {
                                        deadlineDiv.innerHTML = `
                                            締切日: ${parsedDate.toLocaleDateString('ja-JP')}
                                            <div class="ai-reason" style="font-size: 0.9em; color: #666; margin-top: 5px;">
                                                ${aiResponse.reason}
                                            </div>
                                        `;
                                    }
                                };

                                // メール一覧を更新
                                updateDeadlineDisplay(emailDiv);
                                // モーダル内の表示を更新
                                updateDeadlineDisplay(modalContent);

                                // AIボタンを非表示に
                                const hideAiButton = (container) => {
                                    const aiBtn = container.querySelector('.ai-deadline-btn');
                                    if (aiBtn) {
                                        aiBtn.style.display = 'none';
                                    }
                                };

                                // メール一覧とモーダル内のAIボタンを非表示に
                                hideAiButton(emailDiv);
                                hideAiButton(modalContent);

                                // allDeadlinesの更新
                                const emailIndex = filteredEmails.findIndex(e => e.result.id === email.id);
                                if (emailIndex !== -1) {
                                    filteredEmails[emailIndex].result.processedInfo.deadlines = [parsedDate];
                                    filteredEmails[emailIndex].result.processedInfo.hasMultipleDeadlines = false;
                                    updateCalendar();
                                }
                            } catch (error) {
                                console.error('AI分析エラーの詳細:', {
                                    name: error.name,
                                    message: error.message,
                                    stack: error.stack,
                                    error: error
                                });
                                modalAiDeadlineBtn.textContent = 'AI分析エラー';
                                setTimeout(() => {
                                    modalAiDeadlineBtn.disabled = false;
                                    modalAiDeadlineBtn.textContent = 'AIで締切日を絞り込む';
                                }, 3000);
                            }
                        });
                    }

                    // 閉じるボタンのイベントリスナーを設定
                    const closeButton = modalContent.querySelector('.close');
                    if (closeButton) {
                        closeButton.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            closeModal();
                        });
                    }

                    showModal();

                    // 添付ファイルのクリックイベントを設定
                    modalContent.querySelectorAll('.attachment-link').forEach(link => {
                        link.addEventListener('click', async function (e) {
                            e.preventDefault();
                            const messageId = this.dataset.messageId;
                            const attachmentId = this.dataset.attachmentId;

                            try {
                                // 添付ファイルのデータを取得
                                const response = await gapi.client.gmail.users.messages.attachments.get({
                                    'userId': 'me',
                                    'messageId': messageId,
                                    'id': attachmentId
                                });

                                // Base64データをBlobに変換
                                const base64 = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
                                const binary = atob(base64);
                                const bytes = new Uint8Array(binary.length);
                                for (let i = 0; i < binary.length; i++) {
                                    bytes[i] = binary.charCodeAt(i);
                                }
                                const blob = new Blob([bytes]);

                                // ダウンロードリンクを作成
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = this.textContent.trim();
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            } catch (err) {
                                console.error('添付ファイルの取得エラー:', err);
                                alert('添付ファイルの取得に失敗しました。');
                            }
                        });
                    });

                    // アーカイブボタンのクリックイベントを設定
                    const archiveBtn = modalContent.querySelector('.archive-btn');
                    archiveBtn.addEventListener('click', async function () {
                        const messageId = this.dataset.messageId;
                        const success = await archiveEmail(messageId);
                        if (success) {
                            // モーダルを閉じる
                            closeModal();
                            // メール一覧から該当のメールを削除
                            const emailDiv = document.querySelector(`[data-message-id="${messageId}"]`);
                            if (emailDiv) {
                                emailDiv.remove();
                            }
                            // メール一覧が空になった場合のメッセージを表示
                            const emailsContainer = document.getElementById('emails');
                            if (emailsContainer.children.length === 0) {
                                emailsContainer.innerHTML = '「締切」を含むメールが見つかりませんでした。';
                            }

                            // アーカイブされたメールの締切日を削除
                            const archivedEmail = filteredEmails.find(email => email.result.id === messageId);
                            if (archivedEmail) {
                                const archivedDeadlines = archivedEmail.result.processedInfo.deadlines;
                                allDeadlines = allDeadlines.filter(deadline =>
                                    !archivedDeadlines.some(archivedDeadline =>
                                        archivedDeadline.toISOString().split('T')[0] === deadline.toISOString().split('T')[0]
                                    )
                                );
                                // カレンダーを更新
                                updateCalendar();
                            }
                        } else {
                            alert('メールのアーカイブに失敗しました。');
                        }
                    });
                });

                emailsContainer.appendChild(emailDiv);
            });
        } catch (err) {
            showError('メール取得エラー', err);
        }
    } catch (err) {
        showError('メール取得エラー', err);
    }
}
