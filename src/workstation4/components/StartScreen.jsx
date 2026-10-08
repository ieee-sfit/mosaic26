import { useState } from "react";

export default function StartScreen({ onStartShift }) {
  const [countdown, setCountdown] = useState(null); // null | 3 | 2 | 1 | "START"

  const handleStartClick = () => {
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
      onStartShift();
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
      <div className="ws4-screen-card" id="ws4-start-screen">
        <div className="ws4-screen-badge">AREA51 // HIGH SECURITY ZONE</div>
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

        <div className="ws4-divider" />

        {countdown !== null ? (
          <div className="ws4-countdown-display" id="ws4-countdown-num">
            {countdown}
          </div>
        ) : (
          <button
            type="button"
            className="ws4-btn ws4-btn-primary"
            style={{ fontSize: "16px", padding: "14px 28px", letterSpacing: "2px" }}
            onClick={handleStartClick}
            id="ws4-start-shift-btn"
          >
            [ START SHIFT ]
          </button>
        )}
      </div>
    </div>
  );
}
