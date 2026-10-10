import { useState } from "react";

export default function StartScreen({ onStartShift, onOpenLeaderboard }) {
  const [operatorName, setOperatorName] = useState(() => {
    return localStorage.getItem("ws4_current_player") || "";
  });
  const [countdown, setCountdown] = useState(null); // null | 3 | 2 | 1 | "START"

  const handleStartClick = () => {
    const finalName = operatorName.trim() || "Operator Alpha";
    localStorage.setItem("ws4_current_player", finalName);

    setCountdown(3);

    const step3 = setTimeout(() => {
      setCountdown(2);
    }, 800);

    const step2 = setTimeout(() => {
      setCountdown(1);
    }, 1600);

    const step1 = setTimeout(() => {
      setCountdown("START");
    }, 2400);

    const stepStart = setTimeout(() => {
      onStartShift(finalName);
    }, 3000);

    return () => {
      clearTimeout(step3);
      clearTimeout(step2);
      clearTimeout(step1);
      clearTimeout(stepStart);
    };
  };

  return (
    <div className="ws4-fullscreen-overlay">
      <div className="ws4-screen-card" id="ws4-start-screen" style={{ maxWidth: "720px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="ws4-screen-badge">AREA51 // HIGH SECURITY ZONE</div>
          {onOpenLeaderboard && (
            <button
              type="button"
              className="ws4-btn ws4-btn-secondary"
              onClick={onOpenLeaderboard}
              style={{ fontSize: "11px", padding: "5px 12px" }}
              id="ws4-start-leaderboard-btn"
            >
              🏆 VIEW WINNERS
            </button>
          )}
        </div>

        <h1 className="ws4-screen-title">
          AREA51 FACILITY LOCKDOWN
        </h1>
        <div style={{ fontSize: "13px", color: "var(--ws4-cyan-accent)", letterSpacing: "1.5px" }}>
          EMERGENCY INTERLOCK SIMULATION
        </div>

        <div className="ws4-divider" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <div className="ws4-stat-box">
            <span className="ws4-stat-title">STATION DESIGNATION</span>
            <span className="ws4-stat-val ws4-green" style={{ fontSize: "15px" }}>STATION 04</span>
          </div>
          <div className="ws4-stat-box">
            <span className="ws4-stat-title">TECHNICAL DOMAIN</span>
            <span className="ws4-stat-val" style={{ fontSize: "13px" }}>DIGITAL LOGIC</span>
          </div>
          <div className="ws4-stat-box">
            <span className="ws4-stat-title">TEAM / DURATION</span>
            <span className="ws4-stat-val" style={{ fontSize: "14px" }}>2–3 / 12:00</span>
          </div>
        </div>

        <div className="ws4-mission-box">
          <div style={{ fontWeight: 800, color: "var(--ws4-neon-green)", marginBottom: "4px" }}>
            OPERATIONAL MISSION:
          </div>
          The facility's primary digital safety interlock has suffered a logic malfunction.
          Diagnose the gate circuit, replace the faulty gate component, calibrate facility tolerance
          parameters, and verify fail-safe emergency controls to authorize the facility.
          The mandatory authorization state is:
          <div
            style={{
              fontWeight: 900,
              color: "#fff",
              marginTop: "4px",
              fontFamily: "monospace",
            }}
          >
            SAFE_OUTPUT = HIGH / 1
          </div>
        </div>

        {/* Player / Team Name Input */}
        <div
          style={{
            background: "#080d14",
            border: "1px solid var(--ws4-border-bright)",
            borderRadius: "4px",
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            textAlign: "left",
          }}
        >
          <label
            htmlFor="ws4-player-name-input"
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--ws4-cyan-accent)",
              letterSpacing: "1px",
            }}
          >
            ENTER OPERATOR OR TEAM NAME (FOR LEADERBOARD & WINNER TRACKING):
          </label>
          <input
            id="ws4-player-name-input"
            type="text"
            className="ws4-btn"
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "14px",
              background: "#03060a",
              color: "#00ff7f",
              border: "1px solid var(--ws4-border-bright)",
              fontFamily: "var(--ws4-font-mono)",
              outline: "none",
              cursor: "text",
            }}
            placeholder="e.g. Agent Carter / Alpha Team / Akash"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            disabled={countdown !== null}
          />
        </div>

        <div className="ws4-divider" />

        {countdown !== null ? (
          <div className="ws4-countdown-display" id="ws4-countdown-num">
            {countdown}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              type="button"
              className="ws4-btn ws4-btn-primary"
              style={{ fontSize: "16px", padding: "14px 36px", letterSpacing: "2px" }}
              onClick={handleStartClick}
              id="ws4-start-shift-btn"
            >
              [ START SHIFT ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
