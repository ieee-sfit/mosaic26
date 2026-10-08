import { evaluateCircuit, testCircuitSecurity } from "./logicSimulator";

export function validateCircuit(currentInputs, slotBGateType) {
  const evalResult = evaluateCircuit(currentInputs, slotBGateType);
  const securityTest = testCircuitSecurity(slotBGateType);

  if (slotBGateType === "NOT") {
    return {
      isValid: false,
      safeOutput: evalResult.safeOutput,
      status: "INVALID_GATE",
      title: "CONNECTION MISMATCH",
      message: "NOT gate is a single-input inverter and cannot bind two safety interlock lines.",
      detail: "Gate 02 requires a dual-input combinational logic gate.",
    };
  }

  if (slotBGateType === "OR") {
    return {
      isValid: false,
      safeOutput: evalResult.safeOutput,
      status: "UNSAFE_LOGIC",
      title: "FAIL-SAFE LOGIC BREACH",
      message: "OR gate creates an unsafe logic bypass. Safe output could trigger even if one line is LOW.",
      detail: `${securityTest.totalFailures} test vectors failed. E.g. SECURITY line could be 0 while POWER is 1.`,
    };
  }

  if (slotBGateType === "XOR") {
    return {
      isValid: false,
      safeOutput: evalResult.safeOutput,
      status: "UNSAFE_LOGIC",
      title: "EXCLUSIVE LOGIC MISMATCH",
      message: "XOR gate goes LOW when both inputs are HIGH. This disables safety when all systems are online.",
      detail: `${securityTest.totalFailures} test vectors failed. Interlock shuts down during nominal conditions.`,
    };
  }

  if (slotBGateType === "AND") {
    if (!evalResult.safeOutput) {
      return {
        isValid: false,
        safeOutput: 0,
        status: "INPUTS_LOW",
        title: "GATE CORRECT / INPUTS NOT ALL HIGH",
        message: "Gate logic is correct (AND), but one or more facility inputs are toggled LOW.",
        detail: "Ensure all 4 digital inputs (DOOR, FIRE, POWER, SECURITY) are set to HIGH (1).",
      };
    }

    return {
      isValid: true,
      safeOutput: 1,
      status: "SAFE",
      title: "LOGIC INTEGRITY VERIFIED",
      message: "All 4 safety signals strictly combined via dual AND gates. SAFE_OUTPUT = HIGH / 1.",
      detail: "All 16 Boolean test vectors verified nominal fail-safe behavior.",
    };
  }

  return {
    isValid: false,
    safeOutput: 0,
    status: "UNKNOWN",
    title: "UNKNOWN GATE",
    message: "Gate configuration unrecognized.",
    detail: "Install an AND gate to complete the interlock.",
  };
}
