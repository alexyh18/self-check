// 정수리 사진 두피 노출도 분석 엔진 (순수 JS, 외부 의존성 없음)
// ---------------------------------------------------------------------------
// 이 로직은 의료 진단이 아니라 "참고용 셀프 체크" 지표를 계산합니다.
// 핵심 아이디어:
//   1) 이미지를 원형(정수리 영역)으로 잘라 분석한다.
//   2) 각 픽셀을 "모발(어두움)" / "두피(밝은 살색)" / "기타"로 분류한다.
//   3) 중심부(정수리 꼭대기)에 가중치를 둔다. 탈모는 보통 중앙부터 진행되므로.
//   4) 두피 노출 비율을 기반으로 0~100 점수와 단계를 산출한다.

export const STAGES = [
  {
    index: 0,
    label: '매우 양호',
    short: '1단계',
    color: '#16a34a',
    description: '두피 노출이 거의 없고 모발 밀도가 높은 편입니다.',
    advice: '현재 상태가 좋습니다. 두피 청결과 균형 잡힌 식습관을 유지하세요.',
  },
  {
    index: 1,
    label: '양호',
    short: '2단계',
    color: '#65a30d',
    description: '전반적으로 양호하나 정수리에 약간의 노출이 보입니다.',
    advice: '두피 마사지, 충분한 수면, 스트레스 관리로 현 상태를 유지하세요.',
  },
  {
    index: 2,
    label: '주의',
    short: '3단계',
    color: '#ca8a04',
    description: '정수리 중심부의 두피 노출이 눈에 띄기 시작합니다.',
    advice: '초기 관리가 중요한 시기입니다. 두피 전문 관리나 전문의 상담을 고려해 보세요.',
  },
  {
    index: 3,
    label: '진행',
    short: '4단계',
    color: '#ea580c',
    description: '정수리 영역의 모발 밀도가 뚜렷하게 낮아진 상태입니다.',
    advice: '피부과 전문의 상담을 권장합니다. 조기 개입이 결과에 큰 차이를 만듭니다.',
  },
  {
    index: 4,
    label: '심화',
    short: '5단계',
    color: '#dc2626',
    description: '정수리 두피 노출이 광범위하게 나타납니다.',
    advice: '전문의 진료를 적극 권장합니다. 다양한 치료 옵션에 대해 상담받아 보세요.',
  },
]

const ANALYSIS_SIZE = 240 // 분석용 다운스케일 해상도

/** 픽셀이 "두피(노출된 피부)"인지 판단. 살색 계열이면서 밝은 픽셀. */
function isScalp(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const brightness = (r + g + b) / 3
  const skinLike = r > 95 && g > 55 && b > 45 && r >= g && g >= b * 0.9
  const bright = brightness > 110
  const notTooSaturated = max - min < 120
  return skinLike && bright && notTooSaturated
}

/** 픽셀이 "모발"인지 판단. 어두운 영역. */
function isHair(r, g, b) {
  const brightness = (r + g + b) / 3
  return brightness < 95
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function exposureToStage(exposure) {
  if (exposure < 0.08) return 0
  if (exposure < 0.2) return 1
  if (exposure < 0.38) return 2
  if (exposure < 0.6) return 3
  return 4
}

/**
 * 이미지(HTMLImageElement/Canvas)를 분석해 결과 객체를 반환.
 * @returns {{scalpRatio:number, centerScalpRatio:number, hairDensity:number,
 *   score:number, stageIndex:number, stage:object, heatmap:ImageData, usableRatio:number}}
 */
export function analyzeImage(source) {
  const size = ANALYSIS_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  const sw = source.naturalWidth || source.width
  const sh = source.naturalHeight || source.height
  const side = Math.min(sw, sh)
  const sx = (sw - side) / 2
  const sy = (sh - side) / 2
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size)

  const img = ctx.getImageData(0, 0, size, size)
  const data = img.data

  const heatmap = ctx.createImageData(size, size)
  const hData = heatmap.data

  const cx = size / 2
  const cy = size / 2
  const radius = size / 2

  let weightedScalp = 0
  let weightedTotal = 0
  let centerScalp = 0
  let centerTotal = 0
  let hairPixels = 0
  let analyzablePixels = 0
  let usablePixels = 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      if (dist > radius) {
        hData[i] = r * 0.15
        hData[i + 1] = g * 0.15
        hData[i + 2] = b * 0.15
        hData[i + 3] = 255
        continue
      }

      analyzablePixels++

      const norm = dist / radius
      const weight = 1 - norm * 0.8

      const scalp = isScalp(r, g, b)
      const hair = isHair(r, g, b)
      if (scalp || hair) usablePixels++

      weightedTotal += weight
      if (scalp) weightedScalp += weight
      if (hair) hairPixels++

      if (norm < 0.35) {
        centerTotal++
        if (scalp) centerScalp++
      }

      if (scalp) {
        hData[i] = 220
        hData[i + 1] = 50
        hData[i + 2] = 50
        hData[i + 3] = 230
      } else if (hair) {
        hData[i] = r
        hData[i + 1] = g
        hData[i + 2] = b
        hData[i + 3] = 255
      } else {
        hData[i] = r
        hData[i + 1] = g
        hData[i + 2] = b
        hData[i + 3] = 180
      }
    }
  }

  const scalpRatio = weightedTotal > 0 ? weightedScalp / weightedTotal : 0
  const centerScalpRatio = centerTotal > 0 ? centerScalp / centerTotal : 0
  const hairDensity = analyzablePixels > 0 ? hairPixels / analyzablePixels : 0
  const usableRatio = analyzablePixels > 0 ? usablePixels / analyzablePixels : 0

  const exposure = scalpRatio * 0.5 + centerScalpRatio * 0.5
  const score = Math.round(clamp(100 - exposure * 130, 0, 100))
  const stageIndex = exposureToStage(exposure)

  return {
    scalpRatio,
    centerScalpRatio,
    hairDensity,
    score,
    stageIndex,
    stage: STAGES[stageIndex],
    heatmap,
    usableRatio,
  }
}
