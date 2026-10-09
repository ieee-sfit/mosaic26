import StationTimer from "./StationTimer";

export default function StationHeader({
  timeRemaining,
  isCritical,
  systemStatus = "ACTIVE",
  onDebugClick,
  onOpenLeaderboard,
}) {
  return (
    <header className="ws4-header">
      <div className="ws4-header-branding">
        <div className="ws4-facility-badge" onClick={onDebugClick} title="Facility Classification Level 5">
          AREA 51 // SEC-LVL 5
        </div>
        <div className="ws4-header-titles">
          <h1 className="ws4-header-title">
            AREA51 FACILITY LOCKDOWN
            <span className="ws4-station-tag">STATION 04</span>
          </h1>
          <span className="ws4-header-subtitle">
            EMERGENCY DIGITAL LOGIC INTERLOCK // FAIL-SAFE SUPERVISORY SYSTEM
          </span>
        </div>
      </div>

      <div className="ws4-header-status-group" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {onOpenLeaderboard && (
          <button
            type="button"
            className="ws4-btn ws4-btn-secondary"
            onClick={onOpenLeaderboard}
            style={{
              fontSize: "11px",
              padding: "6px 12px",
              letterSpacing: "1px",
              borderColor: "var(--ws4-amber-warn)",
              color: "var(--ws4-amber-warn)",
            }}
            id="ws4-header-leaderboard-btn"
            title="View Winners & Results"
          >
            🏆 WINNERS / LEADERBOARD
          </button>
        )}

        <div className={`ws4-status-pill ${isCritical ? "ws4-critical" : "ws4-active"}`}>
          <span
            className={`ws4-led ${isCritical ? "ws4-red ws4-blink" : "ws4-green"}`}
            aria-hidden="true"
          />
          <span>STATUS: {systemStatus}</span>
        </div>

        <StationTimer
          timeRemaining={timeRemaining}
          isUrgent={timeRemaining < 120 && timeRemaining > 0}
        />
      </div>
    </header>
  );
}
