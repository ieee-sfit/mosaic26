export default function ModuleProgress({
  currentModule = "A", // "A" | "B" | "C"
  isModuleACompleted = false,
  isModuleBCompleted = false,
  isModuleCCompleted = false,
  onSelectModule,
}) {
  const modules = [
    {
      id: "A",
      label: "MODULE A",
      name: "SIGNAL PROCESSING KNOWLEDGE",
      duration: "01:30",
      isCompleted: isModuleACompleted,
      isUnlocked: true,
    },
    {
      id: "B",
      label: "MODULE B",
      name: "ANC SIGNAL REPAIR",
      duration: "04:30",
      isCompleted: isModuleBCompleted,
      isUnlocked: isModuleACompleted,
    },
    {
      id: "C",
      label: "MODULE C",
      name: "FINAL CALIBRATION & OPTIMIZATION",
      duration: "06:00",
      isCompleted: isModuleCCompleted,
      isUnlocked: isModuleBCompleted,
    },
  ];

  return (
    <nav className="ws1-module-nav" aria-label="Workstation Module Stepper">
      <div className="ws1-stepper-track">
        {modules.map((mod, index) => {
          const isActive = currentModule === mod.id;
          const isComplete = mod.isCompleted;
          const isLocked = !mod.isUnlocked && !isComplete;

          return (
            <div
              key={mod.id}
              className={`ws1-step-item ${isActive ? "ws1-step-active" : ""} ${
                isComplete ? "ws1-step-completed" : ""
              } ${isLocked ? "ws1-step-locked" : ""}`}
            >
              <button
                type="button"
                className="ws1-step-btn"
                disabled={isLocked}
                onClick={() => onSelectModule && mod.isUnlocked && onSelectModule(mod.id)}
                aria-current={isActive ? "step" : undefined}
                title={
                  isLocked
                    ? `Complete Module ${String.fromCharCode(64 + index)} to unlock`
                    : `Switch to ${mod.label}: ${mod.name}`
                }
              >
                <div className="ws1-step-badge">
                  {isComplete ? (
                    <span className="ws1-check-icon" aria-hidden="true">✓</span>
                  ) : (
                    <span className="ws1-step-letter">{mod.id}</span>
                  )}
                </div>
                <div className="ws1-step-info">
                  <div className="ws1-step-top">
                    <span className="ws1-step-title">{mod.label}</span>
                    <span className="ws1-step-duration">({mod.duration})</span>
                  </div>
                  <span className="ws1-step-desc">{mod.name}</span>
                </div>
              </button>

              {index < modules.length - 1 && (
                <div
                  className={`ws1-step-connector ${
                    isComplete ? "ws1-connector-active" : ""
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
