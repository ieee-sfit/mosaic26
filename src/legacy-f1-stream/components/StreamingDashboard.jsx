export default function StreamingDashboard({
  currentLatency = 2.8,
  peakUtilization = 94,
  averageUtilization = 78,
  packetLossPercent = 0.8,
  bitrateProfile = { label: "BALANCED — 4 Mbps", bitrateMbps: 4 },
  bufferProfile = { label: "LIVE OPTIMIZED (1.8s)", bufferSeconds: 1.8, stallRisk: "LOW" },
  totalViewersMillions = 2.4,
}) {
  const isLatencySafe = currentLatency < 1.5;
  const isLossSafe = packetLossPercent <= 1.0;
  const isPeakSafe = peakUtilization <= 75;

  return (
    <div className="ws1-streaming-dashboard" aria-label="Streaming Engineering Telemetry Console">
      <div className="ws1-telemetry-header">
        <div className="ws1-telemetry-title-wrap">
          <span className="ws1-tel-dot" />
          <span className="ws1-tel-title">BROADCAST TELEMETRY BUS</span>
        </div>
        <span className="ws1-tel-rate">40 Hz TELEMETRY</span>
      </div>

      <div className="ws1-telemetry-cards-stack">
        {/* Card 1: End-to-End Latency */}
        <div className={`ws1-tel-card ${isLatencySafe ? "ws1-card-safe" : "ws1-card-alert"}`}>
          <div className="ws1-tel-top">
            <span className="ws1-card-label">END-TO-END LATENCY</span>
            <span className={`ws1-badge-pill-small ${isLatencySafe ? "ws1-pill-green" : "ws1-pill-red"}`}>
              {isLatencySafe ? "OPTIMAL" : "CRITICAL"}
            </span>
          </div>
          <div className="ws1-tel-val-row">
            <span className="ws1-tel-num-big">{currentLatency.toFixed(2)}</span>
            <span className="ws1-tel-unit">SEC</span>
          </div>
          <div className="ws1-mini-bar-track">
            <div
              className={`ws1-mini-bar-fill ${isLatencySafe ? "ws1-bar-green" : "ws1-bar-red"}`}
              style={{ width: `${Math.min(100, (currentLatency / 3.5) * 100)}%` }}
            />
          </div>
          <div className="ws1-tel-foot">
            <span>TARGET: &lt; 1.50s</span>
            <span>DELTA: {(currentLatency - 1.5).toFixed(2)}s</span>
          </div>
        </div>

        {/* Card 2: CDN Peak Utilization */}
        <div className={`ws1-tel-card ${isPeakSafe ? "ws1-card-safe" : "ws1-card-warn"}`}>
          <div className="ws1-tel-top">
            <span className="ws1-card-label">CDN PEAK UTILIZATION</span>
            <span className="ws1-tel-subtag">AVG {averageUtilization}%</span>
          </div>
          <div className="ws1-tel-val-row">
            <span className="ws1-tel-num-big">{peakUtilization}%</span>
            <span className="ws1-tel-unit">EGRESS LOAD</span>
          </div>
          <div className="ws1-mini-bar-track">
            <div
              className={`ws1-mini-bar-fill ${isPeakSafe ? "ws1-bar-green" : "ws1-bar-amber"}`}
              style={{ width: `${peakUtilization}%` }}
            />
          </div>
          <div className="ws1-tel-foot">
            <span>SAFE CEILING: 75%</span>
            <span>{isPeakSafe ? "NORMAL HEADROOM" : "CONGESTED"}</span>
          </div>
        </div>

        {/* Card 3: Packet Loss */}
        <div className={`ws1-tel-card ${isLossSafe ? "ws1-card-safe" : "ws1-card-alert"}`}>
          <div className="ws1-tel-top">
            <span className="ws1-card-label">PACKET LOSS RATIO</span>
            <span className="ws1-tel-subtag">UDP/TCP CHUNK</span>
          </div>
          <div className="ws1-tel-val-row">
            <span className="ws1-tel-num-big">{packetLossPercent.toFixed(2)}%</span>
            <span className="ws1-tel-unit">DROPPED</span>
          </div>
          <div className="ws1-tel-foot">
            <span>TOLERANCE: &lt; 1.00%</span>
            <span>{isLossSafe ? "CLEAN STREAM" : "FRAME DROPS"}</span>
          </div>
        </div>

        {/* Card 4: Viewers & Bandwidth */}
        <div className="ws1-tel-card">
          <div className="ws1-tel-top">
            <span className="ws1-card-label">LIVE VIEWER TRAFFIC</span>
            <span className="ws1-tel-subtag">AGGREGATE</span>
          </div>
          <div className="ws1-tel-val-row">
            <span className="ws1-tel-num-big">{totalViewersMillions.toFixed(1)}M</span>
            <span className="ws1-tel-unit">STREAMS</span>
          </div>
          <div className="ws1-tel-foot">
            <span>BITRATE: {bitrateProfile.bitrateMbps} Mbps</span>
            <span>PROFILE: {bitrateProfile.id || "BALANCED"}</span>
          </div>
        </div>

        {/* Card 5: Buffer Health */}
        <div className="ws1-tel-card">
          <div className="ws1-tel-top">
            <span className="ws1-card-label">BUFFER HEALTH</span>
            <span className="ws1-tel-subtag">STALL RISK: {bufferProfile.stallRisk}</span>
          </div>
          <div className="ws1-tel-val-row">
            <span className="ws1-tel-num-big">{bufferProfile.bufferSeconds.toFixed(1)}s</span>
            <span className="ws1-tel-unit">CUSHION</span>
          </div>
          <div className="ws1-tel-foot">
            <span>{bufferProfile.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
