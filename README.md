# StationGo

## 실행 방법

### 1. 데이터 파일 추가

아래 링크에서 `final_merged_weekly_nonzero.csv`를 다운로드한 뒤 `src/data/` 폴더에 넣어주세요.

- 다운로드: https://drive.google.com/file/d/1KghLkbJqHV2VH-sQvadjwVTz5PUUU1A1/view?usp=drive_link

```
src/
└── data/
    └── final_merged_weekly_nonzero.csv  ← 여기에 배치
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 으로 접속합니다.

> `npm run dev` 실행 시 `preprocess.mjs` 스크립트가 자동으로 실행되어 `src/data/passenger_summary.json`을 생성합니다.  
> CSV 파일이 없으면 실행이 실패하므로 반드시 1단계를 먼저 완료하세요.

### 4. 환경 변수 설정 (선택)

`.env.example`을 복사해 `.env.local`을 만들고 카카오 지도 키를 입력합니다.

```bash
cp .env.example .env.local
# .env.local 파일에서 VITE_KAKAO_MAP_KEY 값을 입력
```

---

## 📦 사용 기술 및 패키지 (Tech Stack)
JavaScript와 기본 CSS로만 진행합니다.

React (Vite): 프론트엔드 프레임워크 및 빠른 빌드 도구

CSS: UI 스타일링 (클래스 기반)

zustand: 전역 상태 관리 (선택된 검색 필터, 현재 클릭한 지하철역 등의 상태 저장)

react-leaflet / leaflet: 중앙 지도 패널 구현 및 마커(지하철역) 시각화

recharts: 오른쪽 대시보드의 데이터 시각화 (파이 차트, 막대 그래프 등)

lucide-react: UI 구성에 필요한 깔끔한 SVG 아이콘 제공

