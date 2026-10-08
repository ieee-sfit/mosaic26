export default function OutputIndicator({
  safeOutput,
  isCircuitValid,
  isBypassActive = false,
}) {
  const isHigh = safeOutput === 1 && !isBypassActive;
  const isFullySafe = isHigh && isCircuitValid;

  return (
    <div
      className={`ws4-output-box ${isFullySafe ? "ws4-out-safe" : "ws4-out-unsafe"}`}
      id="ws4-safe-output-box"
    >
      <div className="ws4-output-title">SAFE_OUTPUT</div>
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

      <div style={{ fontSize: "9px", color: "var(--ws4-text-secondary)", textAlign: "center" }}>
        INTERLOCK:
        <span
          style={{
            display: "block",
            fontWeight: "800",
            fontSize: "11px",
            color: isFullySafe ? "var(--ws4-neon-green)" : "var(--ws4-crimson-alert)",
          }}
        >
          {isBypassActive
            ? "BYPASS FORCED LOW"
            : isFullySafe
            ? "SAFE / NOMINAL"
            : "FAIL-SAFE ACTIVE"}
        </span>
      </div>
    </div>
  );
}
