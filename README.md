# respo-check（cosmewatch.jp）— スマホ表示チェック

**リポジトリ名は respo-check だが、公開先は cosmewatch.jp。**

商品ページを、スマホ・タブレット・PCの幅で撮って並べる。

- 公開先: https://cosmewatch.jp
- 配信: GitHub Pages（`dist/CNAME` は `scripts/build_site.mjs` の `SITE_DOMAIN` から作る）

## iframe では作れない

「スマホ表示をPCで確認」を iframe で作ろうとすると必ず失敗する。
楽天もYahooも `X-Frame-Options` を返すので、他所のページは埋め込めない。

**ヘッドレスブラウザで幅を変えて実際に開き、スクショを撮る。**
JavaScript で作られている部分もそのまま写る。

## 決めたこと

**スマホを左端に置く。** 店主はPCで作業しているので、放っておくと
PCの見た目だけで判断してしまう。並び順で「まずスマホ」を作る。

**幅の比はそのまま並べる。** 3つを同じ大きさに揃えると、スマホで
どれだけ狭いかが分からなくなる。狭さこそ見せたいもの。

**「開いた瞬間に見える範囲」だけ撮る。** 縦に全部つなげた画像にしない。
見たいのは、来た人が最初に何を見るか。

**`networkidle` で待たない。** 楽天のような広告と計測の多いページは
通信が止まらず、待ち続けて失敗する（2026-09-04 実測）。

## 使い方

```bash
pip install playwright && playwright install chromium
python scripts/shoot.py        # config/pages.json のページを撮る
node scripts/build_site.mjs    # dist/index.html を作る
```

## 相手のサイトへの負荷

自分の商品ページを見に行くだけで、1ページにつき幅の数だけ開く。
**3秒あける。** 人が手で確認するより速く叩く理由がない。
