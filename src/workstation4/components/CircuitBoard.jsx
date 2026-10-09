import { useState } from "react";
import InputSwitch from "./InputSwitch";
import LogicGate from "./LogicGate";
import CircuitWire from "./CircuitWire";
import OutputIndicator from "./OutputIndicator";
import GateToolbox from "./GateToolbox";
import { circuitConfig } from "../config/circuitConfig";
import { evaluateCircuit } from "../utils/logicSimulator";
import { validateCircuit } from "../utils/circuitValidator";

export default function CircuitBoard({
  inputs,
  onToggleInput,
  slotBGateType,
  onChangeSlotBGate,
  onCircuitVerified,
  isCircuitSolved,
  isBypassActive = false,
}) {
  const [dragOverSlot, setDragOverSlot] = useState(false);

  // Live Boolean computation
  const evalResult = evaluateCircuit(inputs, slotBGateType);
  const validation = validateCircuit(inputs, slotBGateType);

  const handleDropGate = (slotId, newGateType) => {
    setDragOverSlot(false);
    if (slotId === "SLOT_B") {
      onChangeSlotBGate(newGateType);
    }
  };

  const handleSelectGateFromToolbox = (gateType) => {
    onChangeSlotBGate(gateType);
  };

  return (
    <div className="ws4-circuit-workspace">
      <div className="ws4-circuit-board-container">
        <div className="ws4-circuit-board-header">
          <span>AREA 51 // DIGITAL LOGIC INTERLOCK SCHEMATIC</span>
          <span style={{ color: "var(--ws4-cyan-accent)" }}>
            CIRCUIT ID: ARCH-51-FAILSAFE
          </span>
        </div>

        <div className="ws4-circuit-canvas-wrap">
          {/* Input switches on the left */}
          <div className="ws4-inputs-col">
            {circuitConfig.inputs.map((inp) => (
              <InputSwitch
                key={inp.id}
                id={inp.id}
                label={inp.label}
                code={inp.code}
                value={inputs[inp.id]}
                onToggle={onToggleInput}
                description={inp.description}
              />
            ))}
          </div>

          {/* SVG Wires Layer */}
          <CircuitWire
            wires={evalResult.wires}
            isBypassActive={isBypassActive}
            hasMismatchWarning={evalResult.hasMismatchWarning}
          />

          {/* Gate 01: Slot A (Fixed AND) */}
          <div style={{ position: "absolute", left: "240px", top: "25px" }}>
            <LogicGate
              slotId="SLOT_A"
              label="GATE 01 (FIXED)"
              gateType="AND"
              isReplaceable={false}
              outputSignal={evalResult.sigA}
            />
          </div>

          {/* Gate 02: Slot B (Replaceable, Faulty) */}
          <div
            style={{ position: "absolute", left: "240px", top: "215px", cursor: "pointer" }}
            onDragEnter={() => setDragOverSlot(true)}
            onDragLeave={() => setDragOverSlot(false)}
            onClick={() => {
              if (slotBGateType !== "AND") {
                onChangeSlotBGate("AND");
              }
            }}
            title="Click or drag AND gate here to repair interlock"
          >
            <LogicGate
              slotId="SLOT_B"
              label="GATE 02 [SLOT B]"
              gateType={slotBGateType}
              isReplaceable={true}
              isFaulty={slotBGateType !== "AND"}
              isRepaired={slotBGateType === "AND"}
              isDragTarget={dragOverSlot}
              onDropGate={handleDropGate}
            />
          </div>

          {/* Gate 03: Output Gate (Fixed AND) */}
          <div style={{ position: "absolute", left: "440px", top: "120px" }}>
            <LogicGate
              slotId="SLOT_OUT"
              label="GATE 03 (COMBINER)"
              gateType="AND"
              isReplaceable={false}
              outputSignal={evalResult.safeOutput}
            />
          </div>

          {/* Output Indicator Box */}
          <OutputIndicator
            safeOutput={evalResult.safeOutput}
            isCircuitValid={validation.isValid}
            isBypassActive={isBypassActive}
            slotBGateType={slotBGateType}
          />
        </div>
      </div>

      {/* Quick helper banner if Slot B is faulty */}
      {slotBGateType !== "AND" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 14px",
            background: "rgba(255, 51, 68, 0.12)",
            border: "1px solid var(--ws4-crimson-alert)",
            borderRadius: "4px",
            fontSize: "12px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ color: "#ff8080" }}>
            ⚠ <strong>SLOT B FAULT:</strong> Gate 02 is currently <strong>{slotBGateType}</strong>. Click the AND gate below to repair the interlock.
          </div>
          <button
            type="button"
            className="ws4-btn ws4-btn-primary"
            style={{ fontSize: "11px", padding: "5px 12px" }}
            onClick={() => onChangeSlotBGate("AND")}
            id="ws4-quick-install-and-btn"
          >
            [ ⚡ INSTALL AND GATE ]
          </button>
        </div>
      )}

      {/* Logic Gate Toolbox */}
      <GateToolbox
        onSelectGate={handleSelectGateFromToolbox}
        currentSelectedGate={slotBGateType}
      />

      {/* Diagnostics & Verification banner */}
      <div
        className={`ws4-circuit-feedback ${
          validation.isValid ? "ws4-verified" : "ws4-faulty"
        }`}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: "12.5px",
              color: validation.isValid ? "var(--ws4-neon-green)" : "var(--ws4-crimson-alert)",
            }}
          >
            {validation.title}: {validation.message}
          </div>
          <div style={{ fontSize: "11px", color: "#8b9bb4", marginTop: "3px" }}>
            {validation.detail}
          </div>
        </div>

        {validation.isValid && !isCircuitSolved && (
          <button
            type="button"
            className="ws4-btn ws4-btn-primary"
            onClick={onCircuitVerified}
            id="ws4-verify-circuit-btn"
          >
            ✓ COMMIT CIRCUIT REPAIR
          </button>
        )}

        {isCircuitSolved && (
          <div className="ws4-badge-done" style={{ padding: "6px 12px", fontSize: "11.5px" }}>
            ✓ LOGIC INTEGRITY VERIFIED
          </div>
        )}
      </div>
    </div>
  );
}
