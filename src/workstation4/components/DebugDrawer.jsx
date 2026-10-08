export default function DebugDrawer({
  isOpen,
  onClose,
  onSkipModuleA,
  onResetTimer,
  onSetTimerShort,
  onAutoSolveCircuit,
  onSetAllTolerancesSafe,
  onToggleBypass,
  onTriggerWrongPasscode,
  onTriggerSuccess,
  onTriggerTimeout,
  onResetStorage,
}) {
  if (!isOpen) return null;

  return (
    <div className="ws4-debug-drawer" id="ws4-debug-drawer">
      <div className="ws4-debug-header">
        <span>⚙ EVENT ORGANIZER DEBUG CONSOLE</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--ws4-amber-warn)",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          [ ✕ CLOSE ]
        </button>
      </div>

      <div style={{ fontSize: "10px", color: "var(--ws4-text-secondary)" }}>
        Shortcut: <code>Ctrl + Shift + D</code>. Internal testing & facilitator controls.
      </div>

      <div className="ws4-debug-actions-grid">
        <button type="button" className="ws4-debug-btn" onClick={onSkipModuleA}>
          ⏩ Skip Module A
        </button>

        <button type="button" className="ws4-debug-btn" onClick={onAutoSolveCircuit}>
          ⚡ Auto-Solve Circuit (AND)
        </button>

        <button type="button" className="ws4-debug-btn" onClick={onSetAllTolerancesSafe}>
          🎯 Set Tolerances Safe
        </button>

        <button type="button" className="ws4-debug-btn" onClick={onResetTimer}>
          ⏱ Reset Timer (12:00)
        </button>

        <button type="button" className="ws4-debug-btn" onClick={onSetTimerShort}>
          ⏳ Set Timer to 10s
        </button>

        <button type="button" className="ws4-debug-btn" onClick={onToggleBypass}>
          ⚠️ Toggle Bypass Switch
        </button>

        <button type="button" className="ws4-debug-btn" onClick={onTriggerWrongPasscode}>
          ❌ Test Wrong Passcode
        </button>

        <button type="button" className="ws4-debug-btn" onClick={onTriggerSuccess}>
          🏆 Force Success Screen
        </button>

        <button type="button" className="ws4-debug-btn" onClick={onTriggerTimeout}>
          💥 Force Timeout Screen
        </button>

        <button
          type="button"
          className="ws4-debug-btn"
          style={{ color: "var(--ws4-crimson-alert)" }}
          onClick={onResetStorage}
        >
          🗑 Reset localStorage
        </button>
      </div>
    </div>
  );
}
