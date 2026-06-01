/**
 * dummy_data.csv(EUC-KR) → src/data/passenger_summary.json 생성 스크립트
 *
 * 출력 구조 (역별):
 *   numWeekdays / numWeekends   : 평일·주말 날짜 수 (평균 계산용)
 *   data[direction][type][weekday|weekend][h]  : 해당 조건 합산값 (24슬롯)
 *   hourly[h]      : 전체 일평균 (PeakCard·차트 표시용)
 *   wdr / wkr      : 평일·주말 상대 비율 (PeakCard 요일 표시용)
 *   cnt            : 필터 없는 기본 일평균 (passengerRange 슬라이더 계산용)
 *   age            : 유형별 비중 % (파이차트용)
 *
 * 확장성: 행 수가 늘어도 출력 JSON 크기는
 *   역 수 × 2방향 × 5유형 × 2요일 × 24시간 = 역당 480개 숫자 (고정)
 *
 * 재실행: node scripts/preprocess.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = join(__dirname, '../src/data/dummy_data.csv')
const OUT_PATH = join(__dirname, '../src/data/passenger_summary.json')

// ── 1. CSV 읽기 (UTF-8 BOM 자동 제거) ────────────────────────────────────
const rawBuf = readFileSync(CSV_PATH)
// UTF-8 BOM(EF BB BF) 제거
const csvText = rawBuf[0] === 0xEF && rawBuf[1] === 0xBB && rawBuf[2] === 0xBF
  ? rawBuf.slice(3).toString('utf8')
  : rawBuf.toString('utf8')

// ── 2. CSV 파싱 ───────────────────────────────────────────────────────────
const [headerLine, ...dataLines] = csvText.trim().split('\n')
const headers = headerLine.split(',').map(h => h.trim())

// CSV 시간대 컬럼 — 인덱스 0 = "06시간대이전", 1-18 = 시간대별, 19 = "24시간대이후"
const CSV_TIME_COLS = [
  '06시간대이전',
  '06-07시간대', '07-08시간대', '08-09시간대', '09-10시간대',
  '10-11시간대', '11-12시간대', '12-13시간대', '13-14시간대',
  '14-15시간대', '15-16시간대', '16-17시간대', '17-18시간대',
  '18-19시간대', '19-20시간대', '20-21시간대', '21-22시간대',
  '22-23시간대', '23-24시간대',
  '24시간대이후',  // 무시
]

const colIndex = {}
headers.forEach((h, i) => { colIndex[h] = i })

// 역명 정규화 (dummy_data ↔ station_info 불일치 보정)
const NAME_NORMALIZE = {
  '동대문역사문화공원(DDP)': '동대문역사문화공원',
  '삼각지(전쟁기념관)': '삼각지',
  '상봉': '상봉(시외버스터미널)',
}

// 승객유형 → 앱 내부 카테고리 매핑
const TYPE_MAP = {
  '어린이': '아동', '영어 어린이': '아동', '일어 어린이': '아동', '중국어 어린이': '아동',
  '일반': '일반', '영어 일반': '일반', '일어 일반': '일반', '중국어 일반': '일반', '직원': '일반',
  '중고생': '중고생',
  '청소년': '청소년',
  '우대권': '우대권',
}

const USER_TYPES = ['아동', '청소년', '중고생', '일반', '우대권']
const DIRECTIONS = ['승차', '하차']

function isWeekday(dateStr) {
  const day = new Date(dateStr).getDay()
  return day >= 1 && day <= 5
}

// ── 3. 큐브 집계 ─────────────────────────────────────────────────────────
// acc[역명].cube[direction][type][weekday|weekend][24] = 합산값
const acc = new Map()

for (const line of dataLines) {
  if (!line.trim()) continue
  const vals = line.split(',')
  const get = col => (vals[colIndex[col]] ?? '').trim()

  const rawName = get('역명')
  const name = NAME_NORMALIZE[rawName] ?? rawName
  const date = get('수송일자')
  const direction = get('승하차구분')   // '승차' | '하차'
  const typeRaw = get('승객유형')
  const type = TYPE_MAP[typeRaw] ?? '일반'

  if (!DIRECTIONS.includes(direction)) continue

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
    acc.set(name, {
      allDates: new Set(),
      weekdayDates: new Set(),
      weekendDates: new Set(),
      cube,
    })
  }

  const s = acc.get(name)
  s.allDates.add(date)
  const wd = isWeekday(date)
  if (wd) s.weekdayDates.add(date)
  else s.weekendDates.add(date)

  const target = wd ? s.cube[direction][type].weekday : s.cube[direction][type].weekend

  // 06시간대이전 → 0-5시 균등 분배
  const preSlot = parseInt(vals[colIndex['06시간대이전']]) || 0
  const perHour = Math.round(preSlot / 6)
  for (let h = 0; h < 6; h++) target[h] += perHour

  // 06-07 ~ 23-24 → 6-23시 1:1
  for (let h = 6; h <= 23; h++) {
    target[h] += parseInt(vals[colIndex[CSV_TIME_COLS[h - 5]]]) || 0
  }
}

// ── 4. 요약 JSON 생성 ─────────────────────────────────────────────────────
const summary = {}

for (const [name, s] of acc) {
  const numWeekdays = s.weekdayDates.size || 1
  const numWeekends = s.weekendDates.size || 1
  const { cube } = s

  // 전체 일평균 hourly (모든 방향·유형 합산 후 날짜 수로 나눔)
  const hourly = new Array(24).fill(0)
  for (const d of DIRECTIONS) {
    for (const t of USER_TYPES) {
      for (let h = 0; h < 24; h++) {
        hourly[h] += cube[d][t].weekday[h] / numWeekdays
        hourly[h] += cube[d][t].weekend[h] / numWeekends
      }
    }
  }
  // 평일+주말을 합산했으므로 2로 나눠 "평균 하루" 스케일로
  for (let h = 0; h < 24; h++) hourly[h] = Math.round(hourly[h] / 2)

  // cnt = 필터 없는 기본 일평균 (전체 방향, 전체 유형, 전체 시간)
  const wdTotal = DIRECTIONS.flatMap(d => USER_TYPES.map(t =>
    cube[d][t].weekday.reduce((a, v) => a + v, 0)
  )).reduce((a, v) => a + v, 0)
  const weTotal = DIRECTIONS.flatMap(d => USER_TYPES.map(t =>
    cube[d][t].weekend.reduce((a, v) => a + v, 0)
  )).reduce((a, v) => a + v, 0)

  const wdAvg = wdTotal / numWeekdays
  const weAvg = weTotal / numWeekends
  const totalDays = numWeekdays + numWeekends
  const cnt = Math.round((wdTotal + weTotal) / totalDays)
  const maxAvg = Math.max(wdAvg, weAvg) || 1

  // 유형별 비중 (파이차트)
  const typeTotals = {}
  for (const t of USER_TYPES) {
    const v = DIRECTIONS.reduce((a, d) =>
      a + cube[d][t].weekday.reduce((s, x) => s + x, 0)
        + cube[d][t].weekend.reduce((s, x) => s + x, 0), 0)
    typeTotals[t] = v
  }
  const typeSum = Object.values(typeTotals).reduce((a, v) => a + v, 0) || 1
  const age = {}
  for (const t of USER_TYPES) age[t] = Math.round(typeTotals[t] / typeSum * 100)
  const ageAdj = 100 - Object.values(age).reduce((a, v) => a + v, 0)
  if (ageAdj !== 0) age['일반'] += ageAdj

  // cube 값을 정수로 반올림 (JSON 크기 절약)
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
