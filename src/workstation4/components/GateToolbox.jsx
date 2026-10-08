import { circuitConfig } from "../config/circuitConfig";

export default function GateToolbox({ onSelectGate, currentSelectedGate }) {
  const handleDragStart = (e, gateType) => {
    e.dataTransfer.setData("application/ws4-gate-type", gateType);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="ws4-toolbox-container">
      <div className="ws4-toolbox-header">
        <span>LOGIC GATE TOOLBOX (DRAG OR CLICK TO INSTALL)</span>
        <span style={{ fontSize: "10px", color: "var(--ws4-text-secondary)" }}>
          TARGET: GATE 02 SLOT
        </span>
      </div>

      <div className="ws4-toolbox-gates-row" role="list" aria-label="Available logic gates">
        {circuitConfig.toolboxGates.map((gate) => {
          const isSelected = currentSelectedGate === gate.type;
          return (
            <div
              key={gate.type}
              className="ws4-gate-chip"
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
              title={`${gate.name}: ${gate.description}`}
              style={{
                borderColor: isSelected ? "var(--ws4-cyan-accent)" : undefined,
                boxShadow: isSelected ? "0 0 10px rgba(0, 229, 255, 0.4)" : undefined,
              }}
            >
              <span className="ws4-gate-chip-name">{gate.type}</span>
              <span className="ws4-gate-chip-symbol">({gate.symbol})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
