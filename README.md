# いしけん！トーク（試作）

いしけん！の369人とAIで話せるスマホアプリ。iPhone・Android向け。

## 中身

- `server/` … 中継サーバー（Cloudflare Workers）。AIの鍵を持ち、1日の会話回数を数える
  - 無料：最初に選んだ推し1人と1日10回
  - 部員パス：369人全員と1日300回
  - `src/personas.json` … 369人分の会話用の設定（いしけん設定表とサイトのデータから作成）
  - `test/run.mjs` … 動作テスト（`node test/run.mjs`）
- `app/` … アプリ本体（Expo）。部室・369人から選ぶ・トークの3画面
  - `App.js` の `API_URL` が空のときは「お試しモード」（AIを使わない仮の返事）で動く

## アッキーにお願いすること（順番どおり）

1. Apple Developer Program と Google Play Console の登録
2. Claude Console（AIの利用）にアカウントを作り、支払い方法を登録する。APIキーはアッキーが作り、Claudeには渡さない
3. Cloudflare のアカウントを作る（無料）
4. Expo のアカウントを作る（無料。アプリの組み立てに使う）
5. GitHub に空のリポジトリ `ishiken-talk` を作り、このチャットで使えるように許可する

## Claudeがやること

- 中継サーバーの公開手順の用意（APIキーはアッキーが自分で登録する）
- アプリに課金（部員パス）と毎朝の通知を入れる
- ストア申請用の説明文・画面写真の用意
