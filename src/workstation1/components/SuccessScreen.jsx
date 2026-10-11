import { downloadResultsAsJSON } from "../utils/resultsManager";

export default function SuccessScreen({
  finalResult,
  scoreData,
  timeRemaining = 0,
  errors = 0,
  hintsUsedCount = 0,
  finalLatency = 1.32,
  operatorName = "Pit Wall Engineer",
  onCompleteStation,
  onOpenLeaderboard,
  onRestartStation,
  onNavigateNext,
}) {
  const safeTime = Math.max(0, timeRemaining);
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const score = scoreData?.totalScore ?? finalResult?.score ?? 0;

  const handleDownload = () => {
    if (finalResult) {
      downloadResultsAsJSON([finalResult]);
    }
  };

  return (
    <div className="ws1-outcome-screen ws1-success-bg">
      <div className="ws1-outcome-card ws1-card-success">
        <div className="ws1-success-crown">
          <span className="ws1-crown-icon" aria-hidden="true">🏁</span>
          <span className="ws1-crown-tag">CHECKERED FLAG • LIVE BROADCAST SAVED</span>
        </div>

        <div className="ws1-outcome-header">
          <h1 className="ws1-outcome-title">F1 0-LAG STREAM</h1>
          <h2 className="ws1-outcome-sub ws1-text-green">BROADCAST RESTORED</h2>
          <div className="ws1-status-pill-big ws1-pill-green">
            FORD VS FERRARI — LIVE WORLD FEED ONLINE
          </div>
        </div>

        {/* Verification Summary Banner */}
        <div className="ws1-outcome-kpi-row">
          <div className="ws1-outcome-kpi ws1-score-kpi">
            <span className="ws1-outcome-kpi-label">FINAL SCORE</span>
            <div className="ws1-score-display">
              <span className="ws1-score-large">{score}</span>
              <span className="ws1-score-denom">/ 100</span>
            </div>
          </div>

          <div className="ws1-outcome-kpi">
            <span className="ws1-outcome-kpi-label">FINAL LATENCY</span>
            <span className="ws1-outcome-kpi-val ws1-text-green">
              {finalLatency.toFixed(2)}s (SUB-1.5s)
            </span>
          </div>

          <div className="ws1-outcome-kpi">
            <span className="ws1-outcome-kpi-label">TIME REMAINING</span>
            <span className="ws1-outcome-kpi-val">{timeFormatted}</span>
          </div>

          <div className="ws1-outcome-kpi">
            <span className="ws1-outcome-kpi-label">NETWORK STATUS</span>
            <span className="ws1-outcome-kpi-val ws1-text-green">OPTIMAL</span>
          </div>
        </div>

        {/* Module Performance Breakdown */}
        <div className="ws1-breakdown-card">
          <h4 className="ws1-breakdown-title">RACE ENGINEERING BREAKDOWN</h4>
          <div className="ws1-breakdown-grid">
            <div className="ws1-breakdown-item">
              <span className="ws1-bd-name">MODULE A: RACE BRIEFING</span>
              <span className="ws1-bd-score">
                {scoreData?.moduleA?.score ?? 20} / 20 pts
              </span>
            </div>
            <div className="ws1-breakdown-item">
              <span className="ws1-bd-name">MODULE B: CDN TRAFFIC CONTROL</span>
              <span className="ws1-bd-score">
                {scoreData?.moduleB?.score ?? 35} / 35 pts
              </span>
            </div>
            <div className="ws1-breakdown-item">
              <span className="ws1-bd-name">MODULE C: FINAL BROADCAST OPTIMIZATION</span>
              <span className="ws1-bd-score">
                {scoreData?.moduleC?.score ?? 45} / 45 pts
              </span>
            </div>
          </div>

          <div className="ws1-audit-meta-row">
            <span>ENGINEER: <strong>{operatorName}</strong></span>
            <span>ERRORS LOGGED: <strong>{errors}</strong></span>
            <span>HINTS USED: <strong>{hintsUsedCount}</strong></span>
          </div>
        </div>

        {/* Status Confirmation Banner */}
        <div
          style={{
            background: "rgba(50, 232, 117, 0.08)",
            border: "1px solid rgba(50, 232, 117, 0.3)",
            borderRadius: "4px",
            padding: "10px 14px",
            fontSize: "11.5px",
            color: "var(--ws1-telemetry-green)",
            fontFamily: "var(--ws1-font-mono)",
            textAlign: "center",
          }}
        >
          ✓ Shift telemetry successfully archived to <code>src/workstation1/results.json</code> & Leaderboard
        </div>

        {/* Action Controls */}
        <div className="ws1-outcome-actions">
          {onOpenLeaderboard && (
            <button
              type="button"
              className="ws1-header-lb-btn"
              onClick={onOpenLeaderboard}
              style={{ fontSize: "13px", padding: "12px 22px" }}
              id="ws1-success-leaderboard-btn"
            >
              <span aria-hidden="true">🏆</span>
              <span>VIEW LEADERBOARD</span>
            </button>
          )}

          <button
            type="button"
            className="ws1-primary-complete-btn"
            onClick={onCompleteStation}
            id="ws1-complete-station-btn"
          >
            <span>COMPLETE STATION</span>
            <span className="ws1-btn-arrow" aria-hidden="true">→</span>
          </button>

          {onNavigateNext && (
            <button
              type="button"
              className="ws1-secondary-nav-btn"
              onClick={onNavigateNext}
              id="ws1-next-station-btn"
            >
              <span>STATION 04: LOGIC INTERLOCK</span>
              <span className="ws1-btn-arrow" aria-hidden="true">→</span>
            </button>
          )}

          {onRestartStation && (
            <button
              type="button"
              className="ws1-restart-shift-btn"
              onClick={onRestartStation}
              id="ws1-success-restart-btn"
            >
              <span aria-hidden="true">↺</span>
              <span>PLAY AGAIN</span>
            </button>
          )}

          <button
            type="button"
            className="ws1-export-json-btn"
            onClick={handleDownload}
            id="ws1-export-json-btn"
          >
            EXPORT TELEMETRY LOG (.JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
