import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { buildStationsFromInfo } from './data/loaders.js'

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

// station_info.csv + passenger_summary.json 기반 역 목록
const STATIONS = buildStationsFromInfo()
// 승객 수 필터 슬라이더 상한: 실제 최대 cnt를 10,000 단위로 올림
const PASSENGER_RANGE_MAX = Math.ceil(Math.max(...STATIONS.map(s => s.cnt), 10000) / 10000) * 10000


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
  if (value >= 100000) return `${(value / 10000).toFixed(0)}만명`
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만명`
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
  const { cube } = station

  // ── 큐브 기반 정확 계산 (passenger_summary.json 수록 역) ──────────────
  if (cube) {
    const { timeRange: [start, end], weekday, activeTypes, boarding } = filters
    const { numWeekdays, numWeekends, data } = cube
    const directions = boarding === '전체' ? ['승차', '하차'] : [boarding]

    let wdSum = 0, weSum = 0
    for (const dir of directions) {
      for (const type of USER_TYPES) {
        if (!activeTypes.has(type)) continue
        const entry = data[dir]?.[type]
        if (!entry) continue
        for (let h = start; h < end; h++) {
          wdSum += entry.weekday[h] ?? 0
          weSum += entry.weekend[h] ?? 0
        }
      }
    }

    if (weekday === '평일') return Math.round(wdSum / (numWeekdays || 1))
    if (weekday === '주말') return Math.round(weSum / (numWeekends || 1))
    // '전체': 날짜 수 가중 평균 → 실제 일평균
    const totalDays = (numWeekdays + numWeekends) || 1
    return Math.round((wdSum + weSum) / totalDays)
  }

  // ── fallback: cube 없는 역은 기존 근사 계산 ───────────────────────────
  // TODO: dummy_data.csv에 해당 역 데이터 추가 후 fallback 제거
  const [start, end] = filters.timeRange
  const hourlyTotal = station.hourly.reduce((sum, value) => sum + value, 0) || 1
  const timeTotal = station.hourly.slice(start, end).reduce((sum, value) => sum + value, 0)
  const timeFactor = timeTotal / hourlyTotal
  const dayFactor = filters.weekday === '평일' ? station.wdr : filters.weekday === '주말' ? station.wkr : (station.wdr + station.wkr) / 2
  const ageFactor = USER_TYPES.reduce((sum, type) => sum + (filters.activeTypes.has(type) ? station.age[type] || 0 : 0), 0) / 100
  const directionFactor = filters.boarding === '승차' ? 0.52 : filters.boarding === '하차' ? 0.48 : 1
  return Math.round(station.cnt * timeFactor * dayFactor * ageFactor * directionFactor)
}

function getHourlyData(station, filters) {
  const { cube } = station
  const hourlyData = Array(24).fill(0)

  if (cube) {
    const { weekday, activeTypes, boarding } = filters
    const { numWeekdays, numWeekends, data } = cube
    const directions = boarding === '전체' ? ['승차', '하차'] : [boarding]
    const totalDays = (numWeekdays + numWeekends) || 1

    for (let h = 0; h < 24; h++) {
      let wdSum = 0, weSum = 0
      for (const dir of directions) {
        for (const type of USER_TYPES) {
          if (!activeTypes.has(type)) continue
          const entry = data[dir]?.[type]
          if (!entry) continue
          wdSum += entry.weekday[h] ?? 0
          weSum += entry.weekend[h] ?? 0
        }
      }
      if (weekday === '평일') {
        hourlyData[h] = Math.round(wdSum / (numWeekdays || 1))
      } else if (weekday === '주말') {
        hourlyData[h] = Math.round(weSum / (numWeekends || 1))
      } else {
        hourlyData[h] = Math.round((wdSum + weSum) / totalDays)
      }
    }
    return hourlyData
  }

  const dayFactor = filters.weekday === '평일' ? station.wdr : filters.weekday === '주말' ? station.wkr : (station.wdr + station.wkr) / 2
  const ageFactor = USER_TYPES.reduce((sum, type) => sum + (filters.activeTypes.has(type) ? station.age[type] || 0 : 0), 0) / 100
  const directionFactor = filters.boarding === '승차' ? 0.52 : filters.boarding === '하차' ? 0.48 : 1

  return station.hourly.map((val) => Math.round(val * dayFactor * ageFactor * directionFactor))
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
  const lastMousePos = useRef({ clientX: 0, clientY: 0 })
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

    overlaysRef.current.forEach((overlay) => overlay.setMap(null))
    overlaysRef.current = []

    // Native mouse tracking on the map container — gives accurate cursor coords for tooltip
    const container = containerRef.current
    const onNativeMove = (e) => {
      lastMousePos.current = { clientX: e.clientX, clientY: e.clientY }
      onTooltipMove({ clientX: e.clientX, clientY: e.clientY })
    }
    const onNativeLeave = () => onTooltipHide()
    container.addEventListener('mousemove', onNativeMove)
    container.addEventListener('mouseleave', onNativeLeave)

    // 1×1 transparent GIF — universally supported by Kakao Maps for custom marker images
    const TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    // Map of stationId → {station, globalRank} for mouseover lookup
    const stationInfoMap = {}

    stationMetrics.forEach((station) => {
      const position = new kakao.maps.LatLng(station.lat, station.lng)
      const radius = getRadius(station, stationMetrics, scoreMap)
      const selected = selectedStationId === station.id
      const inPage = pageIds.includes(station.id)
      const globalRank = ranked.findIndex((item) => item.id === station.id) + 1
      const localRank = pageIds.indexOf(station.id) + 1
      const color = LINE_COLORS[station.lines[0]] || '#3B6DFF'
      const circleRadius = Math.max(450, radius * 32)

      if (station.visible) stationInfoMap[station.id] = { station, globalRank }

      // Visual circle
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
      overlaysRef.current.push(circle)

      // Invisible marker — click only (hover is handled by native DOM events above)
      if (station.visible) {
        const hitSize = Math.max(44, Math.round(radius * 2))
        const markerImage = new kakao.maps.MarkerImage(
          TRANSPARENT,
          new kakao.maps.Size(hitSize, hitSize),
          { offset: new kakao.maps.Point(hitSize / 2, hitSize / 2) },
        )
        const hitMarker = new kakao.maps.Marker({ image: markerImage, map, position, zIndex: 20 })
        kakao.maps.event.addListener(hitMarker, 'click', () => onStationClick(station.id))
        // Hover via Kakao Maps (for enter/leave) — position from last known cursor position
        kakao.maps.event.addListener(hitMarker, 'mouseover', () => {
          const info = stationInfoMap[station.id]
          if (info) onTooltipShow(lastMousePos.current, info.station, info.globalRank)
        })
        kakao.maps.event.addListener(hitMarker, 'mouseout', onTooltipHide)
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
      container.removeEventListener('mousemove', onNativeMove)
      container.removeEventListener('mouseleave', onNativeLeave)
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
  const [passengerRange, setPassengerRange] = useState([0, PASSENGER_RANGE_MAX])
  const [weekday, setWeekday] = useState('전체')
  const [boarding, setBoarding] = useState('전체')
  const [transfer, setTransfer] = useState('전체')
  const [activeTypes, setActiveTypes] = useState(() => new Set(USER_TYPES))
  const [activeLines, setActiveLines] = useState(() => new Set(LINES))
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [weights, setWeights] = useState(initialWeights)
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
  const pageStations = useMemo(() => ranked.slice(safeRankPage * 3, safeRankPage * 3 + 3), [ranked, safeRankPage])
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
    const step = Math.round(PASSENGER_RANGE_MAX / 100)
    setPassengerRange(([start, end]) => {
      const next = [...[start, end]]
      next[index] = Number(value)
      if (next[0] >= next[1]) {
        if (index === 0) next[0] = next[1] - step
        else next[1] = next[0] + step
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

  const handleStationClick = useCallback((stationId) => {
    const station = metricMap[stationId]
    if (!station?.visible) return
    setSelectedStationId((current) => (current === stationId ? null : stationId))
    setTooltip(null)
  }, [metricMap])

  const handleTooltipShow = useCallback((event, station, rank) => {
    setTooltip({ station, rank, x: event.clientX, y: event.clientY })
  }, [])

  const handleTooltipMove = useCallback((event) => {
    setTooltip((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current))
  }, [])

  const handleTooltipHide = useCallback(() => setTooltip(null), [])

  const handleRankNav = (direction) => {
    setRankPage((current) => Math.max(0, Math.min(pageCount - 1, current + direction)))
  }

  return (
    <div className="stationgo-app">
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
          maxPassenger={PASSENGER_RANGE_MAX}
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
          onTooltipHide={handleTooltipHide}
          onTooltipMove={handleTooltipMove}
          onTooltipShow={handleTooltipShow}
          pageCount={pageCount}
          pageStations={pageStations}
          rankPage={safeRankPage}
          ranked={ranked}
          scoreMap={scoreMap}
          selectedStationId={selectedStationId}
          stationMetrics={stationMetrics}
        />
        <Dashboard
          filters={filters}
          metricMap={metricMap}
          onClose={() => setSelectedStationId(null)}
          onStationClick={handleStationClick}
          ranked={ranked}
          selectedStation={selectedStation}
          stationMetrics={stationMetrics}
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
        Station<em>Go</em>
      </span>
      <div className="npill on">지도 분석</div>
      <div className="nav-info-wrap">
        <button className="nav-info-btn" aria-label="프로젝트 정보">i</button>
        <div className="nav-info-popup">
          <div className="nav-info-title">프로젝트 정보</div>
          <div className="nav-info-body">프로젝트 정보 작성 예정</div>
        </div>
      </div>
    </nav>
  )
}

function Sidebar({
  advanced,
  activeLines,
  activeTypes,
  boarding,
  maxPassenger,
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
          <DualRange max={maxPassenger} min={0} onChange={onPassengerRangeChange} step={Math.round(maxPassenger / 100)} values={passengerRange} />
          <div className="rlabels">
            <span className="rlabel">0</span>
            <span className="rlabel">{formatPassenger(Math.round(maxPassenger / 2))}</span>
            <span className="rlabel">{formatPassenger(maxPassenger)}</span>
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
  const pageIds = useMemo(() => pageStations.map((station) => station.id), [pageStations])
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

function Dashboard({ filters, onClose, onStationClick, ranked, selectedStation, stationMetrics }) {
  if (!selectedStation) return <aside className="dash" />

  const rank = ranked.findIndex((item) => item.id === selectedStation.id) + 1

  const hourlyValues = useMemo(() => {
    return getHourlyData(selectedStation, filters)
  }, [selectedStation, filters])

  const [hoveredHour, setHoveredHour] = useState(null)
  const [hoveredValue, setHoveredValue] = useState(null)

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
              조건 내 {rank}위
            </div>
          </div>
        </div>

        <div className="dsec">
          <div className="dst" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>시간대별 분포</span>
            {hoveredHour !== null && (
              <span className="fbadge">
                {String(hoveredHour).padStart(2, '0')}시: {hoveredValue.toLocaleString()}명
              </span>
            )}
          </div>
          <HourlyChart
            hourlyValues={hourlyValues}
            onHoverChange={(hour, value) => {
              setHoveredHour(hour)
              setHoveredValue(value)
            }}
          />
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

        <div className="dsec no-border">
          <div className="dst">유사 역 추천</div>
          <SimilarStations
            onStationClick={onStationClick}
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

function HourlyChart({ hourlyValues, onHoverChange }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!hourlyValues || hourlyValues.length === 0) return null

  const startIndex = 5
  const slicedValues = hourlyValues.slice(startIndex)
  const maxVal = Math.max(...slicedValues, 100)

  // Find top 3 hours for ranking labels (relative to the sliced values)
  const sorted = slicedValues
    .map((value, idx) => ({ hour: idx + startIndex, value }))
    .sort((a, b) => b.value - a.value)

  const rankMap = {} // hour -> rank (1, 2, 3)
  sorted.slice(0, 3).forEach((item, index) => {
    rankMap[item.hour] = index + 1
  })

  // Position layout calculation to avoid overlaps of adjacent/nearby ranks
  const top3 = sorted.slice(0, 3)
  const chronoTop3 = [...top3].sort((a, b) => a.hour - b.hour)
  const badgePositions = {}

  let lastPos = 'BOTTOM'
  chronoTop3.forEach((item, idx) => {
    const rank = rankMap[item.hour]
    let pos = 'TOP'
    if (idx > 0 && Math.abs(item.hour - chronoTop3[idx - 1].hour) <= 2) {
      // Alternate if hours are close to prevent horizontal overlap
      pos = lastPos === 'TOP' ? 'BOTTOM' : 'TOP'
    } else {
      // Default: rank 1 at TOP, others alternate
      pos = rank === 1 ? 'TOP' : 'BOTTOM'
    }
    lastPos = pos

    const badgeWidth = 24
    const badgeHeight = 12
    const badgeY = pos === 'TOP' ? -badgeHeight - 8 : 8

    badgePositions[item.hour] = {
      badgeX: -badgeWidth / 2,
      badgeY: badgeY,
      textX: 0,
      textY: badgeY + 8.5,
    }
  })

  const width = 276
  const height = 120
  const paddingLeft = 28
  const paddingRight = 12
  const paddingTop = 22
  const paddingBottom = 20

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  // Generate points
  const points = slicedValues.map((val, idx) => {
    const hour = idx + startIndex
    const x = paddingLeft + (idx / (slicedValues.length - 1)) * chartWidth
    const y = height - paddingBottom - (val / maxVal) * chartHeight
    return { hour, val, x, y }
  })

  // Create path for the line chart
  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} Z`

  // Colors for ranks (1st: Amber, 2nd: Silver/Gray, 3rd: Bronze/Brown)
  const rankColors = {
    1: '#F59E0B',
    2: '#9CA3AF',
    3: '#B45309',
  }

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - rect.left

    // Find closest point based on X coordinate
    let closestIdx = 0
    let minDiff = Infinity
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = idx
      }
    })

    // If mouse is within range of the chart
    if (mouseX >= paddingLeft - 5 && mouseX <= width - paddingRight + 5) {
      setHoveredIdx(closestIdx)
      onHoverChange(points[closestIdx].hour, points[closestIdx].val)
    } else {
      setHoveredIdx(null)
      onHoverChange(null, null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredIdx(null)
    onHoverChange(null, null)
  }

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null

  return (
    <div
      className="hourly-chart-container"
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{ position: 'relative', marginTop: '6px', userSelect: 'none' }}
    >
      <svg height={height} style={{ overflow: 'visible' }} width={width}>
        <defs>
          <linearGradient id="hourlyAreaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3B6DFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3B6DFF" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.6, 1].map((ratio, idx) => {
          const yVal = height - paddingBottom - ratio * chartHeight
          const labelVal = Math.round(ratio * maxVal)
          return (
            <g key={idx}>
              <line
                stroke="#EEF0F9"
                strokeDasharray="2,2"
                strokeWidth="1"
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={yVal}
                y2={yVal}
              />
              <text
                fill="#A0AABF"
                fontSize="8"
                fontWeight="600"
                textAnchor="end"
                x={paddingLeft - 5}
                y={yVal + 3}
              >
                {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(0)}k` : labelVal}
              </text>
            </g>
          )
        })}

        {/* X-axis line */}
        <line
          stroke="#EAECF5"
          strokeWidth="1"
          x1={paddingLeft}
          x2={width - paddingRight}
          y1={height - paddingBottom}
          y2={height - paddingBottom}
        />

        {/* Area fill */}
        <path d={areaPath} fill="url(#hourlyAreaGrad)" />

        {/* Line path */}
        <path
          d={linePath}
          fill="none"
          stroke="#3B6DFF"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />

        {/* X-axis Labels */}
        {[5, 10, 15, 20, 23].map((hour) => {
          const idx = hour - startIndex
          const x = paddingLeft + (idx / (slicedValues.length - 1)) * chartWidth
          const labelText = hour === 5 ? '05:30' : `${String(hour).padStart(2, '0')}시`
          return (
            <text
              fill="#A0AABF"
              fontSize="8"
              fontWeight="600"
              key={hour}
              textAnchor="middle"
              x={x}
              y={height - 6}
            >
              {labelText}
            </text>
          )
        })}

        {/* Hover vertical line */}
        {hoveredPoint && (
          <g>
            <line
              stroke="#3B6DFF"
              strokeDasharray="2,2"
              strokeOpacity="0.4"
              strokeWidth="1.5"
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={paddingTop}
              y2={height - paddingBottom}
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              fill="#3B6DFF"
              r="5"
              stroke="#fff"
              strokeWidth="2"
            />
          </g>
        )}

        {/* First render all Rank Badge backgrounds and texts */}
        {points.map((p) => {
          const rank = rankMap[p.hour]
          if (!rank) return null

          const color = rankColors[rank]
          const posInfo = badgePositions[p.hour] || { badgeX: -12, badgeY: -16, textX: 0, textY: -7.5 }

          return (
            <g key={`badge-${p.hour}`} style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.15))' }}>
              {/* Badge Background */}
              <rect
                fill={color}
                height={12}
                rx="3"
                width={24}
                x={p.x + posInfo.badgeX}
                y={p.y + posInfo.badgeY}
              />
              {/* Badge Text */}
              <text
                fill="#ffffff"
                fontSize="8"
                fontWeight="900"
                textAnchor="middle"
                x={p.x}
                y={p.y + posInfo.textY}
              >
                {rank}위
              </text>
            </g>
          )
        })}

        {/* Then render all Dots and Pulsing Rings on top of everything */}
        {points.map((p) => {
          const rank = rankMap[p.hour]
          if (!rank) return null

          const color = rankColors[rank]

          return (
            <g key={`dot-${p.hour}`}>
              {/* Outer pulsing ring for rank 1 */}
              {rank === 1 && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  fill="none"
                  r="6.5"
                  stroke={color}
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                />
              )}
              {/* Dot */}
              <circle
                cx={p.x}
                cy={p.y}
                fill="#fff"
                r="3.5"
                stroke={color}
                strokeWidth="2"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function SimilarStations({ onStationClick, station, stationMetrics }) {
  const items = useMemo(() => {
    const allOtherStations = stationMetrics.filter((item) => item.id !== station.id && item.visible)
    const candidates = allOtherStations.length >= 3 ? allOtherStations : STATIONS.filter((item) => item.id !== station.id)

    const hash = (station.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    const available = [...candidates]
    const picked = []

    for (let i = 0; i < 3; i++) {
      if (available.length === 0) break
      const index = (hash + i * 7) % available.length
      picked.push(available[index])
      if (available.length > 3) {
        available.splice(index, 1)
      }
    }

    const dummyPercentages = [98, 95, 91]
    return picked.map((item, index) => ({
      name: item.name,
      lines: item.lines.join('·'),
      rank: index + 1,
      onClick: () => onStationClick(item.id),
      score: `${dummyPercentages[index]}%`,
    }))
  }, [station, stationMetrics, onStationClick])

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
