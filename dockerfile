# ベースイメージとして公式Node.jsイメージを使用
FROM node:22

# アプリケーションディレクトリを作成
WORKDIR /usr/src/app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 必要なパッケージをインストール
RUN npm install

# アプリケーションコードをコピー
COPY . .

# コンテナがリッスンするポートを定義
EXPOSE 3000

# アプリケーションを起動
# CMD ["node", "app.js"]
CMD ["node", "server.js"]
