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
  onSubmitGate,
  gateSolveHistory = [],
  isCircuitSolved,
  testedGates = [],
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

  const isSafeOutputGreen = evalResult.safeOutput === 1;
  const allFourGatesTested = ["AND", "OR", "XOR", "NOT"].every((g) =>
    testedGates.includes(g) || gateSolveHistory.some((h) => h.gateType === g && h.safeOutput === 1)
  );
  const currentGateRecord = gateSolveHistory.find((h) => h.gateType === slotBGateType);

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
            {circuitConfig.inputs.map((inp) => {
              const isSlotBSecondInputDisabled = slotBGateType === "NOT" && inp.id === "SECURITY_AUTHORIZED";
              return (
                <InputSwitch
                  key={inp.id}
                  id={inp.id}
                  label={inp.label}
                  code={inp.code}
                  value={isSlotBSecondInputDisabled ? 0 : inputs[inp.id]}
                  onToggle={onToggleInput}
                  description={inp.description}
                  disabled={isSlotBSecondInputDisabled}
                  disabledLabel="NOT gate is a single-input inverter (SECURITY_AUTHORIZED line is disconnected/disabled)"
                />
              );
            })}
          </div>

          {/* SVG Wires Layer */}
          <CircuitWire
            wires={evalResult.wires}
            isBypassActive={isBypassActive}
            slotBGateType={slotBGateType}
          />

          {/* Gate 01: Slot A (Fixed AND) */}
          <div style={{ position: "absolute", left: "240px", top: "15px" }}>
            <LogicGate
              slotId="SLOT_A"
              label="GATE 01 (FIXED)"
              gateType="AND"
              isReplaceable={false}
              outputSignal={evalResult.sigA}
            />
          </div>

          {/* Gate 02: Slot B (Replaceable) */}
          <div
            style={{ position: "absolute", left: "240px", top: "215px", cursor: "pointer" }}
            onDragEnter={() => setDragOverSlot(true)}
            onDragLeave={() => setDragOverSlot(false)}
            title="Gate 02 Slot (Drag or select gate from toolbox)"
          >
            <LogicGate
              slotId="SLOT_B"
              label="GATE 02 [SLOT B]"
              gateType={slotBGateType}
              isReplaceable={true}
              isFaulty={false}
              isRepaired={evalResult.sigB === 1 || slotBGateType === "AND"}
              outputSignal={evalResult.sigB}
              isDragTarget={dragOverSlot}
              onDropGate={handleDropGate}
            />
          </div>

          {/* Gate 03: Output Gate (Fixed AND) */}
          <div style={{ position: "absolute", left: "440px", top: "115px" }}>
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

      {/* Logic Gate Toolbox */}
      <GateToolbox
        onSelectGate={handleSelectGateFromToolbox}
        currentSelectedGate={slotBGateType}
        testedGatesCount={gateSolveHistory.filter((h) => h.safeOutput === 1).length}
        allFourGatesTested={allFourGatesTested}
        gateSolveHistory={gateSolveHistory}
      />

      {/* Submit Gate Button Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--ws4-bg-surface)",
          border: "1px solid var(--ws4-border-subtle)",
          borderRadius: "4px",
          padding: "10px 14px",
          marginTop: "10px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="ws4-btn ws4-btn-primary"
            onClick={() => isSafeOutputGreen && onSubmitGate && onSubmitGate(slotBGateType)}
            disabled={!isSafeOutputGreen}
            id="ws4-submit-gate-btn"
            style={{
              fontWeight: 800,
              letterSpacing: "1px",
              padding: "7px 16px",
              fontSize: "12px",
              cursor: isSafeOutputGreen ? "pointer" : "not-allowed",
              opacity: isSafeOutputGreen ? 1 : 0.45,
              borderColor: isSafeOutputGreen ? "var(--ws4-neon-green)" : "var(--ws4-border-subtle)",
              color: isSafeOutputGreen ? "var(--ws4-neon-green)" : "#64748b",
              background: isSafeOutputGreen ? "rgba(0, 255, 127, 0.15)" : "rgba(255, 255, 255, 0.03)",
              boxShadow: isSafeOutputGreen ? "0 0 12px rgba(0, 255, 127, 0.35)" : "none",
            }}
          >
            [ SUBMIT {slotBGateType} GATE EVALUATION ]
          </button>

          {!isSafeOutputGreen && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--ws4-amber)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              ⚠ CONFIGURE SWITCHES UNTIL SAFE_OUTPUT = HIGH / 1 (GREEN BOX) TO SUBMIT
            </span>
          )}

          {isSafeOutputGreen && !currentGateRecord && (
            <span
              style={{
                fontSize: "11.5px",
                color: "var(--ws4-neon-green)",
                fontWeight: 700,
              }}
            >
              ✓ SAFE_OUTPUT = HIGH (1) // READY TO SUBMIT
            </span>
          )}

          {currentGateRecord && (
            <span
              style={{
                fontSize: "11.5px",
                color: currentGateRecord.isCorrect ? "var(--ws4-neon-green)" : "var(--ws4-cyan-accent)",
                fontWeight: 700,
              }}
            >
              ✓ {slotBGateType} EVALUATION SUBMITTED (JSON ARCHIVED)
            </span>
          )}
        </div>

        {/* Evaluation status indicators for each gate */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          {["AND", "OR", "XOR", "NOT"].map((gType) => {
            const rec = gateSolveHistory.find((h) => h.gateType === gType);
            const isSubmitted = Boolean(rec);
            return (
              <div
                key={gType}
                style={{
                  fontSize: "10.5px",
                  padding: "4px 9px",
                  borderRadius: "3px",
                  background: isSubmitted
                    ? rec.isCorrect
                      ? "rgba(0, 255, 127, 0.15)"
                      : "rgba(0, 229, 255, 0.1)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${
                    isSubmitted
                      ? rec.isCorrect
                        ? "var(--ws4-neon-green)"
                        : "var(--ws4-cyan-accent)"
                      : "var(--ws4-border-subtle)"
                  }`,
                  color: isSubmitted
                    ? rec.isCorrect
                      ? "var(--ws4-neon-green)"
                      : "#c4d1e2"
                    : "#64748b",
                  fontWeight: 700,
                }}
                title={
                  isSubmitted
                    ? `${gType} gate evaluation submitted`
                    : `${gType} gate pending evaluation`
                }
              >
                {isSubmitted ? `✓ ${gType}: SUBMITTED` : `${gType}: PENDING`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification confirmation when valid or solved */}
      {(validation.isValid || isCircuitSolved) && (
        <div className="ws4-circuit-feedback ws4-verified" style={{ marginTop: "10px" }}>
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "12.5px",
                color: "var(--ws4-neon-green)",
              }}
            >
              ✓ LOGIC INTEGRITY VERIFIED: All 4 safety signals combined via dual AND gates
            </div>
            <div style={{ fontSize: "11px", color: "#8b9bb4", marginTop: "3px" }}>
              {allFourGatesTested
                ? "SAFE_OUTPUT = HIGH / 1. Verification question unlocked below."
                : `SAFE_OUTPUT = HIGH / 1. Test remaining gates (AND, OR, XOR, NOT) in Gate 02 to unlock verification (${testedGates.length}/4 tested).`}
            </div>
          </div>

          {!isCircuitSolved && (
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
      )}
    </div>
  );
}
