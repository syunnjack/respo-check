"""商品ページを、スマホ・タブレット・PCの幅で撮って並べる。

## iframe では作れない

「スマホ表示をPCで確認」を iframe で作ろうとすると必ず失敗する。
楽天もYahooも `X-Frame-Options` を返すので、他所のページは埋め込めない。

**ヘッドレスブラウザで、幅を変えて実際に開いてスクショを撮る。**
これなら確実に撮れるし、JavaScript で作られている部分もそのまま写る。

## 撮る幅

    sp      390 x 844   iPhone 15 くらい。**買い物客の多数はここ**
    tablet  820 x 1180  iPad
    pc     1440 x 900

**スマホを先に置く。** 店主はPCで作業しているので、放っておくとPCの見た目
だけで判断してしまう。並べる順で「まずスマホを見る」を作る。

## 相手のサイトへの負荷

自分の商品ページを見に行くだけで、1ページにつき幅の数だけ開く。
**間隔を空ける。** 人が手で確認するより速く叩く理由がない。

## 使い方

    python scripts/shoot.py

    config/pages.json  撮るページ
    dist/shots/        撮った画像
    dist/index.html    並べた画面（build_site.mjs が作る）

環境変数:
  ONLY  この件数だけ試す
"""
import json
import os
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / 'config' / 'pages.json'
SHOTS = ROOT / 'dist' / 'shots'
INDEX = ROOT / 'data' / 'shots.json'

# **スマホを先に。** 店主はPCで作業しているので、順番で見る癖を作る。
VIEWPORTS = [
    ('sp', 390, 844, True),
    ('tablet', 820, 1180, True),
    ('pc', 1440, 900, False),
]

PAUSE = 3.0


def load(path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return fallback


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('playwright が要ります。  pip install playwright && playwright install chromium',
              file=sys.stderr)
        return 1

    config = load(CONFIG, None)
    if not config:
        print(f'{CONFIG} がありません。', file=sys.stderr)
        return 1

    pages = config.get('pages') or []
    only = int(os.environ.get('ONLY') or 0)
    if only:
        pages = pages[:only]

    if not pages:
        print('撮るページが書かれていません。', file=sys.stderr)
        return 1

    SHOTS.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    rows = []

    with sync_playwright() as p:
        browser = p.chromium.launch()

        for page_config in pages:
            name = page_config['name']
            url = page_config['url']
            slug = page_config.get('slug') or ''.join(
                c if c.isalnum() or c in '-_' else '-' for c in name)[:40]

            shots = []
            for label, width, height, mobile in VIEWPORTS:
                context = browser.new_context(
                    viewport={'width': width, 'height': height},
                    device_scale_factor=2 if mobile else 1,
                    is_mobile=mobile,
                    has_touch=mobile,
                    locale='ja-JP',
                )
                page = context.new_page()

                # **networkidle で待たない。** 楽天のような広告と計測の多いページは
                # 通信が止まらず、待ち続けて失敗する（2026-09-04 実測）。
                # 表示に必要なところまで来たら、少しだけ落ち着かせて撮る。
                try:
                    page.goto(url, wait_until='domcontentloaded', timeout=45000)
                    page.wait_for_timeout(2500)
                except Exception as error:
                    print(f'  {name} / {label}: 開けません {error}', file=sys.stderr)
                    context.close()
                    continue

                out = SHOTS / f'{slug}-{label}.png'
                # **画面ぶんだけ撮る（full_page にしない）。**
                # 見たいのは「開いた瞬間に何が見えるか」で、
                # 縦に全部つなげた画像では、その判断ができない。
                page.screenshot(path=str(out))
                context.close()

                shots.append({'device': label, 'width': width, 'height': height,
                              'file': f'shots/{out.name}'})
                print(f'  {name} / {label} ({width}px) → {out.name}', file=sys.stderr)
                time.sleep(PAUSE)

            if shots:
                rows.append({'date': today, 'name': name, 'url': url, 'shots': shots})

        browser.close()

    INDEX.parent.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(json.dumps({'confirmedOn': today, 'pages': rows}, ensure_ascii=False),
                     encoding='utf-8')
    print(f'\n{len(rows)}ページを撮りました。', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
