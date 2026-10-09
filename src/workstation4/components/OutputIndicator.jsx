export default function OutputIndicator({
  safeOutput,
  isCircuitValid,
  isBypassActive = false,
  slotBGateType = "OR",
}) {
  // Real signal level on the wire
  const isHigh = safeOutput === 1 && !isBypassActive;
  
  // Interlock verification is only fully valid when circuit logic is nominal AND signal is HIGH
  const isFullySafe = isHigh && isCircuitValid;
  const isGateAnd = slotBGateType === "AND";

  return (
    <div
      className={`ws4-output-box ${isFullySafe ? "ws4-out-safe" : "ws4-out-unsafe"}`}
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
            color: isFullySafe ? "var(--ws4-neon-green)" : isGateAnd ? "var(--ws4-amber-warn)" : "var(--ws4-crimson-alert)",
            marginTop: "2px",
          }}
        >
          {isBypassActive
            ? "BYPASS FORCED LOW"
            : isFullySafe
            ? "✓ SAFE / NOMINAL"
            : !isGateAnd
            ? "⚠ LOGIC FAULT (UNVERIFIED)"
            : "FAIL-SAFE (INPUTS LOW)"}
        </span>
        {!isFullySafe && !isBypassActive && (
          <span
            style={{
              fontSize: "8.5px",
              color: isGateAnd ? "var(--ws4-amber-warn)" : "#f87171",
              display: "block",
              marginTop: "2px",
            }}
          >
            {isGateAnd
              ? "GATE 02 REPAIRED ✓ // TURN ALL 4 INPUTS [ON] (1)"
              : `GATE 02 IS ${slotBGateType} (REQUIRES AND GATE)`}
          </span>
        )}
      </div>
    </div>
  );
}
