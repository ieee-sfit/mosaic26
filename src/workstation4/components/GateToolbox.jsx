import { circuitConfig } from "../config/circuitConfig";

export default function GateToolbox({
  onSelectGate,
  currentSelectedGate,
  testedGatesCount = 1,
  allFourGatesTested = false,
  gateSolveHistory = [],
}) {
  const handleDragStart = (e, gateType) => {
    e.dataTransfer.setData("application/ws4-gate-type", gateType);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="ws4-toolbox-container">
      <div className="ws4-toolbox-header">
        <span>LOGIC GATE TOOLBOX (DRAG OR CLICK TO INSTALL)</span>
        <span
          style={{
            fontSize: "10.5px",
            color: allFourGatesTested ? "var(--ws4-neon-green)" : "var(--ws4-cyan-accent)",
            fontWeight: 800,
            letterSpacing: "0.5px",
          }}
        >
          {allFourGatesTested
            ? "✓ ALL 4 GATES EVALUATED (4/4)"
            : `GATES EVALUATED: ${testedGatesCount} / 4`}
        </span>
      </div>

      <div className="ws4-toolbox-gates-row" role="list" aria-label="Available logic gates">
        {circuitConfig.toolboxGates.map((gate) => {
          const isSelected = currentSelectedGate === gate.type;
          const isSubmitted = gateSolveHistory.some((h) => h.gateType === gate.type);
          return (
            <div
              key={gate.type}
              className={`ws4-gate-chip ${isSelected ? "ws4-selected" : ""}`}
              draggable
              onDragStart={(e) => handleDragStart(e, gate.type)}
              onClick={() => onSelectGate && onSelectGate(gate.type)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectGate && onSelectGate(gate.type);
                }
              }}
              aria-label={`Select ${gate.name}`}
              title={`${gate.name}: ${gate.description}${isSubmitted ? " (Evaluation submitted)" : ""}`}
              style={{
                borderColor: isSelected
                  ? "var(--ws4-cyan-accent)"
                  : isSubmitted
                  ? "rgba(0, 255, 127, 0.4)"
                  : undefined,
                boxShadow: isSelected ? "0 0 10px rgba(0, 229, 255, 0.4)" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", gap: "4px" }}>
                {isSubmitted && (
                  <span style={{ color: "var(--ws4-neon-green)", fontSize: "11px", fontWeight: 900 }}>✓</span>
                )}
                <span className="ws4-gate-chip-name">{gate.type}</span>
              </div>
              <span className="ws4-gate-chip-symbol">({gate.symbol})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
