import { useState, useEffect, useMemo } from "react";

export default function MissionEndingSequence({ onComplete, clearanceCode = "1947", playerName = "Operator Alpha" }) {
  const [step, setStep] = useState(0);

  const steps = [
    { title: "FAIL-SAFE PROTOCOLS", desc: "All 5 supervisory check questions verified" },
    { title: "SECURITY CLEARANCE", desc: `Code [ ${clearanceCode} ] authenticated by facility mainframe` },
    { title: "LOGIC GATES REPAIRED", desc: "Dual AND-gate interlock holding SAFE_OUTPUT = HIGH (1)" },
    { title: "EMERGENCY CLEARED", desc: "Area 51 facility secured. Crisis neutralized." },
  ];

  // Pre-generate deterministic particle coordinates for pure CSS firework bursts
  const fireworkClusters = useMemo(() => {
    const clusters = [
      { top: "20%", left: "18%", color: "#ffd700", glow: "#fff", delay: "0s" },
      { top: "25%", left: "82%", color: "#00ff7f", glow: "#00e5ff", delay: "0.3s" },
      { top: "68%", left: "15%", color: "#00e5ff", glow: "#ffd700", delay: "0.6s" },
      { top: "72%", left: "85%", color: "#ffb020", glow: "#ff3344", delay: "0.2s" },
      { top: "45%", left: "50%", color: "#ffd700", glow: "#00ff7f", delay: "0.5s" },
    ];

    const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    return clusters.map((c, cIdx) => ({
      ...c,
      sparks: angles.map((deg, sIdx) => {
        const rad = (deg * Math.PI) / 180;
        const dist = 60 + ((sIdx * 17) % 55);
        return {
          dx: `${Math.cos(rad) * dist}px`,
          dy: `${Math.sin(rad) * dist}px`,
          size: `${4 + (sIdx % 4)}px`,
          duration: `${1.1 + (sIdx % 5) * 0.15}s`,
          delay: `${(sIdx % 3) * 0.15}s`,
        };
      }),
    }));
  }, []);

  // Floating sparkle stars in the background
  const sparkleStars = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      top: `${(i * 19) % 94}%`,
      left: `${(i * 29) % 94}%`,
      delay: `${(i * 0.23).toFixed(2)}s`,
      size: 14 + (i % 3) * 6,
      color: i % 3 === 0 ? "#ffd700" : i % 2 === 0 ? "#00ff7f" : "#00e5ff",
    }));
  }, []);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 500);
    const timer2 = setTimeout(() => setStep(2), 1000);
    const timer3 = setTimeout(() => setStep(3), 1500);
    const timer4 = setTimeout(() => setStep(4), 2000);
    const timer5 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3800);

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
        background: "radial-gradient(ellipse at center, #051a14 0%, #03100c 45%, #010606 85%, #000000 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflow: "hidden",
        animation: "ws4FadeIn 0.4s ease-out",
      }}
    >
      {/* Dynamic Rotating Sunburst Beam Layers (Pure CSS Conic Gradient) */}
      <div className="ws4-sunburst-layer" />
      <div className="ws4-sunburst-layer-secondary" />

      {/* Expanding Concentric Shockwaves */}
      <div className="ws4-victory-shockwave" />
      <div className="ws4-victory-shockwave ws4-victory-shockwave-delay" />

      {/* Background Animated Cyber Scanlines & Matrix Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0, 255, 127, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 127, 0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Starburst Firework Particle Clusters */}
      {fireworkClusters.map((cluster, cIdx) => (
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
                "--spark-glow": cluster.glow,
              }}
            />
          ))}
        </div>
      ))}

      {/* Floating Sparkle Stars */}
      {sparkleStars.map((star, sIdx) => (
        <div
          key={sIdx}
          className="ws4-sparkle-star"
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
          }}
        >
          <svg width={star.size} height={star.size} viewBox="0 0 24 24" fill={star.color}>
            <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" />
          </svg>
        </div>
      ))}

      {/* Main Celebratory Modal Card */}
      <div
        style={{
          maxWidth: "680px",
          width: "100%",
          background: "rgba(4, 12, 10, 0.94)",
          border: "2px solid #ffd700",
          boxShadow:
            "0 0 60px rgba(0, 255, 127, 0.45), 0 0 100px rgba(255, 215, 0, 0.35), inset 0 0 35px rgba(0, 255, 127, 0.15)",
          borderRadius: "10px",
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          position: "relative",
          zIndex: 2,
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Heraldic Crest Emblem with Golden Laurel Wings (Pure SVG/CSS) */}
        <div className="ws4-victory-emblem-wrap">
          <svg className="ws4-emblem-wings" viewBox="0 0 160 160" fill="none">
            {/* Left Laurel Leaves */}
            <path
              d="M30 115 C20 90, 25 50, 50 35 C42 55, 45 85, 55 105 Z"
              fill="url(#laurelGold)"
              filter="drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))"
            />
            <path
              d="M18 95 C12 75, 18 45, 38 32 C32 50, 35 75, 42 90 Z"
              fill="url(#laurelGold)"
              opacity="0.8"
            />
            {/* Right Laurel Leaves */}
            <path
              d="M130 115 C140 90, 135 50, 110 35 C118 55, 115 85, 105 105 Z"
              fill="url(#laurelGold)"
              filter="drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))"
            />
            <path
              d="M142 95 C148 75, 142 45, 122 32 C128 50, 125 75, 118 90 Z"
              fill="url(#laurelGold)"
              opacity="0.8"
            />
            <defs>
              <linearGradient id="laurelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff275" />
                <stop offset="50%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#cc9900" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Heraldic Shield */}
          <svg width="100" height="110" viewBox="0 0 100 110" fill="none">
            <defs>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00ff7f" />
                <stop offset="35%" stopColor="#00aa55" />
                <stop offset="70%" stopColor="#00552b" />
                <stop offset="100%" stopColor="#002412" />
              </linearGradient>
              <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#ffd700" />
                <stop offset="70%" stopColor="#ffaa00" />
                <stop offset="100%" stopColor="#ffd700" />
              </linearGradient>
            </defs>
            <path
              d="M50 5 L88 22 C88 65, 50 98, 50 98 C50 98, 12 65, 12 22 Z"
              fill="url(#shieldGrad)"
              stroke="url(#shieldBorder)"
              strokeWidth="5"
            />
            {/* Inner Star Symbol */}
            <polygon
              points="50,28 55,42 70,42 58,52 62,66 50,57 38,66 42,52 30,42 45,42"
              fill="#ffd700"
              filter="drop-shadow(0 0 8px #ffffff)"
            />
            {/* Victory Checkmark */}
            <path
              d="M38 52 L47 61 L64 43"
              stroke="#ffffff"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 3D Shimmering Victory Ribbon Banner */}
        <div className="ws4-victory-banner">
          <h1 className="ws4-victory-banner-text">
            ★ FACILITY LOCKDOWN AUTHORIZED ★
          </h1>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 800,
              color: "#00e5ff",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            OPERATOR [{playerName}] // FULL SYSTEM OVERRIDE SUCCESSFUL
          </div>
        </div>

        {/* Sequencing Checkmarks */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "rgba(2, 6, 8, 0.9)",
            border: "1px solid rgba(0, 255, 127, 0.3)",
            borderRadius: "6px",
            padding: "16px 20px",
            boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.8)",
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
                  fontSize: "12.5px",
                  padding: "7px 12px",
                  borderRadius: "4px",
                  background: isDone ? "rgba(0, 255, 127, 0.12)" : "transparent",
                  border: isDone ? "1px solid rgba(0, 255, 127, 0.45)" : "1px solid transparent",
                  transition: "all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
                  opacity: isDone ? 1 : 0.35,
                  transform: isDone ? "scale(1)" : "scale(0.98)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      color: isDone ? "#ffd700" : "#475569",
                      fontWeight: 900,
                      fontSize: "14px",
                      textShadow: isDone ? "0 0 10px #ffd700" : "none",
                    }}
                  >
                    {isDone ? "✓" : "○"}
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: isDone ? "#ffffff" : "#64748b",
                      letterSpacing: "0.8px",
                    }}
                  >
                    {s.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    color: isDone ? "#00e5ff" : "#475569",
                    fontWeight: 600,
                  }}
                >
                  {s.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* Dynamic Status / Ticker */}
        <div
          style={{
            fontSize: "13px",
            fontWeight: 900,
            color: step >= 4 ? "#ffd700" : "#00ff7f",
            letterSpacing: "2px",
            textAlign: "center",
            textShadow: step >= 4 ? "0 0 12px #ffd700" : "0 0 8px #00ff7f",
          }}
        >
          {step < 4 ? "EXECUTING REBOOT SEQUENCE..." : "ALL CRITERIA NOMINAL // LOADING FINAL MISSION SCORE..."}
        </div>
      </div>
    </div>
  );
}

