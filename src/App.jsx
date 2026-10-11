import { useState } from 'react'
import Station1 from './workstation1'
import Station4 from './workstation4'
import './App.css'

function App() {
  const [activeStation, setActiveStation] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const st = params.get('station');
      if (st === '4') return 4;
      if (st === '1') return 1;
    }
    return 1; // Default to Station 1
  });

  const handleSelectStation = (stNum) => {
    setActiveStation(stNum);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location);
      url.searchParams.set('station', String(stNum));
      window.history.pushState({}, '', url);
    }
  };

  return (
    <>
      <div className="mosaic-station-selector-bar">
        <span className="mosaic-nav-brand">MOSAIC TECHNICAL ARENA</span>
        <div className="mosaic-nav-buttons">
          <button
            type="button"
            className={`mosaic-nav-btn ${activeStation === 1 ? 'active' : ''}`}
            onClick={() => handleSelectStation(1)}
          >
            STATION 01: F1 0-LAG STREAM
          </button>
          <button
            type="button"
            className={`mosaic-nav-btn ${activeStation === 4 ? 'active' : ''}`}
            onClick={() => handleSelectStation(4)}
          >
            STATION 04: LOGIC INTERLOCK
          </button>
        </div>
      </div>

      {activeStation === 1 ? (
        <Station1 onNavigateStation={handleSelectStation} />
      ) : (
        <Station4 onNavigateStation={handleSelectStation} />
      )}
    </>
  )
}

export default App
