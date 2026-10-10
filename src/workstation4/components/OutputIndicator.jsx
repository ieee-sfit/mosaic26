export default function OutputIndicator({
  safeOutput,
  isCircuitValid,
  isBypassActive = false,
  slotBGateType = "AND",
}) {
  // Real signal level on the wire
  const isHigh = safeOutput === 1 && !isBypassActive;

  return (
    <div
      className={`ws4-output-box ${isHigh ? "ws4-out-safe" : "ws4-out-unsafe"}`}
      id="ws4-safe-output-box"
    >
      <div className="ws4-output-title">SAFE_OUTPUT</div>
      
      {/* Real wire logic value */}
      <div
        className="ws4-output-val"
        style={{ color: isHigh ? "var(--ws4-neon-green)" : "var(--ws4-crimson-alert)" }}
      >
        <span
          className={`ws4-led ${isHigh ? "ws4-green" : "ws4-red"}`}
          aria-hidden="true"
          style={{ marginRight: "6px" }}
        />
        {isHigh ? "HIGH / 1" : "LOW / 0"}
      </div>

      {/* Safety Interlock Supervisory Status */}
      <div style={{ fontSize: "9px", color: "var(--ws4-text-secondary)", textAlign: "center" }}>
        INTERLOCK STATUS:
        <span
          style={{
            display: "block",
            fontWeight: "800",
            fontSize: "11px",
            color: isHigh ? "var(--ws4-neon-green)" : "var(--ws4-crimson-alert)",
            marginTop: "2px",
          }}
        >
          {isBypassActive
            ? "BYPASS FORCED LOW"
            : isHigh
            ? "✓ SAFE / NOMINAL"
            : "FAIL-SAFE (OUTPUT LOW)"}
        </span>
        {!isHigh && !isBypassActive && (
          <span
            style={{
              fontSize: "8.5px",
              color: "var(--ws4-amber-warn)",
              display: "block",
              marginTop: "2px",
            }}
          >
            TURN REQUIRED INPUTS [ON] (1)
          </span>
        )}
      </div>
    </div>
  );
}
