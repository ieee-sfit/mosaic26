export default function FailureScreen({
  score,
  modulesCompletedCount,
  errors,
  timeUsedSeconds,
  playerName = "Operator Alpha",
  onRestartStation,
  onOpenLeaderboard,
  onExportJSON,
}) {
  const safeTime = Math.max(0, Math.floor(timeUsedSeconds));
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="ws4-fullscreen-overlay">
      <div className="ws4-screen-card ws4-alert-failure" id="ws4-failure-screen" style={{ maxWidth: "700px" }}>
        <div className="ws4-screen-badge" style={{ color: "var(--ws4-crimson-alert)" }}>
          SECURITY ALERT // TIMEOUT PROTOCOL ENGAGED
        </div>
        <h1 className="ws4-screen-title" style={{ color: "var(--ws4-crimson-alert)" }}>
          LOCKDOWN TIMEOUT
        </h1>

        <div style={{ fontSize: "14px", color: "var(--ws4-text-secondary)", fontWeight: 700 }}>
          OPERATOR: <span style={{ color: "#fff" }}>{playerName}</span>
        </div>

        <div className="ws4-divider" />

        <div
          style={{
            background: "#120609",
            border: "1px solid var(--ws4-crimson-dim)",
            padding: "14px",
            borderRadius: "4px",
            fontSize: "12px",
            lineHeight: "1.4",
            color: "#fca5a5",
          }}
        >
          The 12:00 emergency countdown expired before interlock validation and clearance could be finalized.
          Under fail-safe engineering design, all digital interlocks have defaulted to the de-energized shutdown state.
        </div>

        <table className="ws4-results-table">
          <tbody>
            <tr>
              <td>FINAL ACCUMULATED SCORE</td>
              <td style={{ color: "var(--ws4-amber-warn)", fontSize: "18px" }}>
                {score} / 100
              </td>
            </tr>
            <tr>
              <td>MODULES COMPLETED</td>
              <td style={{ color: "#fff" }}>{modulesCompletedCount} OF 3</td>
            </tr>
            <tr>
              <td>LOGIC & PROTOCOL ERRORS</td>
              <td style={{ color: "var(--ws4-crimson-alert)" }}>{errors}</td>
            </tr>
            <tr>
              <td>TOTAL TIME USED</td>
              <td style={{ color: "var(--ws4-cyan-accent)" }}>{formattedTime}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            background: "rgba(255, 51, 68, 0.08)",
            border: "1px solid var(--ws4-crimson-dim)",
            borderRadius: "4px",
            padding: "8px 12px",
            fontSize: "11px",
            color: "#fca5a5",
          }}
        >
          ✓ Timeout result saved to <code>src/workstation4/results.json</code>
        </div>

        <div className="ws4-divider" />

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          {onOpenLeaderboard && (
            <button
              type="button"
              className="ws4-btn ws4-btn-secondary"
              style={{ fontSize: "13px", padding: "10px 18px" }}
              onClick={onOpenLeaderboard}
            >
              🏆 VIEW LEADERBOARD
            </button>
          )}

          {onExportJSON && (
            <button
              type="button"
              className="ws4-btn ws4-btn-secondary"
              style={{ fontSize: "13px", padding: "10px 18px" }}
              onClick={onExportJSON}
            >
              📥 EXPORT JSON
            </button>
          )}

          <button
            type="button"
            className="ws4-btn ws4-btn-danger"
            style={{ fontSize: "14px", padding: "10px 22px" }}
            onClick={onRestartStation}
            id="ws4-restart-station-btn"
          >
            [ RESTART STATION ]
          </button>
        </div>
      </div>
    </div>
  );
}
