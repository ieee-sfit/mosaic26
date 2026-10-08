export default function FailureScreen({
  score,
  modulesCompletedCount,
  errors,
  timeUsedSeconds,
  onRestartStation,
}) {
  const safeTime = Math.max(0, Math.floor(timeUsedSeconds));
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="ws4-fullscreen-overlay">
      <div className="ws4-screen-card ws4-alert-failure" id="ws4-failure-screen">
        <div className="ws4-screen-badge" style={{ color: "var(--ws4-crimson-alert)" }}>
          SECURITY ALERT // TIMEOUT PROTOCOL ENGAGED
        </div>
        <h1 className="ws4-screen-title" style={{ color: "var(--ws4-crimson-alert)" }}>
          LOCKDOWN TIMEOUT
        </h1>
        <div style={{ fontSize: "13px", color: "#f87171", letterSpacing: "1px" }}>
          FACILITY REMAINS IN FAIL-SAFE MODE
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

        <div className="ws4-divider" />

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

        <div className="ws4-divider" />

        <button
          type="button"
          className="ws4-btn ws4-btn-danger"
          style={{ fontSize: "15px", padding: "12px 24px" }}
          onClick={onRestartStation}
          id="ws4-restart-station-btn"
        >
          [ RESTART STATION ]
        </button>
      </div>
    </div>
  );
}
