import stationInfoRaw from './station_info.csv?raw'
import passengerSummary from './passenger_summary.json'
import peakMetricsRaw from './station_peak_concentration_stability.csv?raw'

// passenger_summary.json은 scripts/preprocess.mjs로 생성됩니다.
// 원본 CSV가 갱신되면 `node scripts/preprocess.mjs` 재실행 후 커밋하세요.
//
// 큐브 구조: data[direction][type]['weekday'|'weekend'][hour 0-23] = 합산값
//   역 수가 늘어도 JSON 크기는 "역 수 × 480 숫자"로 고정됩니다.

const FALLBACK_HOURLY = [
  20, 10, 5, 5, 10, 50,
  200, 500, 600, 400, 300, 280,
  300, 280, 260, 300, 400, 600,
  500, 300, 200, 150, 100, 50,
]

function parseCSV(text) {
  const [headerLine, ...dataLines] = text.trim().split('\n')
  const headers = headerLine.split(',').map(h => h.trim())
  return dataLines
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',')
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
    })
}

/**
 * station_info.csv로 역 목록을 구성하고 passenger_summary.json의 집계값을 병합한다.
 *
 * 각 역에 추가되는 필드:
 *   cube   - 필터 정확 계산에 사용. summary 없는 역은 null (fallback 모드)
 *   cnt    - 필터 없는 기본 일평균 (passengerRange 슬라이더 상한 계산용)
 *   hourly - 전체 시간대 일평균 (PeakCard·차트 표시용)
 *   wdr/wkr - 평일·주말 상대 비율 (PeakCard 요일 레이블용)
 *   age    - 유형별 비중 % (파이차트용)
 *
 * TODO: dummy_data.csv가 모든 역을 포함하면 fallback 분기 제거 가능
 */
export function buildStationsFromInfo() {
  const rows = parseCSV(stationInfoRaw)
  const stationMap = new Map()
  const simMap = new Map()

  const peakRows = parseCSV(peakMetricsRaw)
  const peakMap = new Map()
  for (const row of peakRows) {
    const name = row['역명']
    const type = row['주말구분']
    if (!peakMap.has(name)) peakMap.set(name, {})
    peakMap.get(name)[type] = {
      totalPassengers: parseFloat(row['전체이용객수']),
      peakHour: row['피크시간대'],
      peakPassengers: parseFloat(row['피크시간대_이용객수']),
      concentration: parseFloat(row['피크집중도']),
      mean: parseFloat(row['시간대별_평균']),
      std: parseFloat(row['시간대별_표준편차']),
      stability: parseFloat(row['안정도']),
    }
  }

  for (const row of rows) {
    const name = row['기준역']
    if (!stationMap.has(name)) {
      stationMap.set(name, {
        id: name,
        name,
        lines: [],
        lng: parseFloat(row['x']),
        lat: parseFloat(row['y']),
      })
    }
    const lineNames = row['호선'].split('/').map(l => l.trim())
    for (const lineName of lineNames) {
      if (!stationMap.get(name).lines.includes(lineName)) {
        stationMap.get(name).lines.push(lineName)
      }
    }

    if (!simMap.has(name)) {
      const sims = [row['유사역_1'], row['유사역_2'], row['유사역_3']].filter(Boolean)
      if (sims.length) simMap.set(name, sims)
    }
  }

  return Array.from(stationMap.values()).map(station => {
    const s = passengerSummary[station.name]
    const pm = peakMap.get(station.name) ?? null

    return {
      ...station,
      peakMetrics: pm,

      // cube: getFilteredCount 에서 정확한 집계에 사용
      // null이면 loaders의 근사값(cnt·hourly·wdr·wkr)으로 fallback
      cube: s
        ? { numWeekdays: s.numWeekdays, numWeekends: s.numWeekends, data: s.data }
        : null,

      cnt:    s?.cnt    ?? 5000,
      hourly: s?.hourly ?? FALLBACK_HOURLY,
      wdr:    s?.wdr    ?? 1.0,
      wkr:    s?.wkr    ?? 0.8,
      age:    s?.age    ?? { 아동: 10, 청소년: 15, 중고생: 10, 일반: 45, 우대권: 15, 외국인: 5 },

      attr: {
        구: '미정',
        개통: '미정',
        출구: '미정',
        노선: `${station.lines.length}개`,
      },

      simPat: simMap.get(station.name) ?? [],
    }
  })
}
