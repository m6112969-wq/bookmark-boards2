# BookMark Boards

X・YouTubeのブックマークとメモを、ボードやフォルダで整理できるWebアプリです。Googleアカウントでログインすると、スマホとPCでデータを同期できます。

**[アプリを開く](https://bookmarkboard-6b738.firebaseapp.com/)**

## 主な機能

- X・YouTubeのURL保存、動画の埋め込み再生
- テキストメモ、タグ、検索・絞り込み
- ボードとフォルダによる分類
- Googleログインとアカウントごとのデータ分離
- JSONの書き出し・取り込み
- スマホ対応のレイアウトとタップ操作

## 使い方

1. メニューからボードを選びます。
2. URLを貼り付けて「保存」、またはメモボタンでカードを追加します。
3. カードの「メモ・タグ」から補足やタグを編集できます。

入力欄から離れると編集内容を保存します。検索欄では日本語変換の確定後に絞り込み、Escで検索文字を消去できます。

同じGoogleアカウントでログインした端末同士は同期します。他のアカウントのデータは閲覧・編集できません。ログアウト中は、そのブラウザ内だけに保存します。

## ローカル開発

必要なもの：Node.js 22以降、npm、Python 3。

```sh
npm ci
npm run prepare:hosting
npm run dev
```

開発サーバーは `http://127.0.0.1:8000` で起動します。ファイル変更後は `npm run prepare:hosting` を再実行してください。

| コマンド | 内容 |
| --- | --- |
| `npm run build:css` | Tailwind CSSを生成 |
| `npm run prepare:hosting` | CSSを生成し、公開ファイルを `public/` に配置 |
| `npm run dev` | `public/` をローカル配信 |
| `npm test` | ブラウザ操作・入力検証・セキュリティのテスト |
| `npm run test:rules` | Firestoreルールのテスト |

`assets/js/firebase-config.js` の `firebaseConfig` を `null` にすると、Firebaseへ接続せず端末内保存だけで動作します。

## 自分のFirebaseプロジェクトで公開する

このリポジトリには公開中アプリのFirebase Web設定が含まれます。独自に運用する場合は、自分のプロジェクトに置き換えてください。

### 1. Firebaseを準備

[Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成し、次を設定します。

- Webアプリを登録
- AuthenticationのGoogleプロバイダを有効化
- Cloud Firestoreの `(default)` データベースを本番環境モードで作成
- Authenticationの承認済みドメインに公開先ドメインを登録

### 2. 接続先を変更

`assets/js/firebase-config.js` を、Firebase Consoleで発行されたWeb設定に置き換えます。

```js
export const firebaseConfig = {
    apiKey: 'YOUR_WEB_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
};
```

あわせて `firebase.json` の次の項目を変更します。

- `hosting.site`：自分のHostingサイトID
- ルート `/` と `/index.html` の両方のCSPにある `frame-src`：既存のFirebaseドメインを、自分の `authDomain` に置換

Web設定はブラウザへ配信する公開情報です。サービスアカウントの秘密鍵や管理用トークンは含めないでください。データへのアクセスは `firestore.rules` で制御します。

### 3. 公開

```sh
npx firebase login
npx firebase deploy --project YOUR_PROJECT_ID --only hosting,firestore:rules
```

別端末で認証する環境では、ログイン時に `--no-localhost` を指定できます。

Googleログインはリダイレクト方式です。まずは `authDomain` と同じ `https://YOUR_PROJECT_ID.firebaseapp.com` で利用してください。独自ドメインを使う場合は、[リダイレクト認証の推奨設定](https://firebase.google.com/docs/auth/web/redirect-best-practices)も必要です。

公開後は、同じアカウントでの端末間同期と、別アカウントでデータが分かれることを確認してください。各アカウントの保存先は `users/{uid}/settings/appData` です。特定のユーザーUIDをルールへ登録する必要はありません。

## データの移行・バックアップ

- メニューの書き出しアイコンで全体、ボードの書き出し操作で個別のJSONを保存できます。
- 既存データが別のURLやブラウザにある場合は、元の画面で書き出してから取り込んでください。
- 端末内データを同期へ移すには、ログイン後にメニューの「データ管理」→「端末データを移行」を使います。
- **全体JSONの取り込みや移行は、現在ログインしているアカウントのデータを置き換えます。** 先にバックアップしてください。他のユーザーのデータには影響しません。

同時編集の競合や保存失敗が起きた場合は、メニューの「バックアップを保存」で未送信の編集を保管し、「同期を再開」で最新データを読み直してください。同期が成功した編集バックアップは端末から自動削除します。

### 保存上限

| 対象 | 上限 |
| --- | --- |
| 取り込むJSON | 1 MiB |
| アプリの保存データ | 750,000バイト／アカウント |
| ボード・フォルダ | 各100件／アカウント |
| カード | 合計2,000件／アカウント |
| タグ | 1カード50個 |

Firestoreの保存はアカウントごとに1ドキュメントです。Firebaseの無料枠や課金はプロジェクト単位で適用されます。[料金と上限](https://firebase.google.com/pricing)を確認してください。

## テスト

ブラウザテストにはChromiumが必要です。既定では `/usr/bin/chromium` を使用し、別の場所にある場合は `CHROMIUM_PATH` で実行ファイルを指定します。

```sh
npm test
# 別のChromiumを使う場合
CHROMIUM_PATH=/path/to/chromium npm test
```

FirestoreルールのテストにはJava 21以降が必要です。初回実行時にエミュレーターをダウンロードします。

```sh
npm run test:rules
```

ブラウザテストは、配信予定のCSPを適用し、操作・入力保持・検索・不正なURLやJSONの拒否を確認します。同期テストではFirebase SDKをテスト用の代替に差し替えます。ルールテストはエミュレーターで、複数ユーザーの読み書きとアクセス拒否を検証します。どちらも本番の保存データは変更しません。

実際のGoogleログイン、X・YouTubeの埋め込み、スマホ実機のキーボード操作は別途確認してください。

## セキュリティ

- 確認済みのGoogleアカウントと保存先UIDが一致する場合だけアクセスを許可
- 他ユーザーの保存先、ユーザー一覧、未ログインのアクセスを拒否
- URL・JSON・保存データを共通スキーマで検証
- CSPでインラインJavaScriptとイベント属性を禁止し、外部接続先を制限
- 外部サイトによる画面の埋め込みを拒否

依存関係の警告は `npm audit` で確認できます。更新時は、互換性とテスト結果も確認してください。
