import { useMemo, useState } from 'react'
import './App.css'

const LINE_COLORS = {
  '1호선': '#0052A4',
  '2호선': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
  '5호선': '#996CAC',
  '6호선': '#CD7C2F',
  '7호선': '#747F00',
  '8호선': '#E6186C',
  '9호선': '#BDB092',
  신분당선: '#BE1522',
  경의중앙선: '#77C4A3',
  공항철도: '#4A90D9',
}

const AGE_COLORS = {
  아동: '#F97316',
  청소년: '#F59E0B',
  중고생: '#10B981',
  일반: '#3B82F6',
  우대권: '#A78BFA',
}

const STATIONS = [
  {
    id: 'gangnam',
    name: '강남역',
    lines: ['2호선', '신분당선'],
    tf: true,
    x: 218,
    y: 315,
    lat: 37.497952,
    lng: 127.027619,
    cnt: 9831,
    hourly: [80, 40, 25, 18, 35, 220, 950, 1480, 1620, 1100, 680, 580, 490, 510, 590, 720, 1840, 1500, 890, 580, 380, 260, 170, 110],
    wdr: 1.0,
    wkr: 0.65,
    age: { 아동: 15, 청소년: 10, 중고생: 8, 일반: 55, 우대권: 12 },
    attr: { 구: '강남구', 개통: '1982년', 출구: '13개', 노선: '2개' },
    simPat: [
      { name: '역삼역', lines: '2호선', pct: 96 },
      { name: '선릉역', lines: '2호선', pct: 92 },
      { name: '교대역', lines: '2·3호선', pct: 88 },
    ],
  },
  {
    id: 'hongdae',
    name: '홍대입구역',
    lines: ['2호선', '경의중앙선', '공항철도'],
    tf: true,
    x: 118,
    y: 175,
    lat: 37.557192,
    lng: 126.925381,
    cnt: 8245,
    hourly: [200, 80, 40, 28, 40, 120, 490, 780, 920, 740, 640, 680, 660, 700, 690, 770, 1090, 1390, 1650, 1570, 1190, 790, 490, 295],
    wdr: 0.85,
    wkr: 1.0,
    age: { 아동: 10, 청소년: 28, 중고생: 22, 일반: 35, 우대권: 5 },
    attr: { 구: '마포구', 개통: '2000년', 출구: '8개', 노선: '3개' },
    simPat: [
      { name: '합정역', lines: '2·6호선', pct: 93 },
      { name: '신촌역', lines: '2호선', pct: 89 },
      { name: '이대역', lines: '2호선', pct: 84 },
    ],
  },
  {
    id: 'seoul',
    name: '서울역',
    lines: ['1호선', '4호선', '공항철도'],
    tf: true,
    x: 172,
    y: 210,
    lat: 37.554648,
    lng: 126.972559,
    cnt: 8100,
    hourly: [100, 50, 30, 20, 80, 400, 1100, 1440, 1520, 980, 620, 555, 475, 515, 575, 655, 1380, 1200, 820, 555, 360, 238, 158, 108],
    wdr: 1.0,
    wkr: 0.58,
    age: { 아동: 12, 청소년: 8, 중고생: 6, 일반: 52, 우대권: 22 },
    attr: { 구: '중구', 개통: '1974년', 출구: '14개', 노선: '3개' },
    simPat: [
      { name: '시청역', lines: '1·2호선', pct: 91 },
      { name: '종각역', lines: '1호선', pct: 87 },
      { name: '동대문역', lines: '1·4호선', pct: 82 },
    ],
  },
  {
    id: 'sindorim',
    name: '신도림역',
    lines: ['1호선', '2호선'],
    tf: true,
    x: 78,
    y: 298,
    lat: 37.508725,
    lng: 126.891295,
    cnt: 7600,
    hourly: [60, 30, 18, 14, 58, 375, 1190, 1820, 1690, 945, 555, 475, 415, 455, 515, 635, 1540, 1345, 775, 495, 315, 198, 128, 78],
    wdr: 1.0,
    wkr: 0.52,
    age: { 아동: 14, 청소년: 12, 중고생: 10, 일반: 50, 우대권: 14 },
    attr: { 구: '구로구', 개통: '1974년', 출구: '7개', 노선: '2개' },
    simPat: [
      { name: '구로역', lines: '1호선', pct: 90 },
      { name: '대림역', lines: '2·7호선', pct: 86 },
      { name: '영등포역', lines: '1호선', pct: 82 },
    ],
  },
  {
    id: 'jamsil',
    name: '잠실역',
    lines: ['2호선', '8호선'],
    tf: true,
    x: 352,
    y: 265,
    lat: 37.513262,
    lng: 127.100159,
    cnt: 7452,
    hourly: [78, 38, 19, 14, 28, 148, 595, 975, 1095, 815, 635, 595, 545, 575, 635, 775, 1410, 1275, 1145, 895, 645, 418, 248, 128],
    wdr: 0.9,
    wkr: 1.0,
    age: { 아동: 18, 청소년: 15, 중고생: 12, 일반: 44, 우대권: 11 },
    attr: { 구: '송파구', 개통: '1980년', 출구: '12개', 노선: '2개' },
    simPat: [
      { name: '석촌역', lines: '8·9호선', pct: 88 },
      { name: '종합운동장역', lines: '2호선', pct: 83 },
      { name: '잠실나루역', lines: '2호선', pct: 79 },
    ],
  },
  {
    id: 'sadang',
    name: '사당역',
    lines: ['2호선', '4호선'],
    tf: true,
    x: 186,
    y: 350,
    lat: 37.47653,
    lng: 126.981685,
    cnt: 6800,
    hourly: [50, 24, 14, 9, 48, 318, 1045, 1375, 1258, 816, 518, 448, 398, 418, 478, 598, 1178, 1048, 738, 478, 298, 178, 108, 63],
    wdr: 1.0,
    wkr: 0.6,
    age: { 아동: 11, 청소년: 9, 중고생: 8, 일반: 56, 우대권: 16 },
    attr: { 구: '동작구', 개통: '1984년', 출구: '6개', 노선: '2개' },
    simPat: [
      { name: '방배역', lines: '2호선', pct: 87 },
      { name: '이수역', lines: '4·7호선', pct: 84 },
      { name: '낙성대역', lines: '2호선', pct: 79 },
    ],
  },
  {
    id: 'sinchon',
    name: '신촌역',
    lines: ['2호선'],
    tf: false,
    x: 148,
    y: 183,
    lat: 37.555134,
    lng: 126.936893,
    cnt: 5890,
    hourly: [148, 58, 29, 18, 29, 78, 348, 578, 678, 618, 578, 638, 618, 658, 638, 698, 978, 1088, 1178, 1118, 898, 598, 348, 198],
    wdr: 0.8,
    wkr: 1.0,
    age: { 아동: 8, 청소년: 30, 중고생: 24, 일반: 34, 우대권: 4 },
    attr: { 구: '서대문구', 개통: '1984년', 출구: '6개', 노선: '1개' },
    simPat: [
      { name: '이대역', lines: '2호선', pct: 94 },
      { name: '홍대입구역', lines: '2호선', pct: 89 },
      { name: '합정역', lines: '2·6호선', pct: 83 },
    ],
  },
  {
    id: 'seongsu',
    name: '성수역',
    lines: ['2호선'],
    tf: false,
    x: 295,
    y: 152,
    lat: 37.544581,
    lng: 127.055961,
    cnt: 4786,
    hourly: [39, 19, 9, 7, 19, 79, 278, 696, 754, 618, 478, 448, 418, 438, 478, 558, 840, 778, 678, 518, 358, 228, 138, 68],
    wdr: 1.0,
    wkr: 0.68,
    age: { 아동: 35, 청소년: 12, 중고생: 18, 일반: 28, 우대권: 7 },
    attr: { 구: '성동구', 개통: '1994년', 출구: '4개', 노선: '1개' },
    simPat: [
      { name: '뚝섬역', lines: '2호선', pct: 91 },
      { name: '건대입구역', lines: '2·7호선', pct: 87 },
      { name: '왕십리역', lines: '2호선', pct: 82 },
    ],
  },
  {
    id: 'jongno3',
    name: '종로3가역',
    lines: ['1호선', '3호선', '5호선'],
    tf: true,
    x: 212,
    y: 158,
    lat: 37.57042,
    lng: 126.992144,
    cnt: 4200,
    hourly: [38, 18, 11, 7, 19, 118, 378, 618, 718, 838, 898, 878, 858, 848, 818, 778, 658, 578, 518, 438, 338, 238, 138, 68],
    wdr: 0.95,
    wkr: 1.0,
    age: { 아동: 5, 청소년: 4, 중고생: 4, 일반: 48, 우대권: 39 },
    attr: { 구: '종로구', 개통: '1974년', 출구: '15개', 노선: '3개' },
    simPat: [
      { name: '종각역', lines: '1호선', pct: 90 },
      { name: '안국역', lines: '3호선', pct: 85 },
      { name: '광화문역', lines: '5호선', pct: 80 },
    ],
  },
  {
    id: 'itaewon',
    name: '이태원역',
    lines: ['6호선'],
    tf: false,
    x: 196,
    y: 250,
    lat: 37.534488,
    lng: 126.994302,
    cnt: 3214,
    hourly: [78, 38, 19, 11, 17, 43, 118, 208, 258, 278, 298, 318, 338, 358, 358, 378, 418, 478, 588, 678, 618, 538, 378, 198],
    wdr: 0.7,
    wkr: 1.0,
    age: { 아동: 8, 청소년: 20, 중고생: 18, 일반: 48, 우대권: 6 },
    attr: { 구: '용산구', 개통: '2000년', 출구: '4개', 노선: '1개' },
    simPat: [
      { name: '녹사평역', lines: '6호선', pct: 92 },
      { name: '한강진역', lines: '6호선', pct: 88 },
      { name: '약수역', lines: '3·6호선', pct: 81 },
    ],
  },
  {
    id: 'hapjeong',
    name: '합정역',
    lines: ['2호선', '6호선'],
    tf: true,
    x: 90,
    y: 208,
    lat: 37.549463,
    lng: 126.913739,
    cnt: 3100,
    hourly: [58, 23, 11, 7, 13, 48, 178, 338, 418, 378, 348, 378, 358, 378, 378, 418, 588, 638, 678, 618, 478, 318, 178, 88],
    wdr: 0.82,
    wkr: 1.0,
    age: { 아동: 12, 청소년: 24, 중고생: 20, 일반: 38, 우대권: 6 },
    attr: { 구: '마포구', 개통: '1994년', 출구: '8개', 노선: '2개' },
    simPat: [
      { name: '홍대입구역', lines: '2호선', pct: 93 },
      { name: '망원역', lines: '6호선', pct: 89 },
      { name: '성산역', lines: '6호선', pct: 84 },
    ],
  },
  {
    id: 'seocho',
    name: '서초역',
    lines: ['2호선'],
    tf: false,
    x: 200,
    y: 305,
    lat: 37.491897,
    lng: 127.007917,
    cnt: 2800,
    hourly: [24, 11, 7, 4, 13, 118, 478, 608, 568, 458, 338, 298, 278, 288, 308, 378, 538, 518, 478, 378, 258, 158, 88, 43],
    wdr: 1.0,
    wkr: 0.55,
    age: { 아동: 10, 청소년: 6, 중고생: 5, 일반: 63, 우대권: 16 },
    attr: { 구: '서초구', 개통: '1984년', 출구: '7개', 노선: '1개' },
    simPat: [
      { name: '교대역', lines: '2·3호선', pct: 91 },
      { name: '방배역', lines: '2호선', pct: 87 },
      { name: '강남역', lines: '2호선', pct: 82 },
    ],
  },
]

const METRO_LINE_PATHS = [
  { line: '1호선', d: 'M 8 322 C 42 313 56 300 78 298 C 116 296 134 245 172 210 C 196 188 204 166 212 158 C 242 130 284 120 334 126 C 368 130 394 120 430 105' },
  { line: '2호선', d: 'M 90 208 C 104 184 116 172 138 176 C 165 182 184 157 212 158 C 258 160 304 174 326 210 C 352 250 354 282 318 304 C 282 326 236 327 218 315 C 204 306 197 306 186 350 C 174 390 108 350 78 298 C 60 264 70 228 90 208' },
  { line: '3호선', d: 'M 180 18 C 192 70 194 118 212 158 C 222 184 214 222 196 250 C 181 274 204 292 200 305 C 195 322 186 350 172 382 C 160 410 168 456 176 486' },
  { line: '4호선', d: 'M 320 0 C 330 54 302 86 250 118 C 226 134 218 150 212 158 C 196 180 182 194 172 210 C 148 250 170 306 186 350 C 200 390 182 428 168 490' },
  { line: '5호선', d: 'M 0 148 C 42 142 70 128 104 128 C 146 126 176 144 212 158 C 252 174 288 176 330 180 C 362 184 386 158 440 162' },
  { line: '6호선', d: 'M 28 188 C 56 208 70 214 90 208 C 128 196 158 230 196 250 C 216 260 226 222 272 178 C 300 152 340 144 392 116' },
  { line: '7호선', d: 'M 6 402 C 48 392 42 350 84 346 C 120 342 145 366 186 350 C 226 336 236 304 276 286 C 318 268 330 232 382 218 C 404 212 420 200 440 180' },
  { line: '8호선', d: 'M 354 216 C 350 236 344 250 352 265 C 372 302 384 334 380 344 C 368 374 372 416 398 490' },
  { line: '9호선', d: 'M 0 238 C 32 232 38 220 58 232 C 96 254 142 230 196 250 C 222 260 234 286 262 280 C 306 270 322 250 352 265 C 376 276 400 258 440 252' },
  { line: '신분당선', d: 'M 218 315 C 236 340 238 362 252 384 C 264 402 276 436 280 490' },
  { line: '경의중앙선', d: 'M 0 118 C 54 138 78 166 118 175 C 150 182 150 206 172 210 C 198 216 230 204 252 210 C 282 218 306 202 330 196 C 368 186 404 190 440 202' },
  { line: '공항철도', d: 'M 0 70 C 44 88 74 142 118 175 C 140 192 152 208 172 210 C 198 212 210 228 230 236 C 250 244 276 236 306 224' },
]

const CITY_SHAPES = [
  'M 42 74 C 94 34 154 42 196 62 C 242 18 326 28 374 84 C 420 138 428 208 396 250 C 430 318 388 420 306 438 C 246 472 194 438 154 416 C 96 438 34 396 24 330 C -2 286 18 244 44 216 C 10 162 8 104 42 74 Z',
  'M 34 188 C 86 160 124 174 164 198 C 222 178 276 180 326 206 C 356 218 386 206 418 188 C 438 244 410 292 372 312 C 316 342 250 326 202 306 C 152 340 92 330 54 290 C 22 256 16 222 34 188 Z',
  'M 92 334 C 126 312 166 316 204 342 C 246 314 300 324 336 350 C 372 378 362 424 316 450 C 264 472 216 450 188 428 C 148 444 98 428 78 394 C 62 368 68 348 92 334 Z',
]

const ROAD_PATHS = [
  'M 36 112 C 92 136 132 128 188 146 C 244 164 298 142 366 152',
  'M 24 164 C 76 176 118 166 170 188 C 224 212 286 196 420 210',
  'M 34 216 C 92 198 144 210 198 228 C 248 244 312 238 386 226',
  'M 28 268 C 90 254 132 262 186 282 C 246 304 306 294 398 310',
  'M 62 330 C 118 308 170 324 224 344 C 276 364 330 354 390 380',
  'M 76 386 C 128 366 182 378 238 400 C 286 420 326 410 364 432',
  'M 86 52 C 92 116 104 168 122 226 C 142 286 132 350 114 430',
  'M 154 42 C 160 102 148 164 164 224 C 182 288 194 340 188 430',
  'M 220 48 C 214 118 226 176 236 234 C 248 294 252 354 240 434',
  'M 286 40 C 272 100 282 160 296 224 C 310 284 312 346 294 430',
  'M 352 76 C 332 132 344 190 356 246 C 370 308 360 372 342 430',
  'M 54 122 L 140 206 L 226 274 L 326 360',
  'M 104 86 L 186 166 L 278 244 L 380 334',
  'M 360 104 L 296 176 L 224 246 L 148 334',
  'M 404 190 L 322 230 L 244 286 L 166 376',
  'M 16 302 C 80 294 140 304 204 318 C 276 334 342 330 424 340',
  'M 44 248 C 108 238 154 248 206 260 C 282 278 348 264 416 270',
  'M 68 140 C 120 152 152 146 208 164 C 266 182 326 172 394 184',
]

const LINES = ['1호선', '2호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선', '9호선']
const USER_TYPES = ['아동', '청소년', '중고생', '일반', '우대권']
const AGE_ORDER = ['아동', '일반', '중고생', '청소년', '우대권']
const RANK_DOT_CLASSES = ['rd1', 'rd2', 'rd3']
const RANK_DOT_COLORS = ['#F59E0B', '#9CA3AF', '#B45309']

const initialWeights = [
  { group: '이용량', name: '이용자수', value: 80, active: true },
  { group: '시간 분포', name: '피크 집중도', value: 70, active: true },
  { group: '시간 분포', name: '오전 비중', value: 40, active: false },
  { group: '시간 분포', name: '오후 비중', value: 60, active: false },
  { group: '시간 분포', name: '야간 비중', value: 30, active: false },
  { group: '이용자층 편향', name: '어린이 편향', value: 50, active: false },
  { group: '이용자층 편향', name: '청소년 편향', value: 50, active: false },
  { group: '이용자층 편향', name: '일반인 편향', value: 50, active: false },
  { group: '이용자층 편향', name: '노인 편향', value: 50, active: false },
  { group: '이동 방향', name: '승차 비중', value: 50, active: false },
  { group: '이동 방향', name: '하차 비중', value: 50, active: false },
]

function formatHour(value) {
  return `${String(Math.round(value)).padStart(2, '0')}:00`
}

function formatPassenger(value) {
  if (value === 0) return '0명'
  if (value >= 10000) return '10,000+'
  return `${value.toLocaleString()}명`
}

function getDistanceKm(a, b) {
  const radius = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function lineTagStyle(line) {
  const color = LINE_COLORS[line] || '#888'
  return { background: `${color}22`, color }
}

function getFilteredCount(station, filters) {
  const [start, end] = filters.timeRange
  const hourlyTotal = station.hourly.reduce((sum, value) => sum + value, 0) || 1
  const timeTotal = station.hourly.slice(start, end).reduce((sum, value) => sum + value, 0)
  const timeFactor = timeTotal / hourlyTotal
  const dayFactor = filters.weekday === '평일' ? station.wdr : filters.weekday === '주말' ? station.wkr : (station.wdr + station.wkr) / 2
  const ageFactor = USER_TYPES.reduce((sum, type) => sum + (filters.activeTypes.has(type) ? station.age[type] || 0 : 0), 0) / 100
  const directionFactor = filters.boarding === '승차' ? 0.52 : filters.boarding === '하차' ? 0.48 : 1

  return Math.round(station.cnt * timeFactor * dayFactor * ageFactor * directionFactor)
}

function getStationMetrics(filters) {
  return STATIONS.map((station) => {
    const count = getFilteredCount(station, filters)
    const lineMatch = filters.activeLines.size > 0 && station.lines.some((line) => filters.activeLines.has(line))
    const transferMatch = filters.transfer === '전체' || (filters.transfer === '환승역만' ? station.tf : !station.tf)
    const passengerMatch = count >= filters.passengerRange[0] && count <= filters.passengerRange[1]
    const visible = lineMatch && transferMatch && passengerMatch && count > 0

    return { ...station, count, visible }
  })
}

function computeScores(weights, stationMetrics) {
  const activeDims = weights.filter((weight) => weight.active && weight.value > 0)
  if (!activeDims.length) return null

  const totalWeight = activeDims.reduce((sum, dim) => sum + dim.value, 0) || 1
  const visibleMetrics = stationMetrics.filter((station) => station.visible)
  const raw = visibleMetrics.map((station) => {
    const total = station.hourly.reduce((sum, value) => sum + value, 0) || 1
    const morning = station.hourly.slice(6, 12).reduce((sum, value) => sum + value, 0) / total
    const afternoon = station.hourly.slice(12, 18).reduce((sum, value) => sum + value, 0) / total
    const night = station.hourly.slice(18, 24).reduce((sum, value) => sum + value, 0) / total
    const peak = Math.max(...station.hourly) / total
    let score = 0

    activeDims.forEach((dim) => {
      let value = 0
      if (dim.name === '이용자수') value = station.count / 10000
      else if (dim.name === '피크 집중도') value = peak * 3
      else if (dim.name === '오전 비중') value = morning
      else if (dim.name === '오후 비중') value = afternoon
      else if (dim.name === '야간 비중') value = night
      else if (dim.name === '어린이 편향') value = (station.age.아동 || 0) / 100
      else if (dim.name === '청소년 편향') value = (station.age.청소년 || 0) / 100
      else if (dim.name === '일반인 편향') value = (station.age.일반 || 0) / 100
      else if (dim.name === '노인 편향') value = (station.age.우대권 || 0) / 100
      else if (dim.name === '승차 비중') value = 0.5
      else if (dim.name === '하차 비중') value = 0.5

      score += (dim.value / totalWeight) * Math.min(1, value)
    })

    return { id: station.id, score }
  })

  const maxScore = Math.max(...raw.map((item) => item.score)) || 1
  return raw.reduce((scoreMap, item) => ({ ...scoreMap, [item.id]: item.score / maxScore }), {})
}

function getRankedStations(advanced, weights, filters) {
  const stationMetrics = getStationMetrics(filters)
  const scoreMap = advanced ? computeScores(weights, stationMetrics) : null
  const ranked = stationMetrics.filter((station) => station.visible).sort((a, b) => {
    if (scoreMap) return (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0)
    return b.count - a.count
  })
  const metricMap = stationMetrics.reduce((map, station) => ({ ...map, [station.id]: station }), {})

  return { metricMap, ranked, scoreMap, stationMetrics }
}

function getRadius(station, stationMetrics, scoreMap) {
  const visibleMetrics = stationMetrics.filter((item) => item.visible)
  const getValue = (item) => (scoreMap ? scoreMap[item.id] || 0 : item.count)
  const maxValue = Math.max(...visibleMetrics.map((item) => getValue(item)), 1)
  const value = station.visible ? getValue(station) : 0

  return 7 + (27 - 7) * Math.sqrt(value / maxValue)
}

function App() {
  const [advanced, setAdvanced] = useState(false)
  const [rankPage, setRankPage] = useState(0)
  const [selectedStationId, setSelectedStationId] = useState(null)
  const [timeRange, setTimeRange] = useState([0, 24])
  const [passengerRange, setPassengerRange] = useState([0, 10000])
  const [weekday, setWeekday] = useState('전체')
  const [boarding, setBoarding] = useState('전체')
  const [transfer, setTransfer] = useState('전체')
  const [activeTypes, setActiveTypes] = useState(() => new Set(USER_TYPES))
  const [activeLines, setActiveLines] = useState(() => new Set(LINES))
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [weights, setWeights] = useState(initialWeights)
  const [simTab, setSimTab] = useState(0)
  const [tooltip, setTooltip] = useState(null)

  const filters = useMemo(() => ({
    activeLines,
    activeTypes,
    boarding,
    passengerRange,
    timeRange,
    transfer,
    weekday,
  }), [activeLines, activeTypes, boarding, passengerRange, timeRange, transfer, weekday])
  const { metricMap, ranked, scoreMap, stationMetrics } = useMemo(() => getRankedStations(advanced, weights, filters), [advanced, filters, weights])
  const pageCount = Math.max(1, Math.ceil(ranked.length / 3))
  const safeRankPage = Math.min(rankPage, pageCount - 1)
  const pageStations = ranked.slice(safeRankPage * 3, safeRankPage * 3 + 3)
  const selectedStation = metricMap[selectedStationId]?.visible ? metricMap[selectedStationId] : null

  const updateTimeRange = (index, value) => {
    setTimeRange(([start, end]) => {
      const next = [...[start, end]]
      next[index] = Number(value)
      if (next[0] >= next[1]) {
        if (index === 0) next[0] = next[1] - 1
        else next[1] = next[0] + 1
      }
      return next
    })
    setRankPage(0)
  }

  const updatePassengerRange = (index, value) => {
    setPassengerRange(([start, end]) => {
      const next = [...[start, end]]
      next[index] = Number(value)
      if (next[0] >= next[1]) {
        if (index === 0) next[0] = next[1] - 100
        else next[1] = next[0] + 100
      }
      return next
    })
    setRankPage(0)
  }

  const updateChoice = (setter) => (value) => {
    setter(value)
    setRankPage(0)
  }

  const applyPreset = (name) => {
    setSelectedPreset(name)
    setRankPage(0)
    if (name === '출퇴근 패턴') {
      setTimeRange([7, 20])
      setWeekday('평일')
      setActiveTypes(new Set(['일반']))
    } else if (name === '주말 여가') {
      setTimeRange([10, 22])
      setWeekday('주말')
      setActiveTypes(new Set(USER_TYPES))
    } else if (name === '청년·학생층') {
      setActiveTypes(new Set(['청소년', '중고생', '일반']))
    } else if (name === '교통약자') {
      setTimeRange([0, 24])
      setActiveTypes(new Set(['아동', '우대권']))
    }
  }

  const toggleAdvanced = () => {
    setAdvanced((value) => !value)
    setRankPage(0)
  }

  const toggleUserType = (type) => {
    setActiveTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
    setRankPage(0)
  }

  const toggleLine = (line) => {
    setActiveLines((current) => {
      const next = new Set(current)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })
    setRankPage(0)
  }

  const updateWeight = (name, key, value) => {
    setWeights((current) =>
      current.map((weight) => (weight.name === name ? { ...weight, [key]: value } : weight)),
    )
    if (advanced) setRankPage(0)
  }

  const handleStationClick = (stationId) => {
    const station = metricMap[stationId]
    if (!station?.visible) return
    setSelectedStationId((current) => (current === stationId ? null : stationId))
    setTooltip(null)
  }

  const handleRankNav = (direction) => {
    setRankPage((current) => Math.max(0, Math.min(pageCount - 1, current + direction)))
  }

  const selectStationByName = (name) => {
    const station = stationMetrics.find((item) => item.name === name && item.visible)
    if (station) setSelectedStationId(station.id)
  }

  return (
    <div className="metrolens-app">
      <Navigation />
      <div className="main">
        <Sidebar
          advanced={advanced}
          activeLines={activeLines}
          activeTypes={activeTypes}
          boarding={boarding}
          onAdvancedToggle={toggleAdvanced}
          onBoardingChange={updateChoice(setBoarding)}
          onLineToggle={toggleLine}
          onPassengerRangeChange={updatePassengerRange}
          onPresetChange={applyPreset}
          onTimeRangeChange={updateTimeRange}
          onTransferChange={updateChoice(setTransfer)}
          onTypeToggle={toggleUserType}
          onWeekdayChange={updateChoice(setWeekday)}
          onWeightChange={updateWeight}
          passengerRange={passengerRange}
          selectedPreset={selectedPreset}
          selectedStation={selectedStation}
          timeRange={timeRange}
          transfer={transfer}
          weekday={weekday}
          weights={weights}
        />
        <MapPanel
          advanced={advanced}
          onRankNav={handleRankNav}
          onStationClick={handleStationClick}
          onTooltipHide={() => setTooltip(null)}
          onTooltipMove={(event) => setTooltip((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current))}
          onTooltipShow={(event, station, rank) => setTooltip({ station, rank, x: event.clientX, y: event.clientY })}
          pageCount={pageCount}
          pageStations={pageStations}
          rankPage={safeRankPage}
          ranked={ranked}
          scoreMap={scoreMap}
          selectedStationId={selectedStationId}
          stationMetrics={stationMetrics}
        />
        <Dashboard
          metricMap={metricMap}
          onClose={() => setSelectedStationId(null)}
          onSimTabChange={setSimTab}
          onStationClick={handleStationClick}
          ranked={ranked}
          selectedStation={selectedStation}
          stationMetrics={stationMetrics}
          selectStationByName={selectStationByName}
          simTab={simTab}
        />
      </div>
      <Tooltip advanced={advanced} ranked={ranked} scoreMap={scoreMap} selectedStation={selectedStation} tooltip={tooltip} />
    </div>
  )
}

function Navigation() {
  return (
    <nav className="nav">
      <span className="logo">
        Metro<em>Lens</em>
      </span>
      <div className="npill on">지도 분석</div>
      <div className="npill">역 비교</div>
      <div className="npill">트렌드</div>
      <div className="ml">
        <div className="ybadge">📅 2024년</div>
        <div className="ybadge">📍 서울시</div>
      </div>
    </nav>
  )
}

function Sidebar({
  advanced,
  activeLines,
  activeTypes,
  boarding,
  onAdvancedToggle,
  onBoardingChange,
  onLineToggle,
  onPassengerRangeChange,
  onPresetChange,
  onTimeRangeChange,
  onTransferChange,
  onTypeToggle,
  onWeekdayChange,
  onWeightChange,
  passengerRange,
  selectedPreset,
  selectedStation,
  timeRange,
  transfer,
  weekday,
  weights,
}) {
  const timeLabel = timeRange[0] === 0 && timeRange[1] === 24 ? '전일' : `${formatHour(timeRange[0])}~${formatHour(timeRange[1])}`
  const presets = [
    { icon: '🚶', name: '출퇴근 패턴', desc: '평일 07–09·18–20시, 일반', bg: '#EEF2FF' },
    { icon: '🎉', name: '주말 여가', desc: '주말 10–22시, 전연령', bg: '#FDF4EC' },
    { icon: '📚', name: '청년·학생층', desc: '청소년·중고생·일반', bg: '#EDFDF4' },
    { icon: '🏥', name: '교통약자', desc: '아동·우대권, 전시간대', bg: '#F5F0FA' },
  ]

  return (
    <aside className="sidebar">
      <div className="sb-head">
        <span className="sb-title">검색 컬럼</span>
        <div className="adv-wrap">
          <span className={`adv-lbl ${advanced ? 'on' : ''}`}>고급</span>
          <button aria-label="고급 분석 모드" className={`sw ${advanced ? 'on' : ''}`} onClick={onAdvancedToggle} />
        </div>
      </div>

      <div className="sb-scroll">
        <div className="fsec">
          <PeakCard station={selectedStation} />
        </div>

        <div className="fsec">
          <div className="flabel">
            시간대 <span className="fbadge">{timeLabel}</span>
          </div>
          <div className="trow">
            <div className="tchip">{formatHour(timeRange[0])}</div>
            <span className="tsep">~</span>
            <div className="tchip">{formatHour(timeRange[1])}</div>
          </div>
          <DualRange
            max={24}
            min={0}
            onChange={onTimeRangeChange}
            step={1}
            values={timeRange}
          />
        </div>

        <ChoiceSection label="요일" onChange={onWeekdayChange} options={['전체', '평일', '주말']} value={weekday} />

        <div className="fsec">
          <div className="flabel">이용자 유형</div>
          <div className="pgroup">
            {USER_TYPES.map((type) => (
              <button className={`pill ${activeTypes.has(type) ? 'on' : ''}`} key={type} onClick={() => onTypeToggle(type)}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <ChoiceSection label="승 / 하차" onChange={onBoardingChange} options={['전체', '승차', '하차']} value={boarding} />
        <ChoiceSection label="환승역" onChange={onTransferChange} options={['전체', '환승역만', '비환승']} value={transfer} />

        <div className="fsec">
          <div className="flabel">호선</div>
          <div className="lgrid">
            {LINES.map((line) => {
              const active = activeLines.has(line)
              const color = LINE_COLORS[line]
              return (
                <button
                  className={`lchip ${active ? 'on' : ''}`}
                  key={line}
                  onClick={() => onLineToggle(line)}
                  style={active ? { color, borderColor: color, background: `${color}12` } : undefined}
                >
                  <span className="ld" style={{ background: active ? color : '#C4CAD9' }} />
                  {line}
                </button>
              )
            })}
          </div>
        </div>

        <div className="fsec">
          <div className="flabel">승객 수 범위</div>
          <div className="trow">
            <div className="tchip">{formatPassenger(passengerRange[0])}</div>
            <span className="tsep">~</span>
            <div className="tchip">{formatPassenger(passengerRange[1])}</div>
          </div>
          <DualRange max={10000} min={0} onChange={onPassengerRangeChange} step={100} values={passengerRange} />
          <div className="rlabels">
            <span className="rlabel">0</span>
            <span className="rlabel">5,000</span>
            <span className="rlabel">10,000+</span>
          </div>
        </div>

        <div className="fsec">
          <div className="flabel">컬럼 선택 세트</div>
          <div className="plist">
            {presets.map((preset) => (
              <button
                className={`pitem ${selectedPreset === preset.name ? 'on' : ''}`}
                key={preset.name}
                onClick={() => onPresetChange(preset.name)}
              >
                <span className="picon" style={{ background: preset.bg }}>
                  {preset.icon}
                </span>
                <span>
                  <span className="pname">{preset.name}</span>
                  <span className="pdesc">{preset.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AdvancedOverlay advanced={advanced} onWeightChange={onWeightChange} weights={weights} />
    </aside>
  )
}

function PeakCard({ station }) {
  if (!station) return <div className="peak-card" />
  const maxHourCount = Math.max(...station.hourly)
  const peakHour = station.hourly.indexOf(maxHourCount)
  const day = station.wdr >= station.wkr ? '평일' : '주말'

  return (
    <div className="peak-card show">
      <div className="pk-head">⚡ 선택역 피크 조건</div>
      <div className="pk-row">
        <span className="pk-tag">
          {formatHour(peakHour)}~{formatHour(peakHour + 1)}
        </span>
        <span className="pk-tag">{day} 최다</span>
        <span className="pk-count">{maxHourCount.toLocaleString()}명</span>
      </div>
    </div>
  )
}

function DualRange({ max, min, onChange, step, values }) {
  const [start, end] = values
  const left = ((start - min) / (max - min)) * 100
  const width = ((end - start) / (max - min)) * 100

  return (
    <div className="swrap">
      <div className="tbg" />
      <div className="tfl" style={{ left: `${left}%`, width: `${width}%` }} />
      <input className="dr" max={max} min={min} onChange={(event) => onChange(0, event.target.value)} step={step} type="range" value={start} />
      <input className="dr" max={max} min={min} onChange={(event) => onChange(1, event.target.value)} step={step} type="range" value={end} />
    </div>
  )
}

function ChoiceSection({ label, onChange, options, value }) {
  return (
    <div className="fsec">
      <div className="flabel">{label}</div>
      <div className="btnrow">
        {options.map((option) => (
          <button className={`tbtn ${value === option ? 'on' : ''}`} key={option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function AdvancedOverlay({ advanced, onWeightChange, weights }) {
  const groups = [...new Set(weights.map((weight) => weight.group))]

  return (
    <div className={`adv-overlay ${advanced ? 'show' : ''}`}>
      <div className="adv-top">
        <div className="adv-title">⚙ 고급 분석 모드</div>
        <div className="adv-desc">각 속성의 가중치를 설정하면 종합 점수 기준으로 역이 시각화됩니다.</div>
      </div>
      <div className="adv-body">
        {groups.map((group) => (
          <div className="eq-group" key={group}>
            <div className="eq-glabel">{group}</div>
            {weights
              .filter((weight) => weight.group === group)
              .map((weight) => (
                <div className="eq-row" key={weight.name}>
                  <button
                    aria-label={`${weight.name} 사용`}
                    className={`eq-check ${weight.active ? 'on' : ''}`}
                    onClick={() => onWeightChange(weight.name, 'active', !weight.active)}
                  />
                  <span className={`eq-name ${weight.active ? '' : 'off'}`}>{weight.name}</span>
                  <input
                    className="eq-sl"
                    disabled={!weight.active}
                    max="100"
                    min="0"
                    onChange={(event) => onWeightChange(weight.name, 'value', Number(event.target.value))}
                    step="10"
                    type="range"
                    value={weight.value}
                  />
                  <span className={`eq-val ${weight.active ? '' : 'off'}`}>{weight.value}</span>
                </div>
              ))}
          </div>
        ))}
        <div className="adv-note">활성 속성의 가중치 합산으로 종합 점수를 계산합니다. 점수가 높을수록 지도에서 원이 크게 표시됩니다.</div>
      </div>
    </div>
  )
}

function MapPanel({
  advanced,
  onRankNav,
  onStationClick,
  onTooltipHide,
  onTooltipMove,
  onTooltipShow,
  pageCount,
  pageStations,
  rankPage,
  ranked,
  scoreMap,
  selectedStationId,
  stationMetrics,
}) {
  const pageIds = pageStations.map((station) => station.id)
  const rankStart = ranked.length ? rankPage * 3 + 1 : 0
  const rankEnd = ranked.length ? Math.min(rankStart + 2, ranked.length) : 0

  return (
    <main className="mapc transit-mapc">
      <div className="transit-bg">
        <span className="schematic-water-label">한강</span>
      </div>
      <div className="rank-bar">
        <div className="rb-card" title={`기준: ${advanced ? '고급점수' : '이용자수'}`}>
          <span className="rb-label">TOP</span>
          {[0, 1, 2].map((index) => (
            <div className="rb-fragment" key={index}>
              {index > 0 && <div className="rb-sep" />}
              <div className="rb-item">
                <div className={`rdot ${RANK_DOT_CLASSES[index]}`}>{index + 1}</div>
                <span className="rb-name">{pageStations[index]?.name || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="schematic-wrap">
        <svg className="schematic-svg" viewBox="0 0 440 490">
          <defs>
            <filter id="stationShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="3" floodColor="#1E3A8A" floodOpacity=".2" stdDeviation="3" />
            </filter>
          </defs>
          <g className="city-shapes">
            {CITY_SHAPES.map((shape) => <path d={shape} key={shape} />)}
          </g>
          <g className="road-layer">
            {ROAD_PATHS.map((road) => <path d={road} key={road} />)}
          </g>
          <path className="han-river broad" d="M -12 244 C 54 206 112 238 174 230 C 246 222 286 200 344 212 C 386 220 416 204 452 188" />
          <path className="han-river core" d="M -12 244 C 54 206 112 238 174 230 C 246 222 286 200 344 212 C 386 220 416 204 452 188" />
          {METRO_LINE_PATHS.map((path) => {
            const lineVisible = stationMetrics.some((station) => station.visible && station.lines.includes(path.line))
            return (
              <path
                className={`metro-line ${lineVisible ? '' : 'muted'}`}
                d={path.d}
                key={path.line}
                stroke={LINE_COLORS[path.line] || '#64748B'}
              />
            )
          })}
          {stationMetrics.map((station) => {
            const radius = getRadius(station, stationMetrics, scoreMap)
            const selected = selectedStationId === station.id
            const inPage = pageIds.includes(station.id)
            const globalRank = ranked.findIndex((item) => item.id === station.id) + 1
            const localRank = pageIds.indexOf(station.id) + 1
            const fill = selected ? '#FF4757' : inPage ? '#3B6DFF' : '#fff'
            const stroke = selected ? '#FF4757' : station.visible ? LINE_COLORS[station.lines[0]] || '#3B6DFF' : '#CBD5E1'

            return (
              <g
                className={`schematic-station ${station.visible ? '' : 'muted'} ${selected ? 'selected' : ''}`}
                key={station.id}
                onClick={() => onStationClick(station.id)}
                onMouseEnter={(event) => station.visible && onTooltipShow(event, station, globalRank)}
                onMouseLeave={onTooltipHide}
                onMouseMove={onTooltipMove}
              >
                {selected && (
                  <circle className="station-ripple" cx={station.x} cy={station.y} r={radius + 8}>
                    <animate attributeName="r" dur="2.2s" repeatCount="indefinite" values={`${radius + 8};${radius + 22};${radius + 8}`} />
                    <animate attributeName="opacity" dur="2.2s" repeatCount="indefinite" values=".55;0;.55" />
                  </circle>
                )}
                <circle
                  className="station-halo"
                  cx={station.x}
                  cy={station.y}
                  fill="#fff"
                  r={radius + 4}
                />
                <circle
                  className="station-node"
                  cx={station.x}
                  cy={station.y}
                  fill={fill}
                  r={radius}
                  stroke={stroke}
                />
                {station.tf && <circle className="transfer-ring" cx={station.x} cy={station.y} r={radius + 7} />}
                {inPage && !selected && (
                  <g className="rank-badge-svg">
                    <circle cx={station.x + radius * .74} cy={station.y - radius * .74} fill={RANK_DOT_COLORS[localRank - 1] || '#9CA3AF'} r="9" />
                    <text x={station.x + radius * .74} y={station.y - radius * .74 + 3.5}>{rankPage * 3 + localRank}</text>
                  </g>
                )}
                <text
                  className={`station-label ${selected ? 'selected' : ''}`}
                  x={station.x}
                  y={station.y + radius + 15}
                >
                  {station.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="metro-legend">
        {METRO_LINE_PATHS.slice(0, 9).map((path) => (
          <span className="metro-legend-item" key={path.line}>
            <span className="metro-legend-dot" style={{ background: LINE_COLORS[path.line] }} />
            {path.line}
          </span>
        ))}
      </div>
      <div className="map-attribution">Geographic transit overlay · Filters update station visibility and rank</div>

      <div className="rank-nav">
        <button className="rn-arr" disabled={rankPage === 0} onClick={() => onRankNav(-1)}>‹</button>
        <div>
          <span className="rn-main">
            {rankStart}위 ~ {rankEnd}위
          </span>
          <span className="rn-sub">← → 로 순위 탐색</span>
        </div>
        <button className="rn-arr" disabled={rankPage === pageCount - 1} onClick={() => onRankNav(1)}>›</button>
      </div>
    </main>
  )
}

function Dashboard({ onClose, onSimTabChange, onStationClick, ranked, selectedStation, selectStationByName, simTab, stationMetrics }) {
  if (!selectedStation) return <aside className="dash" />

  const rank = ranked.findIndex((item) => item.id === selectedStation.id) + 1
  const visibleMetrics = stationMetrics.filter((station) => station.visible)
  const average = Math.round(visibleMetrics.reduce((sum, station) => sum + station.count, 0) / (visibleMetrics.length || 1))
  const diff = average ? ((selectedStation.count - average) / average * 100).toFixed(0) : 0
  const top3 = selectedStation.hourly
    .map((value, hour) => ({ hour, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
  const maxValue = top3[0].value

  return (
    <aside className="dash open">
      <div className="dbody">
        <div className="dhdr">
          <div className="dstn">
            <div className="dname">{selectedStation.name}</div>
            <div className="dlines">
              {selectedStation.lines.map((line) => (
                <span className="ltag" key={line} style={lineTagStyle(line)}>
                  {line}
                </span>
              ))}
            </div>
          </div>
          <button className="dclose" onClick={onClose}>✕</button>
        </div>

        <div className="dsec">
          <div className="dst">선택 조건 이용자 수</div>
          <div className="mhl">
            <div className="mhlabel">조건 반영 합산 방문객</div>
            <div className="mhval">
              {selectedStation.count.toLocaleString()}
              <span>명</span>
            </div>
            <div className="mhsub">
              조건 내 {rank}위 · 평균 대비 {selectedStation.count > average ? '+' : ''}
              {diff}%
            </div>
          </div>
        </div>

        <div className="dsec">
          <div className="dst">승객 유형별 분포</div>
          <div className="chwrap">
            <AgePie station={selectedStation} />
            <div className="piegend">
              {AGE_ORDER.map((age) => (
                <div className="legend-block" key={age}>
                  <div className="lrow">
                    <div className="ldot" style={{ background: AGE_COLORS[age] }} />
                    <span className="lname">{age}</span>
                    <span className="lpct">{selectedStation.age[age] || 0}%</span>
                  </div>
                  <div className="lbw">
                    <div className="lbf" style={{ width: `${selectedStation.age[age] || 0}%`, background: AGE_COLORS[age] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dsec">
          <div className="dst">시간대별 이용자 Top 3</div>
          <div className="barchart">
            {top3.map((item) => (
              <div className="brow" key={item.hour}>
                <span className="blabel">{String(item.hour).padStart(2, '0')}시</span>
                <div className="btrack">
                  <div className="bfill" style={{ width: `${Math.round((item.value / maxValue) * 100)}%` }} />
                </div>
                <span className="bcount">{item.value.toLocaleString()}명</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dsec">
          <div className="dst">역 속성</div>
          <div className="agrid">
            {Object.entries(selectedStation.attr).map(([key, value]) => (
              <div className="aitem" key={key}>
                <div className="akey">{key}</div>
                <div className="aval">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dsec no-border">
          <div className="dst">유사 역 추천</div>
          <div className="simtabs">
            {['패턴 유사', '가까운 역', '규모 유사'].map((tab, index) => (
              <button className={`simtab ${simTab === index ? 'on' : ''}`} key={tab} onClick={() => onSimTabChange(index)}>
                {tab}
              </button>
            ))}
          </div>
          <SimilarStations
            onStationClick={onStationClick}
            ranked={ranked}
            selectStationByName={selectStationByName}
            simTab={simTab}
            station={selectedStation}
            stationMetrics={stationMetrics}
          />
        </div>
      </div>
    </aside>
  )
}

function AgePie({ station }) {
  const circumference = 2 * Math.PI * 38
  const segments = AGE_ORDER.reduce((result, age) => {
    const percent = station.age[age] || 0
    const length = (circumference * percent) / 100
    const offset = result.offset + length

    return {
      offset,
      items: [...result.items, { age, length, offset: result.offset }],
    }
  }, { offset: 0, items: [] }).items

  return (
    <svg height="86" viewBox="0 0 92 92" width="86">
      {segments.map(({ age, length, offset }) => (
        <circle
          cx="46"
          cy="46"
          fill="none"
          key={age}
          r="38"
          stroke={AGE_COLORS[age]}
          strokeDasharray={`${length.toFixed(2)} ${(circumference - length).toFixed(2)}`}
          strokeDashoffset={(-offset).toFixed(2)}
          strokeWidth="15"
          transform="rotate(-90 46 46)"
        />
      ))}
      <circle cx="46" cy="46" fill="white" r="29" />
      <text fill="#A0AABF" fontFamily="Noto Sans KR,sans-serif" fontSize="8" textAnchor="middle" x="46" y="43">
        총계
      </text>
      <text fill="#1A202C" fontFamily="Noto Sans KR,sans-serif" fontSize="11" fontWeight="800" textAnchor="middle" x="46" y="55">
        {(station.count / 1000).toFixed(1)}K
      </text>
    </svg>
  )
}

function SimilarStations({ onStationClick, ranked, selectStationByName, simTab, station, stationMetrics }) {
  const items = (() => {
    if (simTab === 0) {
      return station.simPat.map((item, index) => ({ ...item, rank: index + 1, onClick: () => selectStationByName(item.name), score: `${item.pct}%` }))
    }

    if (simTab === 1) {
      return stationMetrics
      .filter((item) => item.id !== station.id && item.visible)
      .map((item) => ({ ...item, km: getDistanceKm(item, station).toFixed(1) }))
      .sort((a, b) => parseFloat(a.km) - parseFloat(b.km))
      .slice(0, 3)
      .map((item, index) => ({ name: item.name, lines: item.lines.join('·'), rank: index + 1, onClick: () => onStationClick(item.id), score: `~${item.km}km` }))
    }

    return stationMetrics
      .filter((item) => item.id !== station.id && item.visible)
      .map((item) => ({ ...item, diff: Math.abs(item.count - station.count) }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3)
      .map((item, index) => ({
        name: item.name,
        lines: `전체 ${ranked.findIndex((rankedStation) => rankedStation.id === item.id) + 1}위`,
        rank: index + 1,
        onClick: () => onStationClick(item.id),
        score: `${item.count.toLocaleString()}명`,
      }))
  })()

  return (
    <div className="simlist">
      {items.map((item) => (
        <button className="simitem" key={`${item.name}-${item.score}`} onClick={item.onClick}>
          <span className="sirank">{item.rank}</span>
          <span className="siinfo">
            <span className="siname">{item.name}</span>
            <span className="siline">{item.lines}</span>
          </span>
          <span className="siscore">{item.score}</span>
        </button>
      ))}
    </div>
  )
}

function Tooltip({ advanced, ranked, scoreMap, selectedStation, tooltip }) {
  if (!tooltip) return <div className="tt" />

  const { station, rank, x, y } = tooltip
  const diff = selectedStation && selectedStation.id !== station.id ? station.count - selectedStation.count : null
  const firstLine = station.lines[0]
  const distance =
    selectedStation && selectedStation.id !== station.id
      ? getDistanceKm(station, selectedStation).toFixed(1)
      : null
  const score = advanced && scoreMap ? Math.round((scoreMap[station.id] || 0) * 100) : null

  return (
    <div className="tt show" style={{ left: x + 14, top: y - 10 }}>
      <div className="ttn">
        {station.name}
        <span className="ttlb" style={lineTagStyle(firstLine)}>{firstLine}</span>
      </div>
      <div className="ttr">
        <span className="ttk">이용자 수</span>
        <span className="ttv">{station.count.toLocaleString()}명</span>
      </div>
      {score !== null && (
        <div className="ttr">
          <span className="ttk">고급 점수</span>
          <span className="ttv tt-score">{score}점</span>
        </div>
      )}
      <div className="ttr">
        <span className="ttk">현재 순위</span>
        <span className="ttv">#{rank || ranked.findIndex((item) => item.id === station.id) + 1}</span>
      </div>
      {distance && (
        <div className="ttr">
          <span className="ttk">{selectedStation.name}까지</span>
          <span className="ttv">~{distance}km</span>
        </div>
      )}
      {diff !== null && (
        <>
          <div className="ttdiv" />
          <div className="ttr">
            <span className="ttk">선택역 대비</span>
            <span className={diff > 0 ? 'ttpos' : 'ttneg'}>
              {diff > 0 ? '+' : ''}
              {diff.toLocaleString()}명
            </span>
          </div>
        </>
      )}
      {station.tf && (
        <div className="ttr">
          <span className="ttk">환승역</span>
          <span className="ttv tt-transfer">✓</span>
        </div>
      )}
    </div>
  )
}

export default App
