export default function LogicGate({
  slotId,
  label,
  gateType,
  isReplaceable,
  isFaulty,
  isRepaired,
  outputSignal,
  onDropGate,
  isDragTarget,
}) {
  const getSymbol = (type) => {
    switch (type) {
      case "AND":
        return "&";
      case "OR":
        return "≥1";
      case "XOR":
        return "=1";
      case "NOT":
        return "1";
      default:
        return "?";
    }
  };

  const handleDragOver = (e) => {
    if (!isReplaceable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    if (!isReplaceable) return;
    e.preventDefault();
    const droppedType = e.dataTransfer.getData("application/ws4-gate-type");
    if (droppedType && onDropGate) {
      onDropGate(slotId, droppedType);
    }
  };

  return (
    <div
      className={`ws4-gate-slot ${isReplaceable ? "ws4-slot-target" : ""} ${
        isDragTarget ? "ws4-slot-dragover" : ""
      } ${isFaulty ? "ws4-slot-faulty" : ""} ${isRepaired ? "ws4-slot-repaired" : ""}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      id={`ws4-gate-${slotId.toLowerCase()}`}
    >
      <div className="ws4-gate-slot-tag">
        <span>{label}</span>
        {isReplaceable && (
          <span
            style={{
              color: isRepaired ? "var(--ws4-neon-green)" : "var(--ws4-crimson-alert)",
              fontSize: "8.5px",
            }}
          >
            {isRepaired ? "✓ VALID" : "⚠ FAULT"}
          </span>
        )}
      </div>

      <div className="ws4-gate-display-body">
        <span className="ws4-gate-type-name">{gateType || "[ EMPTY ]"}</span>
        <span className="ws4-gate-symbol">({getSymbol(gateType)})</span>
      </div>

      <div className="ws4-slot-actions">
        {isReplaceable ? (
          <span style={{ fontSize: "9px", color: "var(--ws4-text-secondary)" }}>
            {isRepaired ? "AND GATE LOCKED" : "DROP GATE TO REPLACE"}
          </span>
        ) : (
          <span style={{ fontSize: "9px", color: "var(--ws4-text-muted)" }}>
            OUT: {outputSignal ? "HIGH (1)" : "LOW (0)"}
          </span>
        )}
      </div>
    </div>
  );
}
