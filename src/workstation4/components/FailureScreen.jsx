import { useMemo } from "react";

export default function FailureScreen({
  score,
  maxScore = 100,
  modulesCompletedCount,
  errors,
  timeUsedSeconds,
  playerName = "Operator Alpha",
  onRestartStation,
  onOpenStationChooser,
  onOpenLeaderboard,
}) {
  const safeTime = Math.max(0, Math.floor(timeUsedSeconds));
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Pre-generate crimson/amber spark particles for alarm bursts
  const alarmSparks = useMemo(() => {
    const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const clusters = [
      { top: "22%", left: "18%", color: "#ff3344" },
      { top: "25%", left: "82%", color: "#ffb020" },
      { top: "70%", left: "16%", color: "#ff3344" },
      { top: "72%", left: "84%", color: "#ff5500" },
    ];
    return clusters.map((c, cIdx) => ({
      ...c,
      sparks: angles.map((deg, sIdx) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 55 + ((sIdx * 15) % 45);
        return {
          dx: `${Math.cos(rad) * dist}px`,
          dy: `${Math.sin(rad) * dist}px`,
          size: `${4 + (sIdx % 3)}px`,
          duration: `${1.1 + (sIdx % 4) * 0.15}s`,
          delay: `${(sIdx % 3) * 0.15}s`,
        };
      }),
    }));
  }, []);

  return (
    <div
      className="ws4-fullscreen-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        background: "radial-gradient(ellipse at center, #180407 0%, #0d0204 45%, #050102 85%, #000000 100%)",
      }}
    >
      {/* Rotating Crimson & Amber Warning Sunburst Rays */}
      <div className="ws4-timeout-sunburst-layer" />
      <div className="ws4-timeout-sunburst-layer-secondary" />

      {/* Emergency Alarm Shockwaves & Red Strobe */}
      <div className="ws4-timeout-shockwave" />
      <div className="ws4-timeout-shockwave ws4-timeout-shockwave-delay" />
      <div className="ws4-siren-strobe" />

      {/* Alarm Spark Bursts */}
      {alarmSparks.map((cluster, cIdx) => (
        <div
          key={cIdx}
          className="ws4-firework-origin"
          style={{ top: cluster.top, left: cluster.left }}
        >
          {cluster.sparks.map((spark, sIdx) => (
            <div
              key={sIdx}
              className="ws4-firework-spark"
              style={{
                "--dx": spark.dx,
                "--dy": spark.dy,
                "--size": spark.size,
                "--duration": spark.duration,
                "--delay": spark.delay,
                "--spark-color": cluster.color,
                "--spark-glow": "#ff3344",
              }}
            />
          ))}
        </div>
      ))}

      <div
        className="ws4-screen-card ws4-alert-failure"
        id="ws4-failure-screen"
        style={{
          maxWidth: "720px",
          position: "relative",
          zIndex: 10,
          border: "2px solid #ff3344",
          boxShadow: "0 0 60px rgba(255, 51, 68, 0.6), 0 0 40px rgba(255, 176, 32, 0.4)",
          background: "rgba(10, 3, 5, 0.94)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Animated Containment Lock Hazard Emblem */}
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <div className="ws4-victory-emblem-wrap" style={{ width: "95px", height: "95px" }}>
            <svg width="72" height="82" viewBox="0 0 100 110" fill="none">
              <defs>
                <linearGradient id="failShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff3344" />
                  <stop offset="50%" stopColor="#aa1122" />
                  <stop offset="100%" stopColor="#3d050c" />
                </linearGradient>
              </defs>
              <path
                d="M50 5 L88 22 C88 65, 50 98, 50 98 C50 98, 12 65, 12 22 Z"
                fill="url(#failShieldGrad)"
                stroke="#ff3344"
                strokeWidth="5"
                filter="drop-shadow(0 0 12px rgba(255, 51, 68, 0.8))"
              />
              {/* Caution Exclamation & Lock Mark */}
              <line x1="50" y1="28" x2="50" y2="58" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
              <circle cx="50" cy="74" r="4.5" fill="#ffffff" />
            </svg>
          </div>
        </div>

        {/* 3D Emergency Lockdown Banner */}
        <div className="ws4-timeout-banner">
          <h1 className="ws4-timeout-banner-text">
            ⚠ LOCKDOWN TIMEOUT ⚠
          </h1>
        </div>

        <div style={{ fontSize: "13px", color: "var(--ws4-amber-warn)", fontWeight: 800, letterSpacing: "1.5px" }}>
          SECURITY ALERT // EMERGENCY TIMEOUT PROTOCOL ENGAGED
        </div>

        <div style={{ fontSize: "14px", color: "var(--ws4-text-secondary)", fontWeight: 700 }}>
          OPERATOR: <span style={{ color: "#fff" }}>{playerName}</span>
        </div>

        <div className="ws4-divider" />

        <div
          style={{
            background: "rgba(35, 7, 12, 0.8)",
            border: "1px solid var(--ws4-crimson-dim)",
            padding: "14px 18px",
            borderRadius: "6px",
            fontSize: "12.5px",
            lineHeight: "1.5",
            color: "#fca5a5",
            boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.8)",
          }}
        >
          The 12:00 emergency countdown expired before interlock validation and clearance could be finalized.
          Under fail-safe engineering design, all digital interlocks have defaulted to the de-energized shutdown state.
        </div>

        <table className="ws4-results-table">
          <tbody>
            <tr>
              <td>FINAL ACCUMULATED SCORE</td>
              <td style={{ color: "var(--ws4-amber-warn)", fontSize: "20px", fontWeight: 900 }}>
                {score} / {maxScore}
              </td>
            </tr>
            <tr>
              <td>MODULES COMPLETED</td>
              <td style={{ color: "#fff", fontWeight: 800 }}>{modulesCompletedCount} OF 3</td>
            </tr>
            <tr>
              <td>TOTAL TIME USED</td>
              <td style={{ color: "var(--ws4-cyan-accent)", fontWeight: 800 }}>{formattedTime}</td>
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
            >
              🏆 VIEW LEADERBOARD
            </button>
          )}

          <button
            type="button"
            className="ws4-btn ws4-btn-danger"
            style={{ fontSize: "14px", padding: "12px 26px", fontWeight: 900 }}
            onClick={onRestartStation}
            id="ws4-restart-station-btn"
          >
            ↺ RESTART STATION
          </button>

          {onOpenStationChooser && (
            <button
              type="button"
              className="ws4-btn ws4-btn-primary"
              style={{ fontSize: "14px", padding: "12px 26px", fontWeight: 900 }}
              onClick={onOpenStationChooser}
              id="ws4-failure-choose-station-btn"
            >
              ➔ CHOOSE NEXT STATION
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

