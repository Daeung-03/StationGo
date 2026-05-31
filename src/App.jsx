import { useState } from 'react';
import './App.css'; // 작성한 CSS 불러오기

// 왼쪽 패널 (검색 옵션)
const SearchPanel = () => (
  <div className="search-panel">
    <h2>StationGO</h2>
    <hr style={{ margin: '15px 0' }} />
    
    <div>
      <h3>검색 옵션</h3>
      <p style={{ color: 'gray', fontSize: '14px' }}>
        [여기에 슬라이더/토글 UI 추가 예정]
      </p>
    </div>
  </div>
);

// 중앙 패널 (지도)
const MapPanel = () => (
  <div className="map-panel">
    <span style={{ color: '#9ca3af', fontSize: '20px' }}>지도 영역 (Leaflet)</span>
    
    {/* 하단 순위 네비게이션 */}
    <div className="map-nav-button">
      [순위 네비게이션 화살표 예정]
    </div>
  </div>
);

// 오른쪽 패널 (대시보드)
const DashboardPanel = ({ isSelected }) => {
  // unselected시 열리지 않음
  if (!isSelected) return null;

  return (
    <div className="dashboard-panel">
      <h2>대시보드</h2>
      
      <div className="chart-placeholder">
        [승객 유형 파이차트 예정]
      </div>
      
      <div className="chart-placeholder">
        [시간대 Top3 막대차트 예정]
      </div>
    </div>
  );
};

export default function App() {
  const [selectedStation, setSelectedStation] = useState(true); 

  return (
    <div className="app-container">
      <SearchPanel />
      <MapPanel />
      <DashboardPanel isSelected={selectedStation} />
    </div>
  );
}