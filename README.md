# StationGo

2025년 서울 지하철(1~8호선) 승하차 데이터를 인터랙티브하게 탐색할 수 있는 데이터 시각화 웹 서비스입니다.  
시간대 및 주말/평일, 호선, 승객 유형, 승객 수 범위를 조절하며 지도 위에서 직관적으로 승객 수를 비교할 수 있습니다. 또한 피크 집중형/안정형 비교가 가능합니다.
특정 역을 클릭하면 시간대별 패턴과 연령대 분포, 유사역 등 세부 정보를 확인할 수 있습니다.

---

## 주요 기능

- **지도 기반 탐색** — 카카오맵 위에 역별 지표를 원 크기로 표시, 줌 레벨에 따라 자동 필터링. 확대 시(줌 레벨 낮춤) 랭킹 밖 역 비교 및 클릭 가능
- **필터 패널** — 노선, 이용자 유형(일반/어린이/청소년/노인), 시간대, 승하차 구분, 승차량 범위를 조합해 필터링
- **랭킹 뷰** — 현재 필터 기준 상위 역을 페이지네이션으로 탐색 -> 화면이 복잡해지는 것을 막음. 이 때 탐색 지역 랭킹(Local Top)과 탐색 랭킹(중앙 하단) 구분
- **역 상세 대시보드** — 간략한 요약 제공, 시간대별 차트, 연령대 파이 차트, 탑승 비율 바, 유사 역 목록
- **프리셋** — 출근 시간·퇴근 시간·주말 등 자주 쓰는 필터 조합을 한 번에 적용
- **역 검색** — 역 이름으로 빠르게 검색 후 지도 이동

---

## 사용 방법

### 1. 원본 데이터 파일 추가(2025)

아래 링크에서 `final_merged_weekly_nonzero.csv`를 다운로드한 뒤 `src/data/` 폴더에 넣어주세요.

- 다운로드: https://drive.google.com/file/d/1mq6Vc7YKdPVo1Jl2eCVi1dr1__xe6iKx/view?usp=sharing

```
src/
└── data/
    └── final_merged_weekly_nonzero.csv  ← 여기에 배치
```

> **데이터를 교체할 경우 반드시 `src/data/passenger_summary.json`을 삭제하세요.**  
> `npm run dev` / `npm run build` 실행 시 전처리 스크립트(`preprocess.mjs`)가 자동으로 실행되어 `passenger_summary.json`을 새로 생성하는데, 기존 파일이 남아 있으면 이전 데이터가 그대로 사용됩니다.

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정 (지도 표시에 필수)

`.env.example`을 복사해 `.env.local`을 만들고 카카오 지도 앱 키를 입력합니다.

```bash
cp .env.example .env.local
# .env.local 파일에서 VITE_KAKAO_MAP_KEY 값을 입력
```

카카오 개발자 콘솔(https://developers.kakao.com)에서 JavaScript 앱 키를 발급받을 수 있습니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 으로 접속합니다.  
첫 실행 시 전처리 스크립트가 CSV를 읽어 `passenger_summary.json`을 자동 생성합니다.

### 5. 프로덕션 빌드

```bash
npm run build
npm run preview   # 빌드 결과물 로컬 미리보기
```

---

## 데이터 전처리 구조

`scripts/preprocess.mjs`가 `final_merged_weekly_nonzero.csv`를 읽어 `src/data/passenger_summary.json`으로 변환합니다.  
`npm run dev` 및 `npm run build` 전에 자동 실행되도록 `predev` / `prebuild` 훅에 등록되어 있습니다.

| 파일 | 역할 |
|------|------|
| `final_merged_weekly_nonzero.csv` | 원본 주간 승하차 데이터 (git 미포함, 별도 다운로드 필요) |
| `src/data/passenger_summary.json` | 전처리 결과물 (자동 생성, git 포함) |
| `src/data/station_info.csv` | 역 좌표·노선 정적 메타데이터 |
| `src/data/station_peak_concentration_stability.csv` | 혼잡도·안정성 파생 지표 |

---

## 기술 스택

| 기술 | 선택 이유 |
|------|-----------|
| **React 19 + Vite** | 컴포넌트 기반 UI 구성과 상태 관리 편의성. Vite로 HMR 속도를 확보 |
| **Zustand** | Redux 대비 보일러플레이트 없이 전역 필터 상태(노선·시간대·선택 역 등)를 간결하게 관리 |
| **react-leaflet / Leaflet** | 오픈소스 지도 라이브러리. 카카오맵 SDK를 직접 래핑하기 위해 Leaflet의 커스텀 레이어 기능 활용 |
| **Recharts** | 시간대별 꺾은선 차트, 연령대 파이 차트 등 대시보드 차트를 선언적으로 구성 |
| **Lucide React** | 일관된 SVG 아이콘 세트. 번들 크기가 작고 트리쉐이킹 지원 |
| **Kakao Maps SDK** | 서울 지하철 역 위치를 한국 지도 맥락에서 정확하게 표시하기 위해 채택 |

---

## 프로젝트 구조

```
StationGo/
├── scripts/
│   └── preprocess.mjs        # CSV → JSON 전처리 스크립트
├── src/
│   ├── App.jsx                # 전체 레이아웃 및 컴포넌트 (지도, 사이드바, 대시보드)
│   ├── data/
│   │   ├── loaders.js                              # 데이터 로딩 유틸
│   │   ├── passenger_summary.json                  # 전처리 결과 (자동 생성)
│   │   ├── station_info.csv                        # 역 메타데이터
│   │   └── station_peak_concentration_stability.csv
│   └── assets/               # 랭킹 뱃지 이미지 등 정적 자산
├── index.html
├── vite.config.js
└── package.json
```
