import { useState, useEffect } from "react";

export default function MissionEndingSequence({ onComplete, clearanceCode = "1947", playerName = "Operator Alpha" }) {
  const [step, setStep] = useState(0);

  const steps = [
    { title: "FAIL-SAFE PROTOCOLS", desc: "All 5 supervisory check questions verified" },
    { title: "SECURITY CLEARANCE", desc: `Code [ ${clearanceCode} ] authenticated by facility mainframe` },
    { title: "LOGIC GATES REPAIRED", desc: "Dual AND-gate interlock holding SAFE_OUTPUT = HIGH (1)" },
    { title: "EMERGENCY CLEARED", desc: "Area 51 facility secured. Crisis neutralized." },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 500);
    const timer2 = setTimeout(() => setStep(2), 1100);
    const timer3 = setTimeout(() => setStep(3), 1700);
    const timer4 = setTimeout(() => setStep(4), 2300);
    const timer5 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(ellipse at center, #05161e 0%, #02060a 70%, #000000 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflow: "hidden",
        animation: "ws4FadeIn 0.4s ease-out",
      }}
    >
      {/* Background Animated Scanlines & Grid Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      {/* Futuristic Radar Rings */}
      <div
        style={{
          position: "absolute",
          width: "480px",
          height: "480px",
          borderRadius: "50%",
          border: "1px solid rgba(0, 255, 127, 0.15)",
          boxShadow: "0 0 40px rgba(0, 255, 127, 0.1)",
          animation: "ws4RadarSpin 6s linear infinite",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          background: "rgba(4, 9, 14, 0.92)",
          border: "2px solid var(--ws4-neon-green)",
          boxShadow: "0 0 40px rgba(0, 255, 127, 0.35), inset 0 0 20px rgba(0, 255, 127, 0.1)",
          borderRadius: "6px",
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Animated Security Icon / Header */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "36px",
              color: "var(--ws4-neon-green)",
              animation: "ws4Bounce 1s infinite alternate",
              marginBottom: "6px",
            }}
          >
            🛡️
          </div>
          <div
            style={{
              color: "var(--ws4-neon-green)",
              fontWeight: 900,
              fontSize: "18px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              textShadow: "0 0 15px rgba(0, 255, 127, 0.8)",
            }}
          >
            FACILITY LOCKDOWN AUTHORIZED
          </div>
          <div style={{ fontSize: "12px", color: "var(--ws4-cyan-accent)", marginTop: "4px", letterSpacing: "1px" }}>
            OPERATOR [{playerName}] // SYSTEM INITIATING FULL SECURE STATE
          </div>
        </div>

        {/* Sequencing Checkmarks */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "#020406",
            border: "1px solid var(--ws4-border-subtle)",
            borderRadius: "4px",
            padding: "16px",
          }}
        >
          {steps.map((s, idx) => {
            const isDone = step > idx;
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  padding: "6px 10px",
                  borderRadius: "3px",
                  background: isDone ? "rgba(0, 255, 127, 0.08)" : "transparent",
                  border: isDone ? "1px solid rgba(0, 255, 127, 0.3)" : "1px solid transparent",
                  transition: "all 0.35s ease",
                  opacity: isDone ? 1 : 0.3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      color: isDone ? "var(--ws4-neon-green)" : "#475569",
                      fontWeight: 900,
                    }}
                  >
                    {isDone ? "✓" : "○"}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: isDone ? "#fff" : "#64748b",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {s.title}
                  </span>
                </div>
                <span style={{ fontSize: "10.5px", color: isDone ? "var(--ws4-cyan-accent)" : "#475569" }}>
                  {s.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Status Indicator */}
        <div
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: step >= 4 ? "var(--ws4-neon-green)" : "var(--ws4-cyan-accent)",
            letterSpacing: "1px",
            textAlign: "center",
          }}
        >
          {step < 4 ? "EXECUTING REBOOT SEQUENCE..." : "ALL CRITERIA NOMINAL // LOADING MISSION RESULTS..."}
        </div>
      </div>
    </div>
  );
}
