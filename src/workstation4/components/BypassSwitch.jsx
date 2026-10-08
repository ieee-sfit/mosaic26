export default function BypassSwitch({ isBypassActive, onToggleBypass }) {
  return (
    <div
      className={`ws4-bypass-container ${isBypassActive ? "ws4-bypass-tripped" : ""}`}
      id="ws4-bypass-panel"
    >
      <div className="ws4-bypass-header">
        <span>⚠ EMERGENCY SAFETY BYPASS</span>
        <span>FAIL-SAFE INTERLOCK</span>
      </div>

      <div style={{ fontSize: "11px", color: "#d1d8e0", lineHeight: "1.4" }}>
        {isBypassActive ? (
          <span style={{ color: "var(--ws4-crimson-alert)", fontWeight: 800 }}>
            ⚠ SAFETY BYPASS ACTIVE — PRIMARY INTERLOCK FORCED LOW (0). FACILITY CANNOT BE AUTHORIZED WHILE BYPASS IS ENGAGED!
          </span>
        ) : (
          <span>
            Bypass must remain <strong>OFF</strong> during standard facility operation. Engaging the bypass overrides system integrity.
          </span>
        )}
      </div>

      <button
        type="button"
        className={`ws4-bypass-toggle-btn ${isBypassActive ? "ws4-tripped" : ""}`}
        onClick={onToggleBypass}
        aria-pressed={isBypassActive}
        id="ws4-bypass-toggle-btn"
      >
        {isBypassActive ? "⚠ BYPASS IS ENGAGED [ ON ]" : "BYPASS DISABLED [ OFF ]"}
      </button>
    </div>
  );
}
