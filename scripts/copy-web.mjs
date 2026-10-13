// 웹 자산을 Capacitor 의 webDir(www/)로 복사한다.
// PWA(루트에서 직접 서빙)와 Capacitor(www/) 양쪽을 동시에 유지하기 위함.
// 서비스워커/매니페스트는 네이티브 앱 셸에서는 불필요하므로 제외한다.
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const www = resolve(root, 'www')

const FILES = ['index.html', 'styles.css', 'app.js', 'analysis.js']
const DIRS = ['icons']

async function main() {
  // www 초기화
  if (existsSync(www)) await rm(www, { recursive: true, force: true })
  await mkdir(www, { recursive: true })

  for (const f of FILES) {
    await cp(resolve(root, f), resolve(www, f))
  }
  for (const d of DIRS) {
    await cp(resolve(root, d), resolve(www, d), { recursive: true })
  }

  // 네이티브 앱 셸에서는 서비스워커 등록이 불필요하므로 index.html에서 제거
  const indexPath = resolve(www, 'index.html')
  let html = await readFile(indexPath, 'utf8')
  html = html.replace(
    /<!-- 서비스 워커 등록 \(오프라인 지원\) -->[\s\S]*?<\/script>/,
    '<!-- (네이티브 앱 빌드에서는 서비스 워커 등록을 생략합니다) -->',
  )
  // manifest 링크도 네이티브에서는 불필요하지만 남겨도 무해하므로 유지
  await writeFile(indexPath, html, 'utf8')

  console.log('✓ 웹 자산을 www/ 로 복사 완료:', [...FILES, ...DIRS].join(', '))
}

main().catch((err) => {
  console.error('copy-web 실패:', err)
  process.exit(1)
})
