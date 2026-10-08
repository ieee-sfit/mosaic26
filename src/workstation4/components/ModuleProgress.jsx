export default function ModuleProgress({
  currentModule,
  moduleACompleted,
  moduleBCompleted,
  moduleCCompleted,
  score,
  errors,
  onSelectModule,
}) {
  const modules = [
    {
      id: "A",
      tag: "MODULE A",
      name: "Knowledge Verification",
      estTime: "1:30",
      completed: moduleACompleted,
      locked: false,
    },
    {
      id: "B",
      tag: "MODULE B",
      name: "Emergency Circuit Repair",
      estTime: "4:30",
      completed: moduleBCompleted,
      locked: !moduleACompleted,
    },
    {
      id: "C",
      tag: "MODULE C",
      name: "Facility Authorization",
      estTime: "6:00",
      completed: moduleCCompleted,
      locked: !moduleBCompleted,
    },
  ];

  return (
    <div className="ws4-sidebar-left">
      <div className="ws4-panel">
        <div className="ws4-panel-header">
          <span>MISSION PROGRESS</span>
          <span className="ws4-accent">STATION 04</span>
        </div>
        <div className="ws4-panel-content">
          <div className="ws4-module-list">
            {modules.map((m) => {
              const isCurrent = currentModule === m.id;
              let badgeClass = "ws4-badge-locked";
              let badgeText = "LOCKED";

              if (m.completed) {
                badgeClass = "ws4-badge-done";
                badgeText = "✓ VERIFIED";
              } else if (isCurrent) {
                badgeClass = "ws4-badge-active";
                badgeText = "● ACTIVE";
              }

              return (
                <div
                  key={m.id}
                  className={`ws4-module-item ${
                    isCurrent ? "ws4-current" : ""
                  } ${m.completed ? "ws4-done" : ""} ${m.locked ? "ws4-locked" : ""}`}
                  onClick={() => {
                    if (!m.locked && onSelectModule) {
                      onSelectModule(m.id);
                    }
                  }}
                  role="button"
                  tabIndex={m.locked ? -1 : 0}
                  aria-disabled={m.locked}
                  style={{ cursor: m.locked ? "not-allowed" : "pointer" }}
                >
                  <div className="ws4-mod-top">
                    <span className="ws4-mod-tag">{m.tag}</span>
                    <span className={`ws4-mod-badge ${badgeClass}`}>{badgeText}</span>
                  </div>
                  <span className="ws4-mod-name">{m.name}</span>
                </div>
              );
            })}
          </div>

          <div className="ws4-stats-grid">
            <div className="ws4-stat-box">
              <span className="ws4-stat-title">SCORE</span>
              <span className="ws4-stat-val ws4-green" id="ws4-stat-score">
                {score} <span style={{ fontSize: "11px", color: "#8b9bb4" }}>/100</span>
              </span>
            </div>

            <div className="ws4-stat-box">
              <span className="ws4-stat-title">ERRORS</span>
              <span className={`ws4-stat-val ${errors > 0 ? "ws4-red" : ""}`} id="ws4-stat-errors">
                {errors}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
