import { useState } from 'react'
import Station1 from './workstation1'
import Station2 from './workstation2'
import Station3 from './workstation3/Station3'
import Station4 from './workstation4'
import './App.css'

function App() {
  const [activeStation, setActiveStation] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const st = params.get('station');
      if (st === '4') return 4;
      if (st === '2') return 2;
      if (st === '3') return 3;
      if (st === '1') return 1;
    }
    return 1; // Default fallback
  });

  // Show station picker modal if no explicit station query parameter is in URL
  const [showChooser, setShowChooser] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return !params.has('station');
    }
    return true;
  });

  const [stationKey, setStationKey] = useState(0);

  const handleSelectStation = (stNum) => {
    setActiveStation(stNum);
    setStationKey((prev) => prev + 1);
    setShowChooser(false);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location);
      url.searchParams.set('station', String(stNum));
      window.history.pushState({}, '', url);
    }
  };

  return (
    <>
      {/* Initial Station Chooser Pop-up Modal */}
      {showChooser && (
        <div className="mosaic-station-modal-overlay">
          <div className="mosaic-station-modal">
            <div className="mosaic-modal-header">
              <span className="mosaic-modal-badge">MOSAIC 2026 ARENA</span>
              <h2 className="mosaic-modal-title">CHOOSE WORKSTATION TO PLAY</h2>
              <p className="mosaic-modal-subtitle">
                Select an active challenge station below to launch your terminal session.
              </p>
            </div>

            <div className="mosaic-station-cards-grid">
              {/* Station 1 Card */}
              <div className="mosaic-station-card card-st1" onClick={() => handleSelectStation(1)}>
                <div className="mosaic-card-glow-bg" />
                <div className="mosaic-card-banner">
                  <img src="/f1_stream.jpg" alt="F1 0-Lag Stream" className="mosaic-banner-img" />
                  <div className="mosaic-banner-overlay" />
                  <span className="mosaic-banner-badge">CIRCUIT 01</span>
                </div>
                <div className="mosaic-card-head">
                  <div className="mosaic-card-head-left">
                    <span className="mosaic-card-icon">⚡</span>
                    <span className="mosaic-card-id">STATION 01</span>
                  </div>
                  <span className="mosaic-card-type">STREAM SIM</span>
                </div>
                <h3 className="mosaic-card-name">F1 0-LAG STREAM</h3>
                <p className="mosaic-card-desc">
                  Ford vs Ferrari live pit-wall broadcast. Calibrate bandwidth, CDN routing, and low-latency buffer interlocks.
                </p>
                <div className="mosaic-card-tags">
                  <span className="mosaic-tag">CDN ROUTING</span>
                  <span className="mosaic-tag">BITRATE</span>
                  <span className="mosaic-tag">OSCILLOSCOPE</span>
                </div>
                <button
                  type="button"
                  className="mosaic-card-play-btn"
                  onClick={(e) => { e.stopPropagation(); handleSelectStation(1); }}
                >
                  <span>INITIALIZE STATION 01</span>
                  <span className="mosaic-btn-arrow">➔</span>
                </button>
              </div>

              {/* Station 2 Card */}
              <div className="mosaic-station-card card-st2" onClick={() => handleSelectStation(2)}>
                <div className="mosaic-card-glow-bg" />
                <div className="mosaic-card-banner">
                  <img src="/f1_stream.jpg" alt="Le Mans 1966 Pit Wall" className="mosaic-banner-img" />
                  <div className="mosaic-banner-overlay" />
                  <span className="mosaic-banner-badge">LE MANS 1966</span>
                </div>
                <div className="mosaic-card-head">
                  <div className="mosaic-card-head-left">
                    <span className="mosaic-card-icon">🏁</span>
                    <span className="mosaic-card-id">STATION 02</span>
                  </div>
                  <span className="mosaic-card-type">PIT WALL</span>
                </div>
                <h3 className="mosaic-card-name">F1 0-LAG STREAM</h3>
                <p className="mosaic-card-desc">
                  Ford v Ferrari pit wall telemetry. Link the Le Mans relay towers and balance the 3-node stream load before the engine blows.
                </p>
                <div className="mosaic-card-tags">
                  <span className="mosaic-tag">RELAY TOWERS</span>
                  <span className="mosaic-tag">LOAD BALANCER</span>
                  <span className="mosaic-tag">TACHOMETER</span>
                </div>
                <button
                  type="button"
                  className="mosaic-card-play-btn"
                  onClick={(e) => { e.stopPropagation(); handleSelectStation(2); }}
                >
                  <span>INITIALIZE STATION 02</span>
                  <span className="mosaic-btn-arrow">➔</span>
                </button>
              </div>

              {/* Station 3 Card */}
              <div className="mosaic-station-card card-st3" onClick={() => handleSelectStation(3)}>
                <div className="mosaic-card-glow-bg" />
                <div className="mosaic-card-banner">
                  <img src="/echallan_police.jpg" alt="eChallan Police" className="mosaic-banner-img" />
                  <div className="mosaic-banner-overlay" />
                  <span className="mosaic-banner-badge">HIGHWAY CAM</span>
                </div>
                <div className="mosaic-card-head">
                  <div className="mosaic-card-head-left">
                    <span className="mosaic-card-icon">🚨</span>
                    <span className="mosaic-card-id">STATION 03</span>
                  </div>
                  <span className="mosaic-card-type">TRAFFIC CONTROL</span>
                </div>
                <h3 className="mosaic-card-name">ECHALLAN POLICE</h3>
                <p className="mosaic-card-desc">
                  Fast &amp; Furious tactical ANPR police surveillance grid. Decode license plates, speed infractions, and traffic camera zones.
                </p>
                <div className="mosaic-card-tags">
                  <span className="mosaic-tag">ANPR OCR</span>
                  <span className="mosaic-tag">SPEED TRAP</span>
                  <span className="mosaic-tag">DISPATCH</span>
                </div>
                <button
                  type="button"
                  className="mosaic-card-play-btn"
                  onClick={(e) => { e.stopPropagation(); handleSelectStation(3); }}
                >
                  <span>INITIALIZE STATION 03</span>
                  <span className="mosaic-btn-arrow">➔</span>
                </button>
              </div>

              {/* Station 4 Card */}
              <div className="mosaic-station-card card-st4" onClick={() => handleSelectStation(4)}>
                <div className="mosaic-card-glow-bg" />
                <div className="mosaic-card-banner">
                  <img src="/area51_lockdown.jpg" alt="Area51 Facility Lockdown" className="mosaic-banner-img" />
                  <div className="mosaic-banner-overlay" />
                  <span className="mosaic-banner-badge">SECTOR D-7</span>
                </div>
                <div className="mosaic-card-head">
                  <div className="mosaic-card-head-left">
                    <span className="mosaic-card-icon">☣</span>
                    <span className="mosaic-card-id">STATION 04</span>
                  </div>
                  <span className="mosaic-card-type">SECURITY CORE</span>
                </div>
                <h3 className="mosaic-card-name">AREA51 FACILITY LOCKDOWN</h3>
                <p className="mosaic-card-desc">
                  Area 51 facility lockdown containment. Troubleshoot digital logic gates, IC circuits, and override security lockouts.
                </p>
                <div className="mosaic-card-tags">
                  <span className="mosaic-tag">LOGIC GATES</span>
                  <span className="mosaic-tag">CIRCUITS</span>
                  <span className="mosaic-tag">LOCKDOWN</span>
                </div>
                <button
                  type="button"
                  className="mosaic-card-play-btn"
                  onClick={(e) => { e.stopPropagation(); handleSelectStation(4); }}
                >
                  <span>INITIALIZE STATION 04</span>
                  <span className="mosaic-btn-arrow">➔</span>
                </button>
              </div>
            </div>

            <div className="mosaic-modal-footer">
              <span className="mosaic-footer-pulse" />
              <span>LIVE TELEMETRY ACTIVE • SWITCH BETWEEN STATIONS ANYTIME VIA THE TOP ARENA BAR</span>
            </div>
          </div>
        </div>
      )}

      {/* Render Active Station */}
      {activeStation === 1 && (
        <Station1
          key={`st1_${stationKey}`}
          onNavigateStation={handleSelectStation}
          onOpenStationChooser={() => setShowChooser(true)}
        />
      )}
      {activeStation === 2 && (
        <Station2
          key={`st2_${stationKey}`}
          onNavigateStation={handleSelectStation}
          onOpenStationChooser={() => setShowChooser(true)}
        />
      )}
      {activeStation === 3 && (
        <Station3
          key={`st3_${stationKey}`}
          onNavigateStation={handleSelectStation}
          onOpenStationChooser={() => setShowChooser(true)}
        />
      )}
      {activeStation === 4 && (
        <Station4
          key={`st4_${stationKey}`}
          onNavigateStation={handleSelectStation}
          onOpenStationChooser={() => setShowChooser(true)}
        />
      )}
    </>
  )
}

export default App

