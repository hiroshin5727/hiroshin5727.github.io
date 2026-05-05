家計アプリ v7.2 公開手順

【GitHubにアップロードするもの】
このZIPを解凍し、中身をリポジトリ直下にアップロードしてください。
- index.html
- styles.css
- app.js
- manifest.webmanifest
- sw.js
- icon.svg
- 404.html
- .nojekyll
- README_DEPLOY_JP.txt

【アップロードしないもの】
- kakei_initial_private_data_v72_tax_property.json などの個人データJSON
- 過去に書き出したバックアップJSON

【既存データの引き継ぎ】
v7.2は、同じGitHub Pages URLで使っていた場合、以下の旧版ローカル保存を自動で探して移行します。
- kakei-app-data-v7
- kakei-app-data-v6
- kakei-app-data-v5
- kakei-app-data-v3-safe
- kakei-app-data-v2
- kakei-app-data

旧版で「書き出し」したJSONも、v7.2の「復元」から取り込めます。

【ボタンの使い分け】
- 書き出し：現在のデータをバックアップJSONとして保存します。
- 復元：JSONバックアップでアプリ内データを丸ごと置き換えます。旧版JSONの移行にも使えます。
- 設定取込：支出・資金繰り・申告メモなどの実績データを残したまま、固定費・投資用不動産・減価償却などの設定だけ取り込みます。

【更新後に古い画面が出る場合】
iPhone/Safariのキャッシュが残っている可能性があります。
URL末尾に ?v=7.2 を付けて開いてください。
例: https://ユーザー名.github.io/?v=7.2
それでも古い場合は、ホーム画面のアイコンを一度削除して、Safariから再度「ホーム画面に追加」してください。
