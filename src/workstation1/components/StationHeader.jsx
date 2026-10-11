import StationTimer from "./StationTimer";

export default function StationHeader({
  systemStatus = "DEGRADED", // "OPTIMAL" | "STABLE" | "DEGRADED"
  timeRemaining = 720,
  errors = 0,
  hintsUsedCount = 0,
  score = 0,
  operatorName = "Pit Wall Engineer",
  onOpenLeaderboard,
  onOpenDebug,
}) {
  const getStatusBadge = () => {
    switch (systemStatus) {
      case "OPTIMAL":
        return {
          label: "BROADCAST OPTIMAL (<1.5s)",
          className: "ws1-status-optimal",
          dotClass: "ws1-dot-optimal",
        };
      case "STABLE":
        return {
          label: "NETWORK STABILIZED",
          className: "ws1-status-stable",
          dotClass: "ws1-dot-stable",
        };
      case "DEGRADED":
      default:
        return {
          label: "LATENCY CRITICAL (>1.5s)",
          className: "ws1-status-degraded",
          dotClass: "ws1-dot-degraded",
        };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <header className="ws1-header" role="banner">
      <div className="ws1-header-brand">
        <div className="ws1-brand-id">
          <span className="ws1-station-code">STATION 01</span>
          <span className="ws1-domain-pill">F1 BROADCAST TELEMETRY</span>
        </div>
        <div className="ws1-brand-titles">
          <div className="ws1-title-live-row">
            <span className="ws1-live-indicator" aria-hidden="true">
              <span className="ws1-live-dot" />
              LIVE
            </span>
            <h1 className="ws1-station-title">F1 0-LAG STREAM</h1>
          </div>
          <p className="ws1-station-sub">FORD VS FERRARI — LIVE BROADCAST CRISIS</p>
        </div>
      </div>

      <div className="ws1-header-status-group">
        <div className={`ws1-status-badge ${statusInfo.className}`}>
          <span className={`ws1-status-dot ${statusInfo.dotClass}`} />
          <span className="ws1-status-label">{statusInfo.label}</span>
        </div>

        <div className="ws1-telemetry-strip">
          <div className="ws1-telemetry-item">
            <span className="ws1-telemetry-label">CREW</span>
            <span className="ws1-telemetry-val" title={operatorName}>
              {operatorName}
            </span>
          </div>
          <div className="ws1-telemetry-item">
            <span className="ws1-telemetry-label">ERRORS</span>
            <span className={`ws1-telemetry-val ${errors > 0 ? "ws1-val-warn" : ""}`}>
              {errors}
            </span>
          </div>
          <div className="ws1-telemetry-item">
            <span className="ws1-telemetry-label">HINTS</span>
            <span className="ws1-telemetry-val">{hintsUsedCount}</span>
          </div>
          <div className="ws1-telemetry-item">
            <span className="ws1-telemetry-label">SCORE</span>
            <span className="ws1-telemetry-val ws1-val-score">{score}</span>
          </div>
        </div>
      </div>

      <div className="ws1-header-timer-box">
        <StationTimer timeRemaining={timeRemaining} />
        {onOpenLeaderboard && (
          <button
            type="button"
            className="ws1-header-lb-btn"
            onClick={onOpenLeaderboard}
            title="View World Feed Speed & Score Leaderboard"
            id="ws1-header-leaderboard-btn"
          >
            🏆 LEADERBOARD
          </button>
        )}
        {onOpenDebug && (
          <button
            type="button"
            className="ws1-dev-shortcut-btn"
            onClick={onOpenDebug}
            title="Open Diagnostic Drawer (Ctrl+Shift+D)"
            aria-label="Open Diagnostics"
          >
            SYS/DEV
          </button>
        )}
      </div>
    </header>
  );
}
