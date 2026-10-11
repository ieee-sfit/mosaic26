export default function SuccessScreen({
  score,
  maxScore = 100,
  timeRemaining,
  errors,
  hintsUsedCount,
  playerName = "Operator Alpha",
  onRestartStation,
  onOpenStationChooser,
  onOpenLeaderboard,
  onExportJSON,
}) {
  const safeTime = Math.max(0, Math.floor(timeRemaining));
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      className="ws4-fullscreen-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        background: "rgba(2, 6, 8, 0.96)",
      }}
    >
      {/* Dynamic Pure CSS Rotating Sunburst & Shockwave in Success Screen */}
      <div className="ws4-sunburst-layer" style={{ opacity: 0.35 }} />
      <div className="ws4-victory-shockwave" style={{ opacity: 0.5 }} />

      <div
        className="ws4-screen-card ws4-alert-success"
        id="ws4-success-screen"
        style={{
          maxWidth: "720px",
          position: "relative",
          zIndex: 10,
          border: "2px solid #ffd700",
          boxShadow: "0 0 60px rgba(0, 255, 127, 0.4), 0 0 40px rgba(255, 215, 0, 0.3)",
        }}
      >
        {/* Animated Laurel Shield Badge in Success Screen */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div className="ws4-victory-emblem-wrap" style={{ width: "90px", height: "90px" }}>
            <svg width="65" height="75" viewBox="0 0 100 110" fill="none">
              <defs>
                <linearGradient id="succShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ff7f" />
                  <stop offset="50%" stopColor="#00aa55" />
                  <stop offset="100%" stopColor="#002412" />
                </linearGradient>
              </defs>
              <path
                d="M50 5 L88 22 C88 65, 50 98, 50 98 C50 98, 12 65, 12 22 Z"
                fill="url(#succShieldGrad)"
                stroke="#ffd700"
                strokeWidth="5"
              />
              <polygon
                points="50,28 55,42 70,42 58,52 62,66 50,57 38,66 42,52 30,42 45,42"
                fill="#ffd700"
              />
              <path
                d="M38 52 L47 61 L64 43"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="ws4-screen-badge" style={{ color: "#ffd700", border: "1px solid #ffd700", background: "rgba(255, 215, 0, 0.1)" }}>
          ★ MISSION ACCOMPLISHED ★
        </div>
        <h1 className="ws4-screen-title" style={{ color: "var(--ws4-neon-green)", textShadow: "0 0 25px rgba(0, 255, 127, 0.8), 0 0 15px #ffd700" }}>
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
          </tbody>
        </table>


        <div className="ws4-divider" />

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          {onOpenLeaderboard && (
            <button
              type="button"
              className="ws4-btn ws4-btn-secondary"
              style={{ fontSize: "14px", padding: "12px 24px" }}
              onClick={onOpenLeaderboard}
              id="ws4-success-leaderboard-btn"
            >
              🏆 VIEW WINNERS & LEADERBOARD
            </button>
          )}

          <button
            type="button"
            className="ws4-btn ws4-btn-primary"
            style={{ fontSize: "14px", padding: "12px 28px", fontWeight: 900 }}
            onClick={onOpenStationChooser || onRestartStation}
            id="ws4-complete-station-btn"
          >
            ➔ CHOOSE NEXT STATION
          </button>
        </div>
      </div>
    </div>
  );
}
