import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { buildStationsFromInfo } from './data/loaders.js'
import rank1Img from './assets/rank1.png'
import rank2Img from './assets/rank2.png'
import rank3Img from './assets/rank3.png'
import rankCommonImg from './assets/rank_common.png'

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
}

const AGE_COLORS = {
  아동: '#F97316',
  청소년: '#F59E0B',
  중고생: '#10B981',
  일반: '#3B82F6',
  우대권: '#A78BFA',
  외국인: '#EC4899',
}

// station_info.csv + passenger_summary.json 기반 역 목록
const STATIONS = buildStationsFromInfo()
// 승객 수 필터 슬라이더 상한: 실제 최대 cnt를 10,000 단위로 올림
const PASSENGER_RANGE_MAX = Math.ceil(Math.max(...STATIONS.map(s => s.cnt), 10000) / 10000) * 10000


const LINES = ['1호선', '2호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선']
const USER_TYPES = ['아동', '청소년', '중고생', '일반', '우대권', '외국인']
const AGE_ORDER = ['아동', '일반', '외국인', '중고생', '청소년', '우대권']
const RANK_DOT_CLASSES = ['rd1', 'rd2', 'rd3']



function formatHour(value) {
  return `${String(Math.round(value)).padStart(2, '0')}:00`
}

function formatMetricValue(value, mode) {
  if (mode === 'stability' || mode === 'concentration') {
    return `${(value * 100).toFixed(2)}%`
  }
  return formatPassenger(value)
}

function getMetricLabel(mode) {
  if (mode === 'stability') return '피크 안정도'
  if (mode === 'concentration') return '피크 집중도'
  return '선택 조건 이용자 수'
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

    // numWeekdays/numWeekends는 "주차 단위" 개수 (평일 1묶음=5일, 주말 1묶음=2일)
    const wdDays = numWeekdays * 5
    const weDays = numWeekends * 2
    if (weekday === '평일') return Math.round(wdSum / (wdDays || 1))
    if (weekday === '주말') return Math.round(weSum / (weDays || 1))
    // '전체': 날짜 수 가중 평균 → 실제 일평균
    return Math.round((wdSum + weSum) / ((wdDays + weDays) || 1))
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
    const wdDays = numWeekdays * 5
    const weDays = numWeekends * 2

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
        hourlyData[h] = Math.round(wdSum / (wdDays || 1))
      } else if (weekday === '주말') {
        hourlyData[h] = Math.round(weSum / (weDays || 1))
      } else {
        hourlyData[h] = Math.round((wdSum + weSum) / ((wdDays + weDays) || 1))
      }
    }
    return hourlyData
  }

  const dayFactor = filters.weekday === '평일' ? station.wdr : filters.weekday === '주말' ? station.wkr : (station.wdr + station.wkr) / 2
  const ageFactor = USER_TYPES.reduce((sum, type) => sum + (filters.activeTypes.has(type) ? station.age[type] || 0 : 0), 0) / 100
  const directionFactor = filters.boarding === '승차' ? 0.52 : filters.boarding === '하차' ? 0.48 : 1

  return station.hourly.map((val) => Math.round(val * dayFactor * ageFactor * directionFactor))
}

function getBoardingRatio(station, filters) {
  if (!station.cube) {
    return {
      boardingPct: 52, alightingPct: 48,
      boardingCount: Math.round(station.cnt * 0.52),
      alightingCount: Math.round(station.cnt * 0.48),
    }
  }
  const { weekday, activeTypes, timeRange: [start, end] } = filters
  const { numWeekdays, numWeekends, data } = station.cube
  const wdDays = numWeekdays * 5
  const weDays = numWeekends * 2
  let bWd = 0, bWe = 0, aWd = 0, aWe = 0
  for (const type of USER_TYPES) {
    if (!activeTypes.has(type)) continue
    for (let h = start; h < end; h++) {
      bWd += data['승차']?.[type]?.weekday[h] ?? 0
      bWe += data['승차']?.[type]?.weekend[h] ?? 0
      aWd += data['하차']?.[type]?.weekday[h] ?? 0
      aWe += data['하차']?.[type]?.weekend[h] ?? 0
    }
  }
  let bCount, aCount
  if (weekday === '평일') {
    bCount = bWd / (wdDays || 1); aCount = aWd / (wdDays || 1)
  } else if (weekday === '주말') {
    bCount = bWe / (weDays || 1); aCount = aWe / (weDays || 1)
  } else {
    const td = (wdDays + weDays) || 1
    bCount = (bWd + bWe) / td; aCount = (aWd + aWe) / td
  }
  const total = bCount + aCount
  if (total === 0) return { boardingPct: 50, alightingPct: 50, boardingCount: 0, alightingCount: 0 }
  return {
    boardingPct: Math.round(bCount / total * 100),
    alightingPct: Math.round(aCount / total * 100),
    boardingCount: Math.round(bCount),
    alightingCount: Math.round(aCount),
  }
}

function getStationMetrics(filters, activeMetricMode) {
  return STATIONS.map((station) => {
    let count = 0
    let visible = false

    const hasValidCoords = !isNaN(station.lat) && !isNaN(station.lng)

    if (activeMetricMode) {
      const pm = station.peakMetrics?.[filters.weekday]
      if (pm) {
        count = activeMetricMode === 'stability' ? pm.stability : pm.concentration
        // 호선·승객 수 필터는 피크 모드에서도 역 제외 기준으로 적용
        const lineMatch = filters.activeLines.size > 0 && station.lines.some((line) => filters.activeLines.has(line))
        const passengerMatch = station.cnt >= filters.passengerRange[0] && station.cnt <= filters.passengerRange[1]
        visible = lineMatch && passengerMatch && hasValidCoords
      }
    } else {
      count = getFilteredCount(station, filters)
      const lineMatch = filters.activeLines.size > 0 && station.lines.some((line) => filters.activeLines.has(line))
      const passengerMatch = count >= filters.passengerRange[0] && count <= filters.passengerRange[1]
      visible = lineMatch && passengerMatch && count > 0 && hasValidCoords
    }

    return { ...station, count, visible }
  })
}

function getRankedStations(filters, activeMetricMode) {
  const stationMetrics = getStationMetrics(filters, activeMetricMode)
  const ranked = stationMetrics.filter((station) => station.visible).sort((a, b) => b.count - a.count)
  const metricMap = stationMetrics.reduce((map, station) => ({ ...map, [station.id]: station }), {})

  return { metricMap, ranked, stationMetrics }
}

function getRadius(station, stationMetrics) {
  const visibleMetrics = stationMetrics.filter((item) => item.visible)
  const maxValue = Math.max(...visibleMetrics.map((item) => item.count), 1)
  const value = station.visible ? station.count : 0

  return 0.7 + (2.7 - 0.7) * Math.sqrt(value / maxValue)
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
  boarding,
  onMapReady,
  onStationClick,
  onTooltipHide,
  onTooltipMove,
  onTooltipShow,
  pageIds,
  rankPage,
  ranked,
  selectedStationId,
  stationMetrics,
  onVisibleStationsChange,
  localTopIds,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlaysRef = useRef([])
  const lastMousePos = useRef({ clientX: 0, clientY: 0 })
  const [loadState, setLoadState] = useState(KAKAO_MAP_KEY ? 'loading' : 'missing')
  const [showZoomToast, setShowZoomToast] = useState(false)
  const [zoomToastKey, setZoomToastKey] = useState(0)
  const toastTimeoutRef = useRef(null)
  const isProgrammaticRef = useRef(false)

  const triggerZoomToast = useCallback(() => {
    setShowZoomToast(true)
    setZoomToastKey((prev) => prev + 1)
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = setTimeout(() => {
      setShowZoomToast(false)
    }, 1500)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

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
        if (onMapReady) onMapReady(mapRef.current)
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
      const radius = getRadius(station, stationMetrics)
      const selected = selectedStationId === station.id
      const inPage = pageIds.includes(station.id)
      const isLocalTop = localTopIds?.includes(station.id)
      const isNotGlobalLocalTop = isLocalTop && !inPage
      const globalRank = ranked.findIndex((item) => item.id === station.id) + 1
      const localRank = pageIds.indexOf(station.id) + 1
      const color = LINE_COLORS[station.lines[0]] || '#3B6DFF'
      const circleRadius = Math.max(45, radius * 32)
      const RANK_FILL = { 1: '#F59E0B', 2: '#9CA3AF', 3: '#B45309' }
      const rankFill = RANK_FILL[globalRank] || '#3B6DFF'
      const inPageRadius = Math.max(280, circleRadius * 4)

      if (station.visible) stationInfoMap[station.id] = { station, globalRank }

      // Visual circle
      const circle = new kakao.maps.Circle({
        center: position,
        fillColor: inPage ? rankFill : selected ? '#FF4757' : isNotGlobalLocalTop ? '#FF5C00' : '#f5dd00',
        fillOpacity: station.visible ? (inPage ? 0.40 : selected ? 0.95 : isNotGlobalLocalTop ? 0.85 : 0.85) : 0.18,
        map,
        radius: inPage ? inPageRadius : circleRadius,
        strokeColor: inPage ? rankFill : isNotGlobalLocalTop ? '#FF5C00' : '#ffffff',
        strokeOpacity: station.visible ? 0.9 : 0.2,
        strokeWeight: inPage ? 4 : isNotGlobalLocalTop ? 3.5 : 3,
        zIndex: selected ? 10 : inPage ? 8 : isNotGlobalLocalTop ? 7 : 5,
      })
      overlaysRef.current.push(circle)

      if (station.visible) {
        const prominent = selected || inPage || isNotGlobalLocalTop
        const labelClass = selected ? ' selected' : inPage ? ' pinned' : isNotGlobalLocalTop ? ' local-top' : ''

        const el = document.createElement('span')
        el.className = `kakao-station-label${labelClass}`
        el.innerText = station.name
        el.style.cursor = 'pointer'
        el.style.pointerEvents = 'auto'

        el.onclick = (e) => {
          e.stopPropagation()
          onStationClick(station.id)
        }

        el.onmouseenter = (e) => {
          const info = stationInfoMap[station.id]
          if (info) {
            onTooltipShow(
              { clientX: e.clientX, clientY: e.clientY },
              info.station,
              info.globalRank
            )
          }
        }

        el.onmousemove = (e) => {
          onTooltipMove({ clientX: e.clientX, clientY: e.clientY })
        }

        el.onmouseleave = () => {
          onTooltipHide()
        }

        const label = new kakao.maps.CustomOverlay({
          clickable: true,
          content: el,
          map,
          position,
          xAnchor: 0.5,
          yAnchor: -0.55,
          zIndex: prominent ? 30 : 6,
        })
        overlaysRef.current.push(label)
      }

      if (inPage && !selected) {
        const rmpDelayClass = localRank >= 2 ? ` rmp-delay-${localRank}` : ''
        const rankImgSrc = globalRank === 1 ? rank1Img : globalRank === 2 ? rank2Img : globalRank === 3 ? rank3Img : rankCommonImg
        const pin = new kakao.maps.CustomOverlay({
          clickable: false,
          content: `<div class="rank-map-pin${rmpDelayClass}"><img src="${rankImgSrc}" width="44" height="56" style="display:block;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35))"/></div>`,
          map,
          position: new kakao.maps.LatLng(station.lat, station.lng),
          xAnchor: 0.5,
          yAnchor: 1.0,
          zIndex: 15,
        })
        overlaysRef.current.push(pin)

        const pulseClass = globalRank <= 3 ? `rpr${globalRank}` : 'rpr-common'
        const pulse = new kakao.maps.CustomOverlay({
          clickable: false,
          content: `<div class="rank-pulse-ring ${pulseClass}"></div>`,
          map,
          position,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 7,
        })
        overlaysRef.current.push(pulse)

        if (boarding === '승차' || boarding === '하차') {
          const arrow = boarding === '승차' ? '↑' : '↓'
          const boardingLabel = new kakao.maps.CustomOverlay({
            clickable: false,
            content: `<span class="rank-boarding-label">${arrow} ${boarding}</span>`,
            map,
            position,
            xAnchor: 0.5,
            yAnchor: -1.2,
            zIndex: 14,
          })
          overlaysRef.current.push(boardingLabel)
        }
      }
    })

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null))
      overlaysRef.current = []
      container.removeEventListener('mousemove', onNativeMove)
      container.removeEventListener('mouseleave', onNativeLeave)
    }
  }, [
    boarding,
    loadState,
    onStationClick,
    onTooltipHide,
    onTooltipMove,
    onTooltipShow,
    pageIds,
    rankPage,
    ranked,
    selectedStationId,
    stationMetrics,
    localTopIds,
  ])

  const selectedStationIdRef = useRef(selectedStationId)
  useEffect(() => {
    selectedStationIdRef.current = selectedStationId
  }, [selectedStationId])

  // Fit map bounds when pageIds (filters or rank bar page) changes, including selected station
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current || !window.kakao?.maps || !pageIds || pageIds.length === 0) return

    const map = mapRef.current
    const bounds = new kakao.maps.LatLngBounds()
    let hasPoints = false

    const selectedId = selectedStationIdRef.current
    stationMetrics.forEach((station) => {
      if (pageIds.includes(station.id) || station.id === selectedId) {
        bounds.extend(new kakao.maps.LatLng(station.lat, station.lng))
        hasPoints = true
      }
    })

    if (hasPoints) {
      const isDashOpen = !!selectedId
      const paddingRight = isDashOpen ? 120 : 50
      isProgrammaticRef.current = true
      map.setBounds(bounds, 50, paddingRight, 50, 50)
      if (map.getLevel() < 5) {
        map.setLevel(5)
      } else if (map.getLevel() > 9) {
        map.setLevel(9)
      }
      isProgrammaticRef.current = false
    }
  }, [loadState, pageIds, stationMetrics])

  // Relayout map when dashboard opens or closes (selectedStationId changes)
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current || !window.kakao?.maps) return

    const map = mapRef.current

    // Call relayout immediately
    map.relayout()

    // Call relayout again after transition finishes
    const timer = setTimeout(() => {
      map.relayout()
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [loadState, selectedStationId])

  // viewport bounds 변경 및 화면 내 역 필터링을 위한 Ref 설정
  const stationMetricsRef = useRef(stationMetrics)
  useEffect(() => {
    stationMetricsRef.current = stationMetrics
  }, [stationMetrics])

  const onVisibleStationsChangeRef = useRef(onVisibleStationsChange)
  useEffect(() => {
    onVisibleStationsChangeRef.current = onVisibleStationsChange
  }, [onVisibleStationsChange])

  // zoom_changed: toggle map-zoomed-out class to hide non-prominent labels when zoomed out
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current || !window.kakao?.maps) return undefined

    const kakao = window.kakao
    const map = mapRef.current
    const container = containerRef.current
    const LABEL_ZOOM_THRESHOLD = 5  // level ≤ 5 → show all labels; level ≥ 6 → hide non-pinned/non-selected

    const updateZoomClass = () => {
      const currentLevel = map.getLevel()
      if (currentLevel > 9) {
        if (!isProgrammaticRef.current) {
          triggerZoomToast()
        }
        map.setLevel(9)
      }
      if (container) container.classList.toggle('map-zoomed-out', map.getLevel() > LABEL_ZOOM_THRESHOLD)
    }

    updateZoomClass()
    kakao.maps.event.addListener(map, 'zoom_changed', updateZoomClass)

    return () => {
      kakao.maps.event.removeListener(map, 'zoom_changed', updateZoomClass)
    }
  }, [loadState, triggerZoomToast])

  // idle 이벤트 리스너 등록
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current || !window.kakao?.maps) return undefined

    const kakao = window.kakao
    const map = mapRef.current

    const updateVisibleStations = () => {
      const bounds = map.getBounds()
      if (!bounds) return

      const visibleIds = stationMetricsRef.current
        .filter((station) => {
          if (!station.visible) return false
          const latlng = new kakao.maps.LatLng(station.lat, station.lng)
          return bounds.contain(latlng)
        })
        .map((station) => station.id)

      if (onVisibleStationsChangeRef.current) {
        onVisibleStationsChangeRef.current(visibleIds)
      }
    }

    // 초기 상태 반영
    updateVisibleStations()

    kakao.maps.event.addListener(map, 'idle', updateVisibleStations)

    return () => {
      kakao.maps.event.removeListener(map, 'idle', updateVisibleStations)
    }
  }, [loadState])

  // stationMetrics 변경 시에도 즉각 화면 내 역 계산
  useEffect(() => {
    if (loadState !== 'ready' || !mapRef.current || !window.kakao?.maps) return

    const kakao = window.kakao
    const map = mapRef.current
    const bounds = map.getBounds()
    if (!bounds) return

    const visibleIds = stationMetrics
      .filter((station) => {
        if (!station.visible) return false
        const latlng = new kakao.maps.LatLng(station.lat, station.lng)
        return bounds.contain(latlng)
      })
      .map((station) => station.id)

    if (onVisibleStationsChange) {
      onVisibleStationsChange(visibleIds)
    }
  }, [loadState, stationMetrics, onVisibleStationsChange])

  return (
    <>
      <div className="internet-map kakao-map" ref={containerRef} />
      {showZoomToast && (
        <div key={zoomToastKey} className="zoom-limit-toast">
          더 축소할 수 없습니다
        </div>
      )}
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
  const [rankPage, setRankPage] = useState(0)
  const [selectedStationId, setSelectedStationId] = useState(null)
  const [timeRange, setTimeRange] = useState([6, 24])
  const [passengerRange, setPassengerRange] = useState([0, PASSENGER_RANGE_MAX])
  const [weekday, setWeekday] = useState('전체')
  const [boarding, setBoarding] = useState('전체')
  const [activeTypes, setActiveTypes] = useState(() => new Set(USER_TYPES))
  const [activeLines, setActiveLines] = useState(() => new Set(LINES))
  const [selectedPreset, setSelectedPreset] = useState('사용자 정의')
  const [tooltip, setTooltip] = useState(null)
  const [visibleStationIds, setVisibleStationIds] = useState(null)
  const [activeMetricMode, setActiveMetricMode] = useState(null)
  const [rankNavBlocked, setRankNavBlocked] = useState(false)
  const navBlockTimerRef = useRef(null)

  const handleMetricModeToggle = (mode) => {
    setActiveMetricMode((current) => (current === mode ? null : mode))
    setRankPage(0)
  }

  const filters = useMemo(() => ({
    activeLines,
    activeTypes,
    boarding,
    passengerRange,
    timeRange,
    weekday,
  }), [activeLines, activeTypes, boarding, passengerRange, timeRange, weekday])
  const { metricMap, ranked, stationMetrics } = useMemo(() => getRankedStations(filters, activeMetricMode), [filters, activeMetricMode])
  const pageCount = Math.max(1, Math.ceil(ranked.length / 3))
  const safeRankPage = Math.min(rankPage, pageCount - 1)
  const pageStations = useMemo(() => ranked.slice(safeRankPage * 3, safeRankPage * 3 + 3), [ranked, safeRankPage])
  const selectedStation = metricMap[selectedStationId]?.visible ? metricMap[selectedStationId] : null

  const localTop3 = useMemo(() => {
    if (!visibleStationIds) return ranked.slice(0, 3)
    return ranked.filter((station) => visibleStationIds.includes(station.id)).slice(0, 3)
  }, [ranked, visibleStationIds])

  const updateTimeRange = (index, value) => {
    setSelectedPreset('사용자 정의')
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
    setSelectedPreset('사용자 정의')
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
    setSelectedPreset('사용자 정의')
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
      setTimeRange([6, 24])
      setActiveTypes(new Set(['아동', '우대권']))
    }
    // '사용자 정의': no filter changes, just updates the dropdown label
  }

  const toggleUserType = (type) => {
    setSelectedPreset('사용자 정의')
    setActiveTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
    setRankPage(0)
  }

  const toggleLine = (line) => {
    setSelectedPreset('사용자 정의')
    setActiveLines((current) => {
      const next = new Set(current)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      return next
    })
    setRankPage(0)
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
    const next = Math.max(0, Math.min(pageCount - 1, rankPage + direction))
    if (next === rankPage) {
      if (navBlockTimerRef.current) clearTimeout(navBlockTimerRef.current)
      setRankNavBlocked(true)
      navBlockTimerRef.current = setTimeout(() => setRankNavBlocked(false), 1000)
      return
    }
    setRankPage(next)
  }

  const mapInstanceRef = useRef(null)
  const [navigatedStationName, setNavigatedStationName] = useState(null)
  const selectedStationRef = useRef(selectedStation)
  useEffect(() => { selectedStationRef.current = selectedStation }, [selectedStation])
  useEffect(() => { setNavigatedStationName(null) }, [selectedStationId])

  const navigateToStation = useCallback((name) => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return
    const kakao = window.kakao
    const map = mapInstanceRef.current

    if (navigatedStationName === name) {
      const sel = selectedStationRef.current
      if (sel) {
        map.setCenter(new kakao.maps.LatLng(sel.lat, sel.lng))
        if (map.getLevel() > 4) map.setLevel(4)
      }
      setNavigatedStationName(null)
      return
    }

    const station = STATIONS.find((s) => s.name === name)
    if (!station) return
    map.setCenter(new kakao.maps.LatLng(station.lat, station.lng))
    if (map.getLevel() > 4) map.setLevel(4)
    setNavigatedStationName(name)
  }, [navigatedStationName])

  return (
    <div className="stationgo-app">
      <Navigation />
      <div className="main">
        <Sidebar
          activeLines={activeLines}
          activeMetricMode={activeMetricMode}
          activeTypes={activeTypes}
          boarding={boarding}
          onBoardingChange={updateChoice(setBoarding)}
          onLineToggle={toggleLine}
          onMetricModeToggle={handleMetricModeToggle}
          onPassengerRangeChange={updatePassengerRange}
          onPresetChange={applyPreset}
          onTimeRangeChange={updateTimeRange}
          onTypeToggle={toggleUserType}
          onWeekdayChange={updateChoice(setWeekday)}
          maxPassenger={PASSENGER_RANGE_MAX}
          passengerRange={passengerRange}
          selectedPreset={selectedPreset}
          timeRange={timeRange}
          weekday={weekday}
        />
        <MapPanel
          boarding={boarding}
          onMapInstanceReady={(map) => { mapInstanceRef.current = map }}
          onRankNav={handleRankNav}
          onStationClick={handleStationClick}
          onTooltipHide={handleTooltipHide}
          onTooltipMove={handleTooltipMove}
          onTooltipShow={handleTooltipShow}
          pageCount={pageCount}
          pageStations={pageStations}
          rankNavBlocked={rankNavBlocked}
          rankPage={safeRankPage}
          ranked={ranked}
          selectedStationId={selectedStationId}
          stationMetrics={stationMetrics}
          localTop3={localTop3}
          onVisibleStationsChange={setVisibleStationIds}
        />
        <Dashboard
          activeMetricMode={activeMetricMode}
          filters={filters}
          navigateToStation={navigateToStation}
          navigatedStationName={navigatedStationName}
          onClose={() => setSelectedStationId(null)}
          ranked={ranked}
          selectedStation={selectedStation}
          stationMetrics={stationMetrics}
        />
      </div>
      <Tooltip activeMetricMode={activeMetricMode} ranked={ranked} selectedStation={selectedStation} tooltip={tooltip} />
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
  activeLines,
  activeMetricMode,
  activeTypes,
  boarding,
  maxPassenger,
  onBoardingChange,
  onLineToggle,
  onMetricModeToggle,
  onPassengerRangeChange,
  onPresetChange,
  onTimeRangeChange,
  onTypeToggle,
  onWeekdayChange,
  passengerRange,
  selectedPreset,
  timeRange,
  weekday,
}) {
  const [ddOpen, setDdOpen] = useState(false)
  const ddRef = useRef(null)
  const timeLabel = timeRange[0] === 6 && timeRange[1] === 24 ? '전일' : `${formatHour(timeRange[0])}~${formatHour(timeRange[1])}`
  const allPresets = [
    { icon: '🎛️', name: '사용자 정의', desc: '직접 필터 조건 설정', bg: '#F5F7FD' },
    { icon: '🚶', name: '출퇴근 패턴', desc: '평일 07–09·18–20시, 일반', bg: '#EEF2FF' },
    { icon: '🎉', name: '주말 여가', desc: '주말 10–22시, 전연령', bg: '#FDF4EC' },
    { icon: '📚', name: '청년·학생층', desc: '청소년·중고생·일반', bg: '#EDFDF4' },
    { icon: '🏥', name: '교통약자', desc: '아동·우대권, 전시간대', bg: '#F5F0FA' },
  ]
  const currentPreset = allPresets.find((p) => p.name === selectedPreset) || allPresets[0]

  useEffect(() => {
    if (!ddOpen) return
    const handleClickOutside = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ddOpen])

  return (
    <aside className="sidebar">
      <div className="sb-head">
        <span className="sb-title">검색 컬럼</span>
      </div>

      <div className="sb-scroll">
        <div className={`fsec ${activeMetricMode ? 'disabled' : ''}`}>
          <div className="flabel">컬럼 선택 세트</div>
          <div className="preset-dd" ref={ddRef}>
            <button className={`preset-dd-trigger ${ddOpen ? 'open' : ''}`} onClick={() => setDdOpen((v) => !v)} disabled={!!activeMetricMode}>
              <span className="picon" style={{ background: currentPreset.bg }}>{currentPreset.icon}</span>
              <span className="preset-dd-name">{currentPreset.name}</span>
              <span className={`preset-arrow ${ddOpen ? 'open' : ''}`}>▾</span>
            </button>
            {ddOpen && (
              <div className="preset-dd-list">
                {allPresets.map((preset) => (
                  <button
                    className={`preset-dd-item ${selectedPreset === preset.name ? 'on' : ''}`}
                    key={preset.name}
                    onClick={() => { onPresetChange(preset.name); setDdOpen(false) }}
                    disabled={!!activeMetricMode}
                  >
                    <span className="picon" style={{ background: preset.bg }}>{preset.icon}</span>
                    <span>
                      <span className="pname">{preset.name}</span>
                      <span className="pdesc">{preset.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`fsec ${activeMetricMode ? 'disabled' : ''}`}>
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
            min={6}
            onChange={onTimeRangeChange}
            step={1}
            values={timeRange}
            disabled={!!activeMetricMode}
          />
        </div>

        <ChoiceSection label="요일" onChange={onWeekdayChange} options={['전체', '평일', '주말']} value={weekday} />

        <div className={`fsec ${activeMetricMode ? 'disabled' : ''}`}>
          <div className="flabel">이용자 유형</div>
          <div className="pgroup">
            {USER_TYPES.map((type) => (
              <button className={`pill ${activeTypes.has(type) ? 'on' : ''}`} key={type} onClick={() => onTypeToggle(type)} disabled={!!activeMetricMode}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <ChoiceSection label="승 / 하차" onChange={onBoardingChange} options={['전체', '승차', '하차']} value={boarding} disabled={!!activeMetricMode} />

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

        <div className="fsec peak-mode-sec">
          <div className="flabel">피크 분석 모드</div>
          <div className="peak-mode-grid">
            <button
              className={`peak-mode-box ${activeMetricMode === 'stability' ? 'on' : ''}`}
              onClick={() => onMetricModeToggle('stability')}
            >
              <div className="pmb-icon">📊</div>
              <div className="pmb-text">
                <span className="pmb-title">피크 안정도</span>
                <span className="pmb-desc">시간대별 균등 분포도</span>
              </div>
            </button>
            <button
              className={`peak-mode-box ${activeMetricMode === 'concentration' ? 'on' : ''}`}
              onClick={() => onMetricModeToggle('concentration')}
            >
              <div className="pmb-icon">⚡</div>
              <div className="pmb-text">
                <span className="pmb-title">피크 집중도</span>
                <span className="pmb-desc">특정 시간 혼잡 쏠림</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}


function DualRange({ max, min, onChange, step, values, disabled }) {
  const [start, end] = values
  const left = ((start - min) / (max - min)) * 100
  const width = ((end - start) / (max - min)) * 100

  return (
    <div className="swrap">
      <div className="tbg" />
      <div className="tfl" style={{ left: `${left}%`, width: `${width}%` }} />
      <input className="dr" disabled={disabled} max={max} min={min} onChange={(event) => onChange(0, event.target.value)} step={step} type="range" value={start} />
      <input className="dr" disabled={disabled} max={max} min={min} onChange={(event) => onChange(1, event.target.value)} step={step} type="range" value={end} />
    </div>
  )
}

function ChoiceSection({ label, onChange, options, value, disabled }) {
  return (
    <div className={`fsec ${disabled ? 'disabled' : ''}`}>
      <div className="flabel">{label}</div>
      <div className="btnrow">
        {options.map((option) => (
          <button className={`tbtn ${value === option ? 'on' : ''}`} disabled={disabled} key={option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}


function StationSearchBox({ stationMetrics, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const inputRef = useRef(null)

  const trimmed = query.trim()
  const results = trimmed
    ? STATIONS.filter((s) => s.name.includes(trimmed)).slice(0, 8)
    : []
  const noResults = trimmed.length > 0 && results.length === 0

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (station) => {
    onSelect(station)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="ssb-wrap" ref={boxRef}>
      <div className="ssb-input-row">
        <span className="ssb-icon">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="#A0AABF" strokeWidth="1.4" />
            <line x1="7.8" y1="7.8" x2="10.5" y2="10.5" stroke="#A0AABF" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={inputRef}
          className="ssb-input"
          placeholder="역 검색"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button className="ssb-clear" onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}>✕</button>
        )}
      </div>
      {open && (results.length > 0 || noResults) && (
        <div className="ssb-dropdown">
          {noResults ? (
            <div className="ssb-no-result">제공되지 않는 역 또는 없는 역입니다</div>
          ) : (
            results.map((station) => {
              const metric = stationMetrics.find((m) => m.id === station.id)
              const isVisible = metric?.visible
              return (
                <button
                  key={station.id}
                  className={`ssb-item${isVisible ? '' : ' ssb-item-dim'}`}
                  onClick={() => handleSelect(station)}
                >
                  <span className="ssb-sname">{station.name}</span>
                  <div className="ssb-lines">
                    {station.lines.map((line) => (
                      <span key={line} className="ssb-ltag" style={lineTagStyle(line)}>{line}</span>
                    ))}
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function MapPanel({
  boarding,
  onMapInstanceReady,
  onRankNav,
  onStationClick,
  onTooltipHide,
  onTooltipMove,
  onTooltipShow,
  pageCount,
  pageStations,
  rankNavBlocked,
  rankPage,
  ranked,
  selectedStationId,
  stationMetrics,
  localTop3,
  onVisibleStationsChange,
}) {
  const pageIds = useMemo(() => pageStations.map((station) => station.id), [pageStations])
  const localTopIds = useMemo(() => localTop3.map((station) => station.id), [localTop3])
  const rankStart = ranked.length ? rankPage * 3 + 1 : 0
  const rankEnd = ranked.length ? Math.min(rankStart + 2, ranked.length) : 0
  const mapInstanceRef = useRef(null)

  const handleSearchSelect = useCallback((station) => {
    onStationClick(station.id)
    const map = mapInstanceRef.current
    if (map && window.kakao?.maps) {
      const kakao = window.kakao
      map.setCenter(new kakao.maps.LatLng(station.lat, station.lng))
      if (map.getLevel() > 4) map.setLevel(4)
    }
  }, [onStationClick])

  return (
    <main className="mapc internet-mapc">
      <div className="rank-bar">
        <div className="rb-card">
          <span className="rb-label">LOCAL TOP</span>
          {[0, 1, 2].map((index) => (
            <div className="rb-fragment" key={index}>
              {index > 0 && <div className="rb-sep" />}
              <div className="rb-item">
                <div className={`rdot ${RANK_DOT_CLASSES[index]}`}>{index + 1}</div>
                <span className="rb-name">{localTop3[index]?.name || '—'}</span>
              </div>
            </div>
          ))}
        </div>
        <StationSearchBox stationMetrics={stationMetrics} onSelect={handleSearchSelect} />
      </div>

      <KakaoMetroMap
        boarding={boarding}
        onMapReady={(map) => { mapInstanceRef.current = map; onMapInstanceReady?.(map) }}
        onStationClick={onStationClick}
        onTooltipHide={onTooltipHide}
        onTooltipMove={onTooltipMove}
        onTooltipShow={onTooltipShow}
        pageIds={pageIds}
        rankPage={rankPage}
        ranked={ranked}
        selectedStationId={selectedStationId}
        stationMetrics={stationMetrics}
        onVisibleStationsChange={onVisibleStationsChange}
        localTopIds={localTopIds}
      />

      <div className="rank-nav">
        {rankNavBlocked && (
          <div className="rn-block-toast">다음 순위로 넘어갈 수 없습니다</div>
        )}
        <button
          className={`rn-arr${rankPage === 0 ? ' rn-arr-end' : ''}`}
          onClick={() => onRankNav(-1)}
        >‹</button>
        <div className="rn-stations">
          {pageStations.length === 0
            ? <span className="rn-main">—</span>
            : pageStations.map((station, idx) => (
              <span className="rn-station-item" key={station.id}>
                {idx > 0 && <span className="rn-sep">·</span>}
                <span className="rn-rank-num">{rankStart + idx}위</span>
                <span className="rn-station-name">{station.name}</span>
              </span>
            ))
          }
        </div>
        <button
          className={`rn-arr${rankPage === pageCount - 1 ? ' rn-arr-end' : ''}`}
          onClick={() => onRankNav(1)}
        >›</button>
      </div>
    </main>
  )
}

const CHART_BOARDING_COLORS = { '전체': '#3B6DFF', '승차': '#10B981', '하차': '#F97316' }

function Dashboard({ activeMetricMode, filters, navigateToStation, navigatedStationName, onClose, ranked, selectedStation, stationMetrics }) {
  const [hoveredHour, setHoveredHour] = useState(null)
  const [hoveredVal, setHoveredVal] = useState(null)
  const [chartBoarding, setChartBoarding] = useState('전체')

  useEffect(() => {
    setChartBoarding('전체')
    setHoveredHour(null)
    setHoveredVal(null)
  }, [selectedStation?.id])

  if (!selectedStation) return <aside className="dash" />

  const rank = ranked.findIndex((item) => item.id === selectedStation.id) + 1
  const visibleMetrics = stationMetrics.filter((station) => station.visible)
  const isPeakMode = activeMetricMode === 'stability' || activeMetricMode === 'concentration'

  const average = isPeakMode
    ? visibleMetrics.reduce((sum, station) => sum + station.count, 0) / (visibleMetrics.length || 1)
    : Math.round(visibleMetrics.reduce((sum, station) => sum + station.count, 0) / (visibleMetrics.length || 1))

  let diffText = ''
  if (isPeakMode) {
    const diffPct = (selectedStation.count - average) * 100
    diffText = `평균 대비 ${diffPct > 0 ? '+' : ''}${diffPct.toFixed(2)}%p`
  } else {
    const diffPct = average ? ((selectedStation.count - average) / average * 100).toFixed(0) : 0
    diffText = `평균 대비 ${selectedStation.count > average ? '+' : ''}${diffPct}%`
  }

  const handleHourHover = (hour, val) => {
    setHoveredHour(hour)
    setHoveredVal(val)
  }

  // 피크 모드에서도 기존 이용자 정보는 station.cnt(기본 일평균)로 표시
  const passengerCount = isPeakMode ? selectedStation.cnt : selectedStation.count

  const chartColor = CHART_BOARDING_COLORS[chartBoarding]
  const chartHourlyValues = filters
    ? getHourlyData(selectedStation, { ...filters, boarding: chartBoarding })
    : selectedStation.hourly

  const boardingRatio = filters
    ? getBoardingRatio(selectedStation, filters)
    : { boardingPct: 52, alightingPct: 48, boardingCount: 0, alightingCount: 0 }

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

        {isPeakMode && (
          <div className="dsec peak-stat-sec">
            <div className="dst">{getMetricLabel(activeMetricMode)}</div>
            <div className="mhl">
              <div className="mhl-left">
                <div className="mhlabel">역별 대표 지표값</div>
                <div className="mhval">
                  {(selectedStation.count * 100).toFixed(2)}
                  <span>%</span>
                </div>
                <div className="mhsub">피크 순위 {rank}위 · {diffText}</div>
              </div>
            </div>
          </div>
        )}

        <div className="dsec">
          <div className="dst">선택 조건 이용자 수</div>
          <div className="mhl">
            <div className="mhl-left">
              <div className="mhlabel">
                {isPeakMode ? '기본 일평균 이용자' : '조건 반영 합산 방문객'}
              </div>
              <div className="mhval">
                {passengerCount.toLocaleString()}
                <span>명</span>
              </div>
              {!isPeakMode && (
                <div className="mhsub">
                  조건 내 {rank}위 · {diffText}
                </div>
              )}
            </div>
            <StationSummary station={selectedStation} />
          </div>
        </div>

        <div className="dsec">
          <div className="dst">승차 / 하차 비율</div>
          <BoardingRatioBar ratio={boardingRatio} />
        </div>

        <div className="dsec">
          <div className="dst" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>시간대별 이용자</span>
            {hoveredHour !== null && (
              <span style={{ fontSize: '11px', color: chartColor, fontWeight: 600 }}>
                {String(hoveredHour).padStart(2, '0')}시 · {hoveredVal?.toLocaleString()}명
              </span>
            )}
          </div>
          <div className="chart-tab-row">
            {['전체', '승차', '하차'].map((opt) => (
              <button
                key={opt}
                className={`chart-tab-btn ${chartBoarding === opt ? 'on' : ''}`}
                style={chartBoarding === opt ? { borderColor: CHART_BOARDING_COLORS[opt], color: CHART_BOARDING_COLORS[opt], background: `${CHART_BOARDING_COLORS[opt]}12` } : undefined}
                onClick={() => setChartBoarding(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <HourlyChart chartColor={chartColor} hourlyValues={chartHourlyValues} onHoverChange={handleHourHover} />
        </div>

        <div className="dsec">
          <div className="dst">승객 유형별 분포</div>
          <div className="chwrap">
            <AgePie count={passengerCount} station={selectedStation} />
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
            navigateToStation={navigateToStation}
            navigatedStationName={navigatedStationName}
            station={selectedStation}
          />
        </div>
      </div>
    </aside>
  )
}

function HourlyChart({ chartColor = '#3B6DFF', hourlyValues, onHoverChange }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!hourlyValues || hourlyValues.length === 0) return null

  const gradId = `hourlyAreaGrad-${chartColor.replace('#', '')}`

  const startIndex = 6
  const slicedValues = hourlyValues.slice(startIndex)
  const maxVal = Math.max(...slicedValues, 100)

  const sorted = slicedValues
    .map((value, idx) => ({ hour: idx + startIndex, value }))
    .sort((a, b) => b.value - a.value)

  const rankMap = {}
  sorted.slice(0, 3).forEach((item, index) => {
    rankMap[item.hour] = index + 1
  })

  const top3 = sorted.slice(0, 3)
  const chronoTop3 = [...top3].sort((a, b) => a.hour - b.hour)
  const badgePositions = {}

  let lastPos = 'BOTTOM'
  chronoTop3.forEach((item, idx) => {
    const rank = rankMap[item.hour]
    let pos = 'TOP'
    if (idx > 0 && Math.abs(item.hour - chronoTop3[idx - 1].hour) <= 2) {
      pos = lastPos === 'TOP' ? 'BOTTOM' : 'TOP'
    } else {
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

  const points = slicedValues.map((val, idx) => {
    const hour = idx + startIndex
    const x = paddingLeft + (idx / (slicedValues.length - 1)) * chartWidth
    const y = height - paddingBottom - (val / maxVal) * chartHeight
    return { hour, val, x, y }
  })

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} Z`

  const rankColors = {
    1: '#F59E0B',
    2: '#9CA3AF',
    3: '#B45309',
  }

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - rect.left

    let closestIdx = 0
    let minDiff = Infinity
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = idx
      }
    })

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
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>

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

        <line
          stroke="#EAECF5"
          strokeWidth="1"
          x1={paddingLeft}
          x2={width - paddingRight}
          y1={height - paddingBottom}
          y2={height - paddingBottom}
        />

        <path d={areaPath} fill={`url(#${gradId})`} />

        <path
          d={linePath}
          fill="none"
          stroke={chartColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />

        {[6, 11, 16, 21, 23].map((hour) => {
          const idx = hour - startIndex
          const x = paddingLeft + (idx / (slicedValues.length - 1)) * chartWidth
          const labelText = `${String(hour).padStart(2, '0')}시`
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

        {hoveredPoint && (
          <g>
            <line
              stroke={chartColor}
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
              fill={chartColor}
              r="5"
              stroke="#fff"
              strokeWidth="2"
            />
          </g>
        )}

        {points.map((p) => {
          const rank = rankMap[p.hour]
          if (!rank) return null

          const color = rankColors[rank]
          const posInfo = badgePositions[p.hour] || { badgeX: -12, badgeY: -16, textX: 0, textY: -7.5 }

          return (
            <g key={`badge-${p.hour}`} style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.15))' }}>
              <rect
                fill={color}
                height={12}
                rx="3"
                width={24}
                x={p.x + posInfo.badgeX}
                y={p.y + posInfo.badgeY}
              />
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

        {points.map((p) => {
          const rank = rankMap[p.hour]
          if (!rank) return null

          const color = rankColors[rank]

          return (
            <g key={`dot-${p.hour}`}>
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

function StationSummary({ station }) {
  const topPeakHour = [...station.hourly]
    .map((val, h) => ({ h, val }))
    .filter(({ h }) => h >= 5)
    .sort((a, b) => b.val - a.val)[0]

  const topType = AGE_ORDER
    .filter((type) => type !== '일반')
    .map((type) => ({ type, pct: station.age[type] || 0 }))
    .sort((a, b) => b.pct - a.pct)[0]

  let wdAvg = 0, weAvg = 0
  if (station.cube) {
    const { numWeekdays, numWeekends, data } = station.cube
    let wdSum = 0, weSum = 0
    for (const dir of ['승차', '하차']) {
      for (const type of USER_TYPES) {
        const entry = data[dir]?.[type]
        if (!entry) continue
        for (let h = 0; h < 24; h++) {
          wdSum += entry.weekday[h] ?? 0
          weSum += entry.weekend[h] ?? 0
        }
      }
    }
    wdAvg = Math.round(wdSum / (numWeekdays * 5 || 1))
    weAvg = Math.round(weSum / (numWeekends * 2 || 1))
  } else {
    wdAvg = Math.round(station.cnt * station.wdr)
    weAvg = Math.round(station.cnt * station.wkr)
  }

  const higherDay = wdAvg >= weAvg ? '평일' : '주말'

  return (
    <div className="stn-summary">
      <div className="ssum-row">
        <span className="ssum-lbl">피크 시간대</span>
        <span className="ssum-val">{topPeakHour ? `${String(topPeakHour.h).padStart(2, '0')}:00` : '—'}</span>
      </div>
      <div className="ssum-row">
        <span className="ssum-lbl">최다 유형 (일반 제외)</span>
        <span className="ssum-val">{topType?.type ?? '—'}</span>
      </div>
      <div className="ssum-row">
        <span className="ssum-lbl">주말 vs 평일</span>
        <span className="ssum-val">{higherDay} ↑</span>
      </div>
    </div>
  )
}

function AgePie({ count, station }) {
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
        {((count ?? station.count) / 1000).toFixed(1)}K
      </text>
    </svg>
  )
}

function BoardingRatioBar({ ratio }) {
  const { boardingPct, alightingPct, boardingCount, alightingCount } = ratio
  return (
    <div className="boarding-ratio-wrap">
      <div className="boarding-ratio-bar">
        <div className="brb-boarding" style={{ width: `${boardingPct}%` }} />
        <div className="brb-alighting" style={{ flex: 1 }} />
      </div>
      <div className="boarding-ratio-stats">
        <div className="brs-item">
          <span className="brs-arrow-up">↑</span>
          <span className="brs-label">승차</span>
          <span className="brs-pct">{boardingPct}%</span>
          <span className="brs-count">{boardingCount.toLocaleString()}명</span>
        </div>
        <div className="brs-item brs-right">
          <span className="brs-count">{alightingCount.toLocaleString()}명</span>
          <span className="brs-pct">{alightingPct}%</span>
          <span className="brs-label">하차</span>
          <span className="brs-arrow-down">↓</span>
        </div>
      </div>
    </div>
  )
}

function SimilarStations({ navigateToStation, navigatedStationName, station }) {
  const names = station?.simPat ?? []

  if (!names.length) {
    return (
      <div className="simlist">
        <span style={{ color: '#A0AABF', fontSize: '12px' }}>유사 역 데이터 없음</span>
      </div>
    )
  }

  return (
    <div className="simlist">
      {names.map((name, index) => {
        const s = STATIONS.find((st) => st.name === name)
        const lines = s ? s.lines.join('·') : ''
        const isNavigated = navigatedStationName === name
        return (
          <button
            className={`simitem${isNavigated ? ' simitem-navigated' : ''}`}
            key={name}
            onClick={() => navigateToStation(name)}
            title={isNavigated ? `다시 누르면 ${station.name}으로 복귀` : undefined}
          >
            <span className="sirank">{index + 1}</span>
            <span className="siinfo">
              <span className="siname">{name}</span>
              {lines && <span className="siline">{lines}</span>}
            </span>
            {isNavigated && <span className="siback-hint">↩</span>}
          </button>
        )
      })}
    </div>
  )
}

function Tooltip({ activeMetricMode, ranked, selectedStation, tooltip }) {
  if (!tooltip) return <div className="tt" />

  const { station, rank, x, y } = tooltip
  const diff = selectedStation && selectedStation.id !== station.id ? station.count - selectedStation.count : null
  const distance =
    selectedStation && selectedStation.id !== station.id
      ? getDistanceKm(station, selectedStation).toFixed(1)
      : null
  const isPeakMode = activeMetricMode === 'stability' || activeMetricMode === 'concentration'

  let diffText = ''
  if (diff !== null) {
    if (isPeakMode) {
      const diffPct = diff * 100
      diffText = `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(2)}%p`
    } else {
      diffText = `${diff > 0 ? '+' : ''}${diff.toLocaleString()}명`
    }
  }

  return (
    <div className="tt show" style={{ left: x + 14, top: y - 10 }}>
      <div className="ttn">
        {station.name}
        <span className="ttnlines">
          {station.lines.map((line) => (
            <span key={line} className="ttlb" style={lineTagStyle(line)}>{line}</span>
          ))}
        </span>
      </div>
      <div className="ttr">
        <span className="ttk">{getMetricLabel(activeMetricMode)}</span>
        <span className="ttv">{formatMetricValue(station.count, activeMetricMode)}</span>
      </div>
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
              {diffText}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default App
