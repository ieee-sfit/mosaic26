import raceDuelImage from "../../assets/ford_vs_ferrari_duel.jpg";

export default function RaceScene({
  currentLatency = 2.8,
  networkStatus = "DEGRADED",
  totalViewersMillions = 2.4,
  lap = 24,
  totalLaps = 66,
}) {
  const isOptimal = currentLatency < 1.5;
  const isDegraded = currentLatency >= 2.0;

  return (
    <div className="ws1-race-scene-container" aria-label="Live Formula 1 Race Broadcast View">
      {/* Background Cinematic Racing Image */}
      <div className="ws1-race-viewport">
        <img
          src={raceDuelImage}
          alt="Ford GT40 vs Ferrari 330 P4 live racing duel"
          className="ws1-race-img"
        />

        {/* High-speed scanline & speed blur visual overlay */}
        <div className="ws1-scanline-overlay" aria-hidden="true" />
        <div className="ws1-vignette-overlay" aria-hidden="true" />

        {/* Top Broadcast HUD Bar */}
        <div className="ws1-hud-top-bar">
          <div className="ws1-hud-cam-badge">
            <span className="ws1-cam-rec-dot" />
            <span className="ws1-cam-title">CAM 04 • DUNLOP CURVE FEED</span>
            <span className="ws1-cam-fps">1080p60 • UHD HEVC</span>
          </div>

          <div className="ws1-hud-center-duel">
            <span className="ws1-car-tag ws1-car-ford">FORD GT40 #6</span>
            <span className="ws1-duel-delta">GAP: +0.420s</span>
            <span className="ws1-car-tag ws1-car-ferrari">FERRARI 330 P4 #21</span>
          </div>

          <div className="ws1-hud-lap-badge">
            <span className="ws1-hud-lap-label">LAP</span>
            <span className="ws1-hud-lap-value">
              {lap} / {totalLaps}
            </span>
          </div>
        </div>

        {/* Bottom Broadcast Telemetry Overlay Strip */}
        <div className="ws1-hud-bottom-strip">
          <div className="ws1-hud-stat-box">
            <span className="ws1-hud-stat-label">BROADCAST</span>
            <span className="ws1-hud-stat-value ws1-text-red">● LIVE AIR</span>
          </div>

          <div className="ws1-hud-stat-box">
            <span className="ws1-hud-stat-label">GLOBAL AUDIENCE</span>
            <span className="ws1-hud-stat-value">{totalViewersMillions.toFixed(1)}M</span>
          </div>

          <div
            className={`ws1-hud-stat-box ws1-latency-hud-box ${
              isOptimal ? "ws1-hud-safe" : isDegraded ? "ws1-hud-critical" : "ws1-hud-warn"
            }`}
          >
            <span className="ws1-hud-stat-label">STREAM LATENCY</span>
            <div className="ws1-hud-latency-readout">
              <span className="ws1-hud-latency-num">{currentLatency.toFixed(2)}</span>
              <span className="ws1-hud-latency-unit">SEC</span>
            </div>
            <span className="ws1-hud-subnote">
              {isOptimal ? "✓ TARGET < 1.5s MET" : "⚠ EXCEEDS 1.5s THRESHOLD"}
            </span>
          </div>

          <div className="ws1-hud-stat-box">
            <span className="ws1-hud-stat-label">NETWORK STATUS</span>
            <span
              className={`ws1-hud-status-badge ${
                networkStatus === "OPTIMAL"
                  ? "ws1-status-opt"
                  : networkStatus === "STABLE"
                  ? "ws1-status-stb"
                  : "ws1-status-deg"
              }`}
            >
              {networkStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
