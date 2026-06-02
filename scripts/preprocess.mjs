/**
 * temp.csv (new long-format) → src/data/passenger_summary.json
 *
 * 입력 컬럼:
 *   날짜, 호선, 역명, 역번호, 구분, 주말구분, 환승역, 시간대,
 *   이용객수_노인, 이용객수_어린이, 이용객수_외국인, 이용객수_일반,
 *   이용객수_직원, 이용객수_청소년, 이용객수_전체, 위도, 경도
 *
 * 유형 매핑:
 *   이용객수_어린이           → 아동
 *   이용객수_청소년           → 청소년  (중고생 데이터 없음 — 0으로 유지)
 *   이용객수_일반 + 직원 + 외국인 → 일반
 *   이용객수_노인             → 우대권
 *
 * 시간대 처리:
 *   "06시간대이전"  → 0-5시 균등 분배 (÷6)
 *   "HH-HH시간대"  → 해당 시(H)에 직접 가산
 *   "24시간대이후" → 무시
 *
 * 재실행: node scripts/preprocess.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = join(__dirname, '../src/data/final_merged_weekly_nonzero.csv')
const OUT_PATH = join(__dirname, '../src/data/passenger_summary.json')

// ── 1. CSV 읽기 (UTF-8 BOM 자동 제거) ────────────────────────────────────
const rawBuf = readFileSync(CSV_PATH)
const csvText = rawBuf[0] === 0xEF && rawBuf[1] === 0xBB && rawBuf[2] === 0xBF
  ? rawBuf.slice(3).toString('utf8')
  : rawBuf.toString('utf8')

// ── 2. CSV 파싱 ───────────────────────────────────────────────────────────
const [headerLine, ...dataLines] = csvText.trim().split('\n')
const headers = headerLine.split(',').map(h => h.trim())
const colIndex = {}
headers.forEach((h, i) => { colIndex[h] = i })

const USER_TYPES = ['아동', '청소년', '중고생', '일반', '우대권']
const DIRECTIONS = ['승차', '하차']

// "06-07시간대" → 6, "23-24시간대" → 23
// "06시간대이전" / "24시간대이후" → null (호출부에서 별도 처리)
function slotToHour(slot) {
  const m = slot.match(/^(\d+)-\d+시간대$/)
  return m ? parseInt(m[1], 10) : null
}

// ── 3. 큐브 집계 ─────────────────────────────────────────────────────────
// acc[역명].cube[direction][type][weekday|weekend][24] = 합산값
const acc = new Map()

for (const line of dataLines) {
  if (!line.trim()) continue
  const vals = line.split(',')
  const get = col => (vals[colIndex[col]] ?? '').trim()

  const name      = get('역명')
  const date      = get('날짜')         // "N월 M주차 평일/주말"
  const direction = get('구분')          // '승차' | '하차'
  const isWeekend = get('주말구분') === '주말'
  const slot      = get('시간대')

  if (!DIRECTIONS.includes(direction)) continue
  if (slot === '24시간대이후') continue

  const cnt어린이 = parseFloat(get('이용객수_어린이')) || 0
  const cnt청소년 = parseFloat(get('이용객수_청소년')) || 0
  const cnt일반   = parseFloat(get('이용객수_일반'))   || 0
  const cnt직원   = parseFloat(get('이용객수_직원'))   || 0
  const cnt외국인 = parseFloat(get('이용객수_외국인')) || 0
  const cnt노인   = parseFloat(get('이용객수_노인'))   || 0

  const typeValues = {
    아동:   cnt어린이,
    청소년: cnt청소년,
    중고생: 0,
    일반:   cnt일반 + cnt직원 + cnt외국인,
    우대권: cnt노인,
  }

  if (!acc.has(name)) {
    const cube = {}
    for (const d of DIRECTIONS) {
      cube[d] = {}
      for (const t of USER_TYPES) {
        cube[d][t] = {
          weekday: new Array(24).fill(0),
          weekend: new Array(24).fill(0),
        }
      }
    }
    acc.set(name, { weekdayDates: new Set(), weekendDates: new Set(), cube })
  }

  const s = acc.get(name)
  if (isWeekend) s.weekendDates.add(date)
  else           s.weekdayDates.add(date)

  const bucket = isWeekend ? 'weekend' : 'weekday'

  for (const [type, val] of Object.entries(typeValues)) {
    const target = s.cube[direction][type][bucket]

    if (slot === '06시간대이전') {
      const perHour = val / 6
      for (let h = 0; h < 6; h++) target[h] += perHour
    } else {
      const hour = slotToHour(slot)
      if (hour !== null) target[hour] += val
    }
  }
}

// ── 4. 요약 JSON 생성 ─────────────────────────────────────────────────────
const summary = {}

for (const [name, s] of acc) {
  const numWeekdays = s.weekdayDates.size || 1
  const numWeekends = s.weekendDates.size || 1
  const { cube } = s

  // 전체 일평균 hourly
  const hourly = new Array(24).fill(0)
  for (const d of DIRECTIONS) {
    for (const t of USER_TYPES) {
      for (let h = 0; h < 24; h++) {
        hourly[h] += cube[d][t].weekday[h] / numWeekdays
        hourly[h] += cube[d][t].weekend[h] / numWeekends
      }
    }
  }
  for (let h = 0; h < 24; h++) hourly[h] = Math.round(hourly[h] / 2)

  const wdTotal = DIRECTIONS.flatMap(d => USER_TYPES.map(t =>
    cube[d][t].weekday.reduce((a, v) => a + v, 0)
  )).reduce((a, v) => a + v, 0)
  const weTotal = DIRECTIONS.flatMap(d => USER_TYPES.map(t =>
    cube[d][t].weekend.reduce((a, v) => a + v, 0)
  )).reduce((a, v) => a + v, 0)

  const wdAvg   = wdTotal / numWeekdays
  const weAvg   = weTotal / numWeekends
  const totalDays = numWeekdays + numWeekends
  const cnt     = Math.round((wdTotal + weTotal) / totalDays)
  const maxAvg  = Math.max(wdAvg, weAvg) || 1

  const typeTotals = {}
  for (const t of USER_TYPES) {
    typeTotals[t] = DIRECTIONS.reduce((a, d) =>
      a + cube[d][t].weekday.reduce((s, x) => s + x, 0)
        + cube[d][t].weekend.reduce((s, x) => s + x, 0), 0)
  }
  const typeSum = Object.values(typeTotals).reduce((a, v) => a + v, 0) || 1
  const age = {}
  for (const t of USER_TYPES) age[t] = Math.round(typeTotals[t] / typeSum * 100)
  const ageAdj = 100 - Object.values(age).reduce((a, v) => a + v, 0)
  if (ageAdj !== 0) age['일반'] += ageAdj

  for (const d of DIRECTIONS) {
    for (const t of USER_TYPES) {
      cube[d][t].weekday = cube[d][t].weekday.map(Math.round)
      cube[d][t].weekend = cube[d][t].weekend.map(Math.round)
    }
  }

  summary[name] = {
    numWeekdays,
    numWeekends,
    cnt,
    hourly,
    wdr: parseFloat((wdAvg / maxAvg).toFixed(3)),
    wkr: parseFloat((weAvg / maxAvg).toFixed(3)),
    age,
    data: cube,
  }
}

writeFileSync(OUT_PATH, JSON.stringify(summary), 'utf8')

const stations = Object.keys(summary)
const bytes = JSON.stringify(summary).length
console.log(`Generated ${OUT_PATH}`)
console.log(`  ${stations.length}개 역  |  JSON ${(bytes/1024).toFixed(1)} KB`)
for (const [n, d] of Object.entries(summary)) {
  console.log(`  ${n}: cnt=${d.cnt.toLocaleString()}  wdr=${d.wdr}  wkr=${d.wkr}`)
}
