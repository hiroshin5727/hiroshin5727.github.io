うちの収支表 - 公開用パッケージ

【重要】
この公開用パッケージには、個人の家計データを入れない構成にしています。
GitHub Pagesを無料で使う場合、リポジトリは基本的に公開になります。
そのため、個人の固定費や投資用不動産の数字を app.js に直接書き込むのは避けてください。

初期データは、別ファイル kakei_initial_private_data.json をアプリ画面右上の「取込」から読み込んでください。
このJSONファイルはGitHubにアップロードしないでください。

【GitHub Pagesへのアップロード】
1. GitHubで「ユーザー名.github.io」というPublicリポジトリを作る
2. このフォルダ内のファイルをすべてアップロードする
   - index.html
   - styles.css
   - app.js
   - manifest.webmanifest
   - sw.js
   - icon.svg
   - 404.html
   - .nojekyll
   - README_DEPLOY_JP.txt は任意
3. Settings > Pages を開く
4. Source: Deploy from a branch
5. Branch: main / root を選ぶ
6. Save
7. 発行されたURLをiPhoneのSafariで開く
8. 共有ボタン > ホーム画面に追加

【使い始め】
1. 公開URLを開く
2. 右上の「取込」
3. kakei_initial_private_data.json を選ぶ
4. 固定費や投資用不動産の数値が反映される

【バックアップ】
右上の「書き出し」から、現在のデータをJSONで保存できます。
SafariのWebサイトデータを削除するとアプリ内データも消える可能性があるため、月1回は書き出し推奨です。

【レシートOCR】
レシート読取はブラウザ内OCRです。画像は保存・送信しませんが、OCRライブラリはCDNから読み込みます。
精度はレシートの写りに左右されるため、保存前に金額・日付を必ず確認してください。
