export default function FailureScreen({
  finalScore = 0,
  scoreData,
  timeUsedSeconds = 720,
  errors = 0,
  hintsUsedCount = 0,
  completedModules = [],
  finalLatency = 2.8,
  onRestartStation,
  onOpenLeaderboard,
}) {
  const minutes = Math.floor(timeUsedSeconds / 60);
  const seconds = timeUsedSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="ws1-outcome-screen ws1-timeout-bg">
      <div className="ws1-outcome-card ws1-card-timeout">
        <div className="ws1-timeout-tag-strip">
          <span className="ws1-timeout-icon" aria-hidden="true">⏱</span>
          <span className="ws1-timeout-title">12:00 SHIFT DURATION EXPIRED</span>
        </div>

        <div className="ws1-outcome-header">
          <h1 className="ws1-outcome-title">BROADCAST FAILURE — SHIFT TIMEOUT</h1>
          <h2 className="ws1-outcome-sub ws1-text-red">
            LIVE STREAM NOT VERIFIED
          </h2>
          <div className="ws1-status-pill-big ws1-pill-red">
            RACE BROADCAST REMAINED DEGRADED (&gt; 1.5s DELAY)
          </div>
        </div>

        <div className="ws1-outcome-kpi-row">
          <div className="ws1-outcome-kpi ws1-score-kpi">
            <span className="ws1-outcome-kpi-label">PRESERVED SCORE</span>
            <div className="ws1-score-display">
              <span className="ws1-score-large ws1-text-warn">{finalScore}</span>
              <span className="ws1-score-denom">/ 100</span>
            </div>
          </div>

          <div className="ws1-outcome-kpi">
            <span className="ws1-outcome-kpi-label">FINAL LATENCY</span>
            <span className="ws1-outcome-kpi-val ws1-text-red">
              {finalLatency.toFixed(2)}s (EXCEEDED)
            </span>
          </div>

          <div className="ws1-outcome-kpi">
            <span className="ws1-outcome-kpi-label">TOTAL TIME USED</span>
            <span className="ws1-outcome-kpi-val">{timeFormatted}</span>
          </div>

          <div className="ws1-outcome-kpi">
            <span className="ws1-outcome-kpi-label">TOTAL ERRORS</span>
            <span className="ws1-outcome-kpi-val ws1-text-warn">{errors}</span>
          </div>
        </div>

        {/* Modules status */}
        <div className="ws1-breakdown-card">
          <h4 className="ws1-breakdown-title">MODULE COMPLETION AUDIT</h4>
          <div className="ws1-breakdown-grid">
            <div className="ws1-breakdown-item">
              <span className="ws1-bd-name">MODULE A: RACE BRIEFING</span>
              <span
                className={`ws1-bd-status ${
                  scoreData?.moduleA?.completed ? "ws1-text-green" : "ws1-text-red"
                }`}
              >
                {scoreData?.moduleA?.completed ? "✓ COMPLETED" : "✕ INCOMPLETE"} (
                {scoreData?.moduleA?.score ?? 0} pts)
              </span>
            </div>

            <div className="ws1-breakdown-item">
              <span className="ws1-bd-name">MODULE B: CDN TRAFFIC CONTROL</span>
              <span
                className={`ws1-bd-status ${
                  scoreData?.moduleB?.completed ? "ws1-text-green" : "ws1-text-red"
                }`}
              >
                {scoreData?.moduleB?.completed ? "✓ COMPLETED" : "✕ INCOMPLETE"} (
                {scoreData?.moduleB?.score ?? 0} pts)
              </span>
            </div>

            <div className="ws1-breakdown-item">
              <span className="ws1-bd-name">MODULE C: FINAL BROADCAST OPTIMIZATION</span>
              <span
                className={`ws1-bd-status ${
                  scoreData?.moduleC?.completed ? "ws1-text-green" : "ws1-text-red"
                }`}
              >
                {scoreData?.moduleC?.completed ? "✓ COMPLETED" : "✕ INCOMPLETE"} (
                {scoreData?.moduleC?.score ?? 0} pts)
              </span>
            </div>
          </div>

          <div className="ws1-audit-meta-row">
            <span>
              COMPLETED MODULES: <strong>{completedModules.length > 0 ? completedModules.join(", ") : "NONE"}</strong>
            </span>
            <span>HINTS USED: <strong>{hintsUsedCount}</strong></span>
          </div>
        </div>

        <div className="ws1-outcome-actions">
          {onOpenLeaderboard && (
            <button
              type="button"
              className="ws1-header-lb-btn"
              onClick={onOpenLeaderboard}
              style={{ fontSize: "13px", padding: "12px 20px" }}
              id="ws1-timeout-leaderboard-btn"
            >
              <span aria-hidden="true">🏆</span>
              <span>VIEW LEADERBOARD</span>
            </button>
          )}

          <button
            type="button"
            className="ws1-restart-btn"
            onClick={onRestartStation}
          >
            <span className="ws1-restart-icon" aria-hidden="true">↺</span>
            <span>RESTART SHIFT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
