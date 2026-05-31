import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

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

function loadKakaoMaps(appKey) {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao)
  if (window.kakaoMapsPromise) return window.kakaoMapsPromise

  window.kakaoMapsPromise = new Promise((resolve, reject) => {
    const boot = () => {
      if (!window.kakao?.maps) {
        reject(new Error('Kakao Maps SDK failed to load.'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao))
    }

    const script = document.createElement('script')
    script.id = 'kakao-map-sdk'
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.onload = boot
    script.onerror = () => reject(new Error('Kakao Maps SDK failed to load.'))
    document.head.appendChild(script)
  })

  return window.kakaoMapsPromise
}

function KakaoMetroMap({
  onStationClick,
  onTooltipHide,
  onTooltipMove,
  onTooltipShow,
  pageIds,
  rankPage,
  ranked,
  scoreMap,
  selectedStationId,
  stationMetrics,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlaysRef = useRef([])
  const [loadState, setLoadState] = useState(KAKAO_MAP_KEY ? 'loading' : 'missing')

  useEffect(() => {
    if (!KAKAO_MAP_KEY) {
      return undefined
    }

    let cancelled = false

    loadKakaoMaps(KAKAO_MAP_KEY)
      .then((kakao) => {
        if (cancelled || !containerRef.current) return

        if (!mapRef.current) {
          mapRef.current = new kakao.maps.Map(containerRef.current, {
            center: new kakao.maps.LatLng(37.535, 126.99),
            level: 7,
          })
          mapRef.current.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT)
        }

        setLoadState('ready')
      })
      .catch((err) => {
        console.error('[KakaoMaps] init error:', err)
        if (!cancelled) setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current || !window.kakao?.maps) return undefined

    const kakao = window.kakao
    const map = mapRef.current
    const syntheticEvent = (mouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      const point = mouseEvent?.point
      return {
        clientX: (rect?.left || 0) + (point?.x || (rect?.width || 0) / 2),
        clientY: (rect?.top || 0) + (point?.y || (rect?.height || 0) / 2),
      }
    }

    overlaysRef.current.forEach((overlay) => overlay.setMap(null))
    overlaysRef.current = []

    // 1×1 transparent GIF — universally supported by Kakao Maps for custom marker images
    const TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    stationMetrics.forEach((station) => {
      const position = new kakao.maps.LatLng(station.lat, station.lng)
      const radius = getRadius(station, stationMetrics, scoreMap)
      const selected = selectedStationId === station.id
      const inPage = pageIds.includes(station.id)
      const globalRank = ranked.findIndex((item) => item.id === station.id) + 1
      const localRank = pageIds.indexOf(station.id) + 1
      const color = LINE_COLORS[station.lines[0]] || '#3B6DFF'
      const circleRadius = Math.max(450, radius * 32)

      // Visual circle (hover events work on Circle)
      const circle = new kakao.maps.Circle({
        center: position,
        fillColor: selected ? '#FF4757' : inPage ? '#3B6DFF' : station.visible ? color : '#CBD5E1',
        fillOpacity: station.visible ? (selected ? 0.95 : inPage ? 0.90 : 0.85) : 0.18,
        map,
        radius: circleRadius,
        strokeColor: '#ffffff',
        strokeOpacity: station.visible ? 0.9 : 0.2,
        strokeWeight: 3,
        zIndex: selected ? 10 : inPage ? 8 : 5,
      })

      if (station.visible) {
        kakao.maps.event.addListener(circle, 'mouseover', (mouseEvent) => onTooltipShow(syntheticEvent(mouseEvent), station, globalRank))
        kakao.maps.event.addListener(circle, 'mousemove', (mouseEvent) => onTooltipMove(syntheticEvent(mouseEvent)))
        kakao.maps.event.addListener(circle, 'mouseout', onTooltipHide)
      }
      overlaysRef.current.push(circle)

      // Invisible marker on top — Markers reliably fire click events in Kakao Maps
      if (station.visible) {
        const hitSize = Math.max(44, Math.round(radius * 2))
        const markerImage = new kakao.maps.MarkerImage(
          TRANSPARENT,
          new kakao.maps.Size(hitSize, hitSize),
          { offset: new kakao.maps.Point(hitSize / 2, hitSize / 2) },
        )
        const hitMarker = new kakao.maps.Marker({ image: markerImage, map, position, zIndex: 20 })
        kakao.maps.event.addListener(hitMarker, 'click', () => {
          console.log('[click] hitMarker click:', station.id)
          onStationClick(station.id)
        })
        overlaysRef.current.push(hitMarker)
      }

      if (station.visible) {
        const label = new kakao.maps.CustomOverlay({
          clickable: false,
          content: `<span class="${selected ? 'kakao-station-label selected' : 'kakao-station-label'}">${station.name}</span>`,
          map,
          position,
          xAnchor: 0.5,
          yAnchor: -0.55,
        })
        overlaysRef.current.push(label)
      }

      if (inPage && !selected) {
        const badge = new kakao.maps.CustomOverlay({
          clickable: false,
          content: `<span class="kakao-rank-badge">${rankPage * 3 + localRank}</span>`,
          map,
          position: new kakao.maps.LatLng(station.lat + 0.0022, station.lng + 0.0024),
          xAnchor: 0.5,
          yAnchor: 0.5,
        })
        overlaysRef.current.push(badge)
      }
    })

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null))
      overlaysRef.current = []
    }
  }, [
    loadState,
    onStationClick,
    onTooltipHide,
    onTooltipMove,
    onTooltipShow,
    pageIds,
    rankPage,
    ranked,
    scoreMap,
    selectedStationId,
    stationMetrics,
  ])

  return (
    <>
      <div className="internet-map kakao-map" ref={containerRef} />
      {loadState !== 'ready' && (
        <div className="map-provider-placeholder overlay">
          <div className="provider-card">
            <div className="provider-title">
              {loadState === 'missing' ? 'Kakao key needed' : loadState === 'error' ? 'Kakao map failed to load' : 'Loading Kakao Maps'}
            </div>
            <div className="provider-copy">Add your JavaScript key to StationGo/.env.local as VITE_KAKAO_MAP_KEY, then restart Vite.</div>
            <code>VITE_KAKAO_MAP_KEY</code>
          </div>
        </div>
      )}
    </>
  )
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
    <main className="mapc internet-mapc">
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

      <KakaoMetroMap
        onStationClick={onStationClick}
        onTooltipHide={onTooltipHide}
        onTooltipMove={onTooltipMove}
        onTooltipShow={onTooltipShow}
        pageIds={pageIds}
        rankPage={rankPage}
        ranked={ranked}
        scoreMap={scoreMap}
        selectedStationId={selectedStationId}
        stationMetrics={stationMetrics}
      />

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
