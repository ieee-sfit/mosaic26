export default function MissionSidebar({
  currentModule = "A", // "A" | "B" | "C"
  isModuleACompleted = false,
  isModuleBCompleted = false,
  isModuleCCompleted = false,
  currentLatency = 2.8,
  targetLatency = 1.5,
  score = 0,
  errors = 0,
  hintsUsedCount = 0,
  onSelectModule,
}) {
  const modules = [
    {
      id: "A",
      label: "MODULE A",
      name: "Race Engineering Briefing",
      duration: "01:30",
      isCompleted: isModuleACompleted,
      isUnlocked: true,
      desc: "CDN fundamentals & latency verification",
    },
    {
      id: "B",
      label: "MODULE B",
      name: "CDN Traffic Control",
      duration: "04:30",
      isCompleted: isModuleBCompleted,
      isUnlocked: isModuleACompleted,
      desc: "Edge server load balancing & route optimization",
    },
    {
      id: "C",
      label: "MODULE C",
      name: "Final Broadcast Optimization",
      duration: "06:00",
      isCompleted: isModuleCCompleted,
      isUnlocked: isModuleBCompleted,
      desc: "Bitrate profile, buffer health & packet loss",
    },
  ];

  const isLatencySafe = currentLatency < targetLatency;

  return (
    <aside className="ws1-sidebar-mission-control" aria-label="Mission Control Sidebar">
      {/* Target Objective Card */}
      <div className="ws1-sidebar-section ws1-objective-card">
        <div className="ws1-sec-header">
          <span className="ws1-sec-icon" aria-hidden="true">🎯</span>
          <span className="ws1-sec-tag">MISSION OBJECTIVE</span>
        </div>
        <p className="ws1-objective-body">
          Reduce glass-to-glass broadcast latency below{" "}
          <strong className="ws1-target-highlight">{targetLatency} seconds</strong> while
          maintaining CDN stability under 2.4M live viewers.
        </p>

        {/* Live Target Gauge Pill */}
        <div className={`ws1-latency-pill-meter ${isLatencySafe ? "ws1-pill-met" : "ws1-pill-unmet"}`}>
          <div className="ws1-pill-row">
            <span className="ws1-pill-title">CURRENT STREAM DELAY:</span>
            <span className="ws1-pill-value">{currentLatency.toFixed(2)}s</span>
          </div>
          <div className="ws1-pill-bar">
            <div
              className="ws1-pill-fill"
              style={{
                width: `${Math.min(100, Math.max(10, (currentLatency / 3.5) * 100))}%`,
              }}
            />
            <div className="ws1-target-threshold-line" title="1.5s Target" />
          </div>
          <div className="ws1-pill-foot">
            <span>TARGET: &lt; 1.50s</span>
            <span>{isLatencySafe ? "✓ TARGET ACHIEVED" : "⚠ CRITICAL DELAY"}</span>
          </div>
        </div>
      </div>

      {/* Module Progress Stepper */}
      <div className="ws1-sidebar-section ws1-stepper-section">
        <div className="ws1-sec-header">
          <span className="ws1-sec-icon" aria-hidden="true">🏁</span>
          <span className="ws1-sec-tag">MISSION MODULES</span>
        </div>

        <div className="ws1-sidebar-modules-list">
          {modules.map((mod, index) => {
            const isActive = currentModule === mod.id;
            const isComplete = mod.isCompleted;
            const isLocked = !mod.isUnlocked && !isComplete;

            return (
              <div
                key={mod.id}
                className={`ws1-side-step ${isActive ? "ws1-step-active" : ""} ${
                  isComplete ? "ws1-step-complete" : ""
                } ${isLocked ? "ws1-step-locked" : ""}`}
              >
                <button
                  type="button"
                  className="ws1-side-step-btn"
                  disabled={isLocked}
                  onClick={() => onSelectModule && mod.isUnlocked && onSelectModule(mod.id)}
                  title={
                    isLocked
                      ? `Complete Module ${String.fromCharCode(64 + index)} first`
                      : `Switch to ${mod.name}`
                  }
                >
                  <div className="ws1-side-step-badge">
                    {isComplete ? "✓" : mod.id}
                  </div>
                  <div className="ws1-side-step-info">
                    <div className="ws1-side-step-top">
                      <span className="ws1-side-step-label">{mod.label}</span>
                      <span className="ws1-side-step-dur">({mod.duration})</span>
                    </div>
                    <span className="ws1-side-step-name">{mod.name}</span>
                    <span className="ws1-side-step-desc">{mod.desc}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Race Telemetry Audit Summary */}
      <div className="ws1-sidebar-section ws1-telemetry-card">
        <div className="ws1-sec-header">
          <span className="ws1-sec-icon" aria-hidden="true">📊</span>
          <span className="ws1-sec-tag">TELEMETRY AUDIT</span>
        </div>

        <div className="ws1-sidebar-kpi-grid">
          <div className="ws1-side-kpi">
            <span className="ws1-side-kpi-label">SCORE</span>
            <span className="ws1-side-kpi-val ws1-val-green">{score} / 100</span>
          </div>
          <div className="ws1-side-kpi">
            <span className="ws1-side-kpi-label">ERRORS</span>
            <span className={`ws1-side-kpi-val ${errors > 0 ? "ws1-val-red" : ""}`}>
              {errors}
            </span>
          </div>
          <div className="ws1-side-kpi">
            <span className="ws1-side-kpi-label">HINTS USED</span>
            <span className="ws1-side-kpi-val">{hintsUsedCount}</span>
          </div>
          <div className="ws1-side-kpi">
            <span className="ws1-side-kpi-label">ACTIVE MODULE</span>
            <span className="ws1-side-kpi-val ws1-val-blue">MOD {currentModule}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
