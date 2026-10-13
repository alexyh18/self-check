import { analyzeImage, STAGES } from './analysis.js'

const main = document.getElementById('main')
const homeBtn = document.getElementById('homeBtn')
const cameraInput = document.getElementById('cameraInput')
const fileInput = document.getElementById('fileInput')

/** @type {string|null} */
let imageUrl = null
/** @type {HTMLImageElement|null} */
let loadedImg = null

homeBtn.addEventListener('click', reset)

cameraInput.addEventListener('change', onFilePicked)
fileInput.addEventListener('change', onFilePicked)

/* ---------------- PWA 설치(홈 화면에 추가) 처리 ---------------- */
/** @type {any} */
let deferredPrompt = null

window.addEventListener('beforeinstallprompt', (e) => {
  // 안드로이드 Chrome: 기본 설치 배너를 막고 직접 버튼으로 유도
  e.preventDefault()
  deferredPrompt = e
  showInstallButton()
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  hideInstallButton()
})

function showInstallButton() {
  const btn = document.getElementById('installBtn')
  if (btn) btn.hidden = false
}
function hideInstallButton() {
  const btn = document.getElementById('installBtn')
  if (btn) btn.hidden = true
}

async function promptInstall() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  try {
    await deferredPrompt.userChoice
  } finally {
    deferredPrompt = null
    hideInstallButton()
  }
}

// 이미 설치되어 standalone으로 실행 중인지 여부
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    window.navigator.standalone === true
  )
}

function onFilePicked(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = '' // 같은 파일 재선택 허용
  if (!file) return
  if (!file.type.startsWith('image/')) {
    renderPreviewError('이미지 파일을 선택해 주세요.')
    return
  }
  if (imageUrl) URL.revokeObjectURL(imageUrl)
  imageUrl = URL.createObjectURL(file)
  renderPreview()
}

function reset() {
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl)
    imageUrl = null
  }
  loadedImg = null
  homeBtn.hidden = true
  renderIntro()
}

/* ----------------------------- 화면: 인트로 ----------------------------- */
function renderIntro(errorMsg) {
  homeBtn.hidden = true
  main.innerHTML = `
    <section class="card intro fade-in">
      <div class="intro-hero">
        <div class="hero-illustration">🔬</div>
        <h1 class="hero-title">정수리 사진으로 탈모 셀프 체크</h1>
        <p class="hero-sub">정수리를 촬영하면 두피 노출도와 모발 밀도를 분석해 5단계 지표로 알려드려요.</p>
      </div>
      <div class="steps">
        ${step(1, '밝은 조명 아래에서')}
        ${step(2, '정수리가 중앙에 오도록')}
        ${step(3, '가까이에서 촬영')}
      </div>
      ${errorMsg ? `<p class="error-text">${errorMsg}</p>` : ''}
      <div class="btn-row stacked">
        <button class="primary-btn" id="camBtn">📷 카메라로 촬영</button>
        <button class="secondary-btn" id="pickBtn">🖼️ 사진 선택</button>
      </div>
      <div class="stage-legend">
        ${STAGES.map(
          (s) =>
            `<span class="legend-chip" style="border-color:${s.color}">
              <span class="legend-dot" style="background:${s.color}"></span>${s.label}
            </span>`,
        ).join('')}
      </div>
      <p class="privacy-note">🔒 사진은 기기 안에서만 분석되며 어디에도 전송·저장되지 않습니다.</p>
      <button class="install-btn" id="installBtn" hidden>⬇️ 홈 화면에 앱 설치</button>
    </section>
  `
  document.getElementById('camBtn').addEventListener('click', () => cameraInput.click())
  document.getElementById('pickBtn').addEventListener('click', () => fileInput.click())

  const installBtn = document.getElementById('installBtn')
  installBtn.addEventListener('click', promptInstall)
  // 설치 가능 이벤트가 이미 발생했고 아직 설치 전이면 버튼 노출
  if (deferredPrompt && !isStandalone()) installBtn.hidden = false
}

function step(n, text) {
  return `<div class="step"><span class="step-num">${n}</span><span class="step-text">${text}</span></div>`
}

/* ----------------------------- 화면: 미리보기 ----------------------------- */
function renderPreview(errorMsg) {
  homeBtn.hidden = false
  main.innerHTML = `
    <section class="card fade-in">
      <h2 class="section-title">이 사진으로 분석할까요?</h2>
      <p class="hint">정수리가 사진 중앙(점선 원) 안에 오도록 촬영된 사진이 가장 정확해요.</p>
      <div class="preview-wrap">
        <img id="previewImg" class="preview-img" alt="업로드한 정수리 사진" />
        <div class="center-guide"></div>
      </div>
      ${errorMsg ? `<p class="error-text">${errorMsg}</p>` : ''}
      <div class="btn-row">
        <button class="secondary-btn" id="reselectBtn">다시 선택</button>
        <button class="primary-btn" id="analyzeBtn">분석 시작</button>
      </div>
    </section>
  `
  const previewImg = document.getElementById('previewImg')
  previewImg.src = imageUrl
  previewImg.onload = () => {
    loadedImg = previewImg
  }
  document.getElementById('reselectBtn').addEventListener('click', () => fileInput.click())
  document.getElementById('analyzeBtn').addEventListener('click', runAnalysis)
}

function renderPreviewError(msg) {
  if (imageUrl) renderPreview(msg)
  else renderIntro(msg)
}

/* ----------------------------- 분석 실행 ----------------------------- */
function runAnalysis() {
  if (!loadedImg || !loadedImg.complete || !loadedImg.naturalWidth) {
    renderPreview('이미지가 아직 로드되지 않았어요. 잠시 후 다시 시도해 주세요.')
    return
  }
  renderAnalyzing()
  setTimeout(() => {
    try {
      const res = analyzeImage(loadedImg)
      if (res.usableRatio < 0.25) {
        renderPreview(
          '사진에서 두피/모발을 충분히 인식하지 못했어요. 밝은 곳에서 정수리가 중앙에 오도록 가까이 다시 찍어 주세요.',
        )
        return
      }
      renderResult(res)
    } catch (err) {
      console.error(err)
      renderPreview('분석 중 문제가 발생했습니다. 다른 사진으로 다시 시도해 주세요.')
    }
  }, 650)
}

/* ----------------------------- 화면: 분석 중 ----------------------------- */
function renderAnalyzing() {
  homeBtn.hidden = false
  main.innerHTML = `
    <section class="card analyzing fade-in">
      <div class="scanner">
        <img class="scan-img" src="${imageUrl}" alt="" />
        <div class="scan-line"></div>
      </div>
      <h2 class="section-title">두피를 분석하고 있어요…</h2>
      <p class="hint">모발 밀도와 두피 노출도를 계산하는 중</p>
    </section>
  `
}

/* ----------------------------- 화면: 결과 ----------------------------- */
function renderResult(res) {
  homeBtn.hidden = false
  const stage = res.stage
  const segs = Array.from({ length: 5 })
    .map(
      (_, i) =>
        `<div class="stage-seg" style="${
          i <= res.stageIndex ? `background:${stage.color}` : ''
        }"></div>`,
    )
    .join('')

  main.innerHTML = `
    <section class="card result fade-in">
      <h2 class="section-title">분석 결과</h2>
      <div class="gauge-wrap">
        <svg class="gauge" viewBox="0 0 120 120">
          <circle class="gauge-bg" cx="60" cy="60" r="54"></circle>
          <circle class="gauge-fg" id="gaugeFg" cx="60" cy="60" r="54" style="stroke:${stage.color}"></circle>
        </svg>
        <div class="gauge-center">
          <span class="gauge-score" id="gaugeScore">0</span>
          <span class="gauge-unit">두피 건강 점수</span>
        </div>
      </div>
      <div class="stage-badge" style="background:${stage.color}">${stage.short} · ${stage.label}</div>
      <div class="stage-track">${segs}</div>
      <p class="stage-desc">${stage.description}</p>

      <div class="image-compare">
        <div class="compare-view">
          <img class="compare-base" src="${imageUrl}" alt="원본" />
          <canvas class="compare-heatmap" id="heatmapCanvas"></canvas>
        </div>
        <button class="toggle-btn" id="toggleBtn">분석 오버레이 끄기</button>
        <p class="legend-note"><span class="dot red"></span> 두피 노출 추정 영역</p>
      </div>

      <div class="metrics">
        ${metric('두피 노출도', pct(res.scalpRatio))}
        ${metric('정수리 중심 노출', pct(res.centerScalpRatio))}
        ${metric('모발 밀도 추정', pct(res.hairDensity))}
      </div>

      <div class="advice-box" style="border-left-color:${stage.color}">
        <strong>💡 관리 팁</strong>
        <p>${stage.advice}</p>
      </div>

      <div class="btn-row stacked">
        <button class="primary-btn" id="retryBtn">다시 측정하기</button>
      </div>
      <p class="disclaimer">⚠️ 이 측정은 사진의 밝기·각도·화질에 영향을 받으며 의학적 진단을 대체하지 않습니다.</p>
    </section>
  `

  // heatmap 그리기
  const canvas = document.getElementById('heatmapCanvas')
  canvas.width = res.heatmap.width
  canvas.height = res.heatmap.height
  canvas.getContext('2d').putImageData(res.heatmap, 0, 0)
  canvas.style.opacity = '0.78'

  // 오버레이 토글
  let showHeatmap = true
  const toggleBtn = document.getElementById('toggleBtn')
  toggleBtn.addEventListener('click', () => {
    showHeatmap = !showHeatmap
    canvas.style.opacity = showHeatmap ? '0.78' : '0'
    toggleBtn.textContent = showHeatmap ? '분석 오버레이 끄기' : '분석 오버레이 켜기'
  })

  document.getElementById('retryBtn').addEventListener('click', reset)

  // 게이지 애니메이션
  animateGauge(res.score, stage.color)
}

function animateGauge(score, color) {
  const fg = document.getElementById('gaugeFg')
  const scoreEl = document.getElementById('gaugeScore')
  const circumference = 2 * Math.PI * 54
  const start = performance.now()
  const duration = 900
  function tick(now) {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    const current = Math.round(score * eased)
    scoreEl.textContent = String(current)
    const dash = (current / 100) * circumference
    fg.style.strokeDasharray = `${dash} ${circumference}`
    fg.style.stroke = color
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function metric(label, value) {
  return `<div class="metric"><span class="metric-value">${value}</span><span class="metric-label">${label}</span></div>`
}

function pct(v) {
  return `${Math.round(v * 100)}%`
}

/* ----------------------------- 시작 ----------------------------- */
renderIntro()
