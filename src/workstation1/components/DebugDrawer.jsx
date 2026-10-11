export default function DebugDrawer({
  isOpen,
  onClose,
  onSkipModuleA,
  onAutoBalanceB,
  onAutoOptimizeC,
  onSetTimer,
  onTriggerSuccess,
  onTriggerTimeout,
  onResetStation,
  currentModule,
  timeRemaining,
  score,
}) {
  if (!isOpen) return null;

  return (
    <div className="ws1-debug-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="ws1-debug-drawer-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Organizer Diagnostic Drawer"
      >
        <div className="ws1-debug-header">
          <div className="ws1-debug-title-wrap">
            <span className="ws1-debug-icon" aria-hidden="true">🛠</span>
            <span className="ws1-debug-title">F1 0-LAG STREAM DEV CONSOLE</span>
          </div>
          <button type="button" className="ws1-debug-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ws1-debug-body">
          <div className="ws1-debug-status-summary">
            <div>MODULE: <strong>{currentModule}</strong></div>
            <div>TIMER: <strong>{timeRemaining}s</strong></div>
            <div>SCORE: <strong>{score}</strong></div>
          </div>

          <div className="ws1-debug-section">
            <h5 className="ws1-debug-sec-title">MODULE WORKFLOW</h5>
            <div className="ws1-debug-btn-grid">
              <button
                type="button"
                className="ws1-dbg-btn"
                onClick={() => {
                  onSkipModuleA();
                  onClose();
                }}
              >
                ⏩ Skip Module A (Briefing)
              </button>
              <button
                type="button"
                className="ws1-dbg-btn"
                onClick={() => {
                  onAutoBalanceB();
                  onClose();
                }}
              >
                🎯 Auto-Balance CDN Traffic (35% EU, 30% NA, 18% AS, 12% SA, 5% ORG)
              </button>
              <button
                type="button"
                className="ws1-dbg-btn"
                onClick={() => {
                  onAutoOptimizeC();
                  onClose();
                }}
              >
                🎯 Auto-Optimize Module C (4Mbps, 1.8s Buffer, CMAF FEC)
              </button>
            </div>
          </div>

          <div className="ws1-debug-section">
            <h5 className="ws1-debug-sec-title">RACE CLOCK CONTROL</h5>
            <div className="ws1-debug-btn-grid">
              <button
                type="button"
                className="ws1-dbg-btn"
                onClick={() => onSetTimer(720)}
              >
                ⏱ Reset Timer (12:00)
              </button>
              <button
                type="button"
                className="ws1-dbg-btn"
                onClick={() => onSetTimer(60)}
              >
                ⏱ Set Timer to 1:00 (Warning)
              </button>
              <button
                type="button"
                className="ws1-dbg-btn ws1-dbg-btn-warn"
                onClick={() => onSetTimer(5)}
              >
                ⏱ Set Timer to 5s (Test Timeout)
              </button>
            </div>
          </div>

          <div className="ws1-debug-section">
            <h5 className="ws1-debug-sec-title">FORCE OUTCOME SCREENS</h5>
            <div className="ws1-debug-btn-grid">
              <button
                type="button"
                className="ws1-dbg-btn ws1-dbg-btn-green"
                onClick={() => {
                  onTriggerSuccess();
                  onClose();
                }}
              >
                🏁 Force Success Screen (Checkered Flag)
              </button>
              <button
                type="button"
                className="ws1-dbg-btn ws1-dbg-btn-red"
                onClick={() => {
                  onTriggerTimeout();
                  onClose();
                }}
              >
                ✕ Force Timeout Screen (Broadcast Failure)
              </button>
            </div>
          </div>

          <div className="ws1-debug-section">
            <h5 className="ws1-debug-sec-title">SESSION RESET</h5>
            <div className="ws1-debug-btn-grid">
              <button
                type="button"
                className="ws1-dbg-btn ws1-dbg-btn-danger"
                onClick={() => {
                  onResetStation();
                  onClose();
                }}
              >
                ↺ Clear Storage & Restart Shift
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
