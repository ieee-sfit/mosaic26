export default function OutputStatusPanel({
  inputs,
  safeOutput,
  isCircuitValid,
  isBypassActive,
  allTolerancesSafe,
}) {
  const isSafe = safeOutput === 1 && isCircuitValid && !isBypassActive;

  const items = [
    {
      id: "power",
      label: "POWER GRID",
      value: inputs.POWER_STABLE ? "ONLINE // STABLE" : "DE-ENERGIZED (0)",
      isOk: Boolean(inputs.POWER_STABLE),
    },
    {
      id: "door",
      label: "BLAST DOOR",
      value: inputs.DOOR_LOCKED ? "ENGAGED // SEALED" : "UNLOCKED (0)",
      isOk: Boolean(inputs.DOOR_LOCKED),
    },
    {
      id: "fire",
      label: "FIRE DETECTOR",
      value: inputs.FIRE_CLEAR ? "CLEAR // NOMINAL" : "ALARM ACTIVE (0)",
      isOk: Boolean(inputs.FIRE_CLEAR),
    },
    {
      id: "security",
      label: "SECURITY CLEAR",
      value: inputs.SECURITY_AUTHORIZED ? "AUTHORIZED (1)" : "UNAUTHORIZED (0)",
      isOk: Boolean(inputs.SECURITY_AUTHORIZED),
    },
    {
      id: "sensors",
      label: "ENVIRONMENT",
      value: allTolerancesSafe ? "IN SPECIFICATION" : "OUT OF TOLERANCE",
      isOk: allTolerancesSafe,
    },
  ];

  return (
    <div className="ws4-sidebar-right">
      <div className="ws4-panel">
        <div className="ws4-panel-header">
          <span>SYSTEM STATUS</span>
          <span className="ws4-accent">TELEMETRY</span>
        </div>

        <div className="ws4-panel-content">
          <div className="ws4-status-gauge-list">
            {items.map((item) => (
              <div key={item.id} className="ws4-status-gauge-item">
                <span className="ws4-gauge-label">{item.label}</span>
                <span
                  className="ws4-gauge-val"
                  style={{
                    color: item.isOk ? "var(--ws4-neon-green)" : "var(--ws4-crimson-alert)",
                  }}
                >
                  <span
                    className={`ws4-led ${item.isOk ? "ws4-green" : "ws4-red"}`}
                    style={{ marginRight: "6px" }}
                    aria-hidden="true"
                  />
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div
            className={`ws4-primary-interlock-display ${
              isSafe ? "ws4-safe" : "ws4-unsafe"
            }`}
          >
            <span style={{ fontSize: "10.5px", color: "var(--ws4-text-secondary)" }}>
              FACILITY SAFE INTERLOCK
            </span>
            <div
              className={`ws4-interlock-state-badge ${
                isSafe ? "ws4-safe" : "ws4-unsafe"
              }`}
            >
              {isSafe ? "SAFE // HIGH (1)" : "UNSAFE // LOW (0)"}
            </div>
            <span style={{ fontSize: "9.5px", color: "#8b9bb4" }}>
              {isBypassActive
                ? "OVERRIDE ACTIVE (INTERLOCK INHIBITED)"
                : isSafe
                ? "ALL INTERLOCK CONDITIONS SATISFIED"
                : "FAIL-SAFE DEFAULT PROTECTING FACILITY"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
