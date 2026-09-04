// 撮ったスクショを並べて1枚の画面にする。
//
// 見せ方の方針:
//   - **スマホを左端に置く。** 店主はPCで作業しているので、放っておくと
//     PCの見た目だけで判断してしまう。並び順で「まずスマホ」を作る
//   - **実際の幅の比で並べる。** 3つを同じ大きさに引き伸ばすと、
//     スマホでどれだけ狭いかが伝わらない。狭さこそ見せたいもの
//   - 撮ったのが「開いた瞬間に見える範囲」だと明記する
//
// 使い方: node scripts/build_site.mjs

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = path.join(root, 'dist')

// **ドメインはここ1箇所だけで決める。** CNAME もここから作る。
const SITE_DOMAIN = process.env.SITE_DOMAIN || 'cosmewatch.jp'

const LABEL = { sp: 'スマホ', tablet: 'タブレット', pc: 'PC' }

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

async function main() {
  let data
  try {
    data = JSON.parse(await readFile(path.join(root, 'data', 'shots.json'), 'utf8'))
  } catch {
    console.log('data/shots.json がありません。先に shoot.py を走らせてください。')
    return
  }

  const pages = data.pages ?? []
  if (!pages.length) {
    console.log('撮った記録がありません。')
    return
  }

  const sections = pages.map((page) => {
    // 実際の幅の比をそのまま使う。いちばん広いものを基準にする。
    const widest = Math.max(...page.shots.map((shot) => shot.width))

    const shots = page.shots.map((shot) => {
      const share = (shot.width / widest) * 100
      return `<figure class="shot" style="flex:0 1 ${share.toFixed(1)}%">
          <figcaption>${escapeHtml(LABEL[shot.device] || shot.device)}
            <span class="px">${shot.width}px</span></figcaption>
          <a href="${escapeHtml(shot.file)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(shot.file)}" alt="${escapeHtml(page.name)} ${escapeHtml(shot.device)}"
                 loading="lazy" decoding="async" />
          </a>
        </figure>`
    }).join('')

    return `<section class="page">
        <h2>${escapeHtml(page.name)}</h2>
        <p class="url"><a href="${escapeHtml(page.url)}" target="_blank" rel="noopener">${escapeHtml(page.url)}</a></p>
        <div class="shots">${shots}</div>
      </section>`
  }).join('')

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>スマホ表示チェック</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body { margin:0; font-family:"Hiragino Sans","Yu Gothic",system-ui,sans-serif;
             color:#1b1f2a; background:#f7f8fb; line-height:1.7; }
      .wrap { max-width:1100px; margin:0 auto; padding:28px 20px 64px; }
      h1 { font-size:clamp(21px,4vw,28px); margin:0 0 6px; }
      h2 { font-size:17px; margin:0 0 2px; }
      .lead { color:#4b5563; font-size:14px; margin:0 0 26px; }
      .page { background:#fff; border:1px solid #e2e6ef; border-radius:10px;
              padding:18px; margin:0 0 20px; }
      .url { margin:0 0 14px; font-size:12px; }
      .url a { color:#2b6cb0; overflow-wrap:anywhere; }
      /* **実際の幅の比のまま並べる。** 同じ大きさに揃えると狭さが伝わらない。 */
      .shots { display:flex; gap:14px; align-items:flex-start; }
      .shot { margin:0; min-width:0; }
      figcaption { font-size:12px; color:#4b5563; margin-bottom:6px; font-weight:600; }
      .px { color:#9aa2b1; font-weight:400; margin-left:5px; }
      .shot img { display:block; width:100%; height:auto; border:1px solid #e2e6ef;
                  border-radius:6px; background:#fff; }
      .note { font-size:12px; color:#6b7280; margin:18px 0 0; }
      .note strong { color:#1b1f2a; }
      @media (max-width:640px) { .shots { flex-wrap:wrap; } .shot { flex-basis:100% !important; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>スマホ表示チェック</h1>
      <p class="lead">${escapeHtml(data.confirmedOn || '')} 時点。${pages.length}ページ。</p>
      ${sections}
      <p class="note"><strong>撮っているのは「開いた瞬間に見える範囲」です。</strong>
        縦に全部つなげた画像にしていません。見たいのは、来た人が最初に何を見るかだからです。</p>
      <p class="note"><strong>幅の比はそのままにしてあります。</strong>
        3つを同じ大きさに揃えると、スマホでどれだけ狭いかが分からなくなります。</p>
      <p class="note">画像をクリックすると原寸で開きます。</p>
    </div>
  </body>
</html>
`

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'index.html'), html, 'utf8')
  await writeFile(path.join(outDir, 'CNAME'), `${SITE_DOMAIN}\n`, 'utf8')
  console.log(`${pages.length}ページぶんを書き出しました。`)
}

main()
