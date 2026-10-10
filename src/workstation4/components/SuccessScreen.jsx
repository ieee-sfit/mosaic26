export default function SuccessScreen({
  score,
  maxScore = 100,
  timeRemaining,
  errors,
  hintsUsedCount,
  playerName = "Operator Alpha",
  onCompleteStation,
  onOpenLeaderboard,
  onExportJSON,
}) {
  const safeTime = Math.max(0, Math.floor(timeRemaining));
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="ws4-fullscreen-overlay">
      <div className="ws4-screen-card ws4-alert-success" id="ws4-success-screen" style={{ maxWidth: "700px" }}>
        <div className="ws4-screen-badge" style={{ color: "var(--ws4-neon-green)" }}>
          MISSION ACCOMPLISHED // AUTHORIZATION GRANTED
        </div>
        <h1 className="ws4-screen-title" style={{ color: "var(--ws4-neon-green)" }}>
          AREA51 FACILITY LOCKDOWN
        </h1>

        <div style={{ fontSize: "14px", color: "var(--ws4-cyan-accent)", fontWeight: 700 }}>
          OPERATOR: <span style={{ color: "#fff" }}>{playerName}</span>
        </div>

        <div className="ws4-divider" />

        <div
          style={{
            background: "#04080a",
            border: "1px solid var(--ws4-neon-green-dim)",
            padding: "16px",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>
            FACILITY LOCKDOWN VERIFIED
          </div>

          <div style={{ display: "flex", justifyContent: "space-around", marginTop: "4px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "var(--ws4-text-secondary)" }}>SAFETY OUTPUT</div>
              <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--ws4-neon-green)" }}>
                HIGH / 1
              </div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--ws4-text-secondary)" }}>STATUS</div>
              <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--ws4-neon-green)" }}>
                SAFE
              </div>
            </div>
          </div>
        </div>

        <table className="ws4-results-table">
          <tbody>
            <tr>
              <td>TEAM FINAL SCORE</td>
              <td style={{ color: "var(--ws4-neon-green)", fontSize: "20px" }}>
                {score} / {maxScore}
              </td>
            </tr>
            <tr>
              <td>TIME REMAINING</td>
              <td style={{ color: "var(--ws4-cyan-accent)" }}>{formattedTime}</td>
            </tr>
            <tr>
              <td>LOGIC & PROTOCOL ERRORS</td>
              <td style={{ color: errors > 0 ? "var(--ws4-crimson-alert)" : "#fff" }}>
                {errors}
              </td>
            </tr>
            <tr>
              <td>ADVISORY HINTS ACCESSED</td>
              <td>{hintsUsedCount}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            background: "rgba(0, 229, 255, 0.08)",
            border: "1px solid var(--ws4-cyan-dim)",
            borderRadius: "4px",
            padding: "8px 12px",
            fontSize: "11px",
            color: "var(--ws4-cyan-accent)",
          }}
        >
          ✓ Result automatically saved to <code>src/workstation4/results.json</code>
        </div>

        <div className="ws4-divider" />

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          {onOpenLeaderboard && (
            <button
              type="button"
              className="ws4-btn ws4-btn-secondary"
              style={{ fontSize: "13px", padding: "10px 18px" }}
              onClick={onOpenLeaderboard}
              id="ws4-success-leaderboard-btn"
            >
              🏆 VIEW WINNERS & LEADERBOARD
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
            className="ws4-btn ws4-btn-primary"
            style={{ fontSize: "14px", padding: "10px 22px" }}
            onClick={onCompleteStation}
            id="ws4-complete-station-btn"
          >
            [ NEXT / RESTART STATION ]
          </button>
        </div>
      </div>
    </div>
  );
}
