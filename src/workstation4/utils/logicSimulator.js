/**
 * Real Boolean Logic Simulator for Area51 Facility Interlock
 */

export function evaluateGate(type, inputs) {
  if (!Array.isArray(inputs)) return 0;
  const inA = inputs[0] === 1 || inputs[0] === true ? 1 : 0;
  const inB = inputs[1] === 1 || inputs[1] === true ? 1 : 0;

  switch (type) {
    case "AND":
      return inA === 1 && inB === 1 ? 1 : 0;

    case "OR":
      return inA === 1 || inB === 1 ? 1 : 0;

    case "XOR":
      return inA !== inB ? 1 : 0;

    case "NOT":
      // NOT is a single-input inverter. In a dual-input slot, it only inverts primary line
      return inA === 1 ? 0 : 1;

    case "NAND":
      return !(inA === 1 && inB === 1) ? 1 : 0;

    case "NOR":
      return !(inA === 1 || inB === 1) ? 1 : 0;

    default:
      return 0;
  }
}

export function evaluateCircuit(inputs, slotBGateType) {
  const dLocked = inputs.DOOR_LOCKED ? 1 : 0;
  const fClear = inputs.FIRE_CLEAR ? 1 : 0;
  const pStable = inputs.POWER_STABLE ? 1 : 0;
  const sAuth = inputs.SECURITY_AUTHORIZED ? 1 : 0;

  // Gate 1: AND [DOOR_LOCKED, FIRE_CLEAR]
  const sigA = evaluateGate("AND", [dLocked, fClear]);

  // Gate 2: slot B [POWER_STABLE, SECURITY_AUTHORIZED]
  const sigB = evaluateGate(slotBGateType, [pStable, sAuth]);

  // Gate 3: AND [sigA, sigB]
  const safeOutput = evaluateGate("AND", [sigA, sigB]);

  return {
    sigA,
    sigB,
    safeOutput,
    wires: {
      doorToGate1: dLocked,
      fireToGate1: fClear,
      powerToGate2: pStable,
      securityToGate2: sAuth,
      gate1ToGate3: sigA,
      gate2ToGate3: sigB,
      gate3ToOutput: safeOutput,
    },
    // True only if NOT gate was placed in a 2-input slot
    hasMismatchWarning: slotBGateType === "NOT",
  };
}

export function testCircuitSecurity(slotBGateType) {
  // Exhaustive verification of all 16 input combinations
  // In a true 4-input AND interlock:
  // SAFE_OUTPUT must be 1 IF AND ONLY IF all 4 inputs are 1.
  let passesAllTestVectors = true;
  const failures = [];

  for (let d = 0; d <= 1; d++) {
    for (let f = 0; f <= 1; f++) {
      for (let p = 0; p <= 1; p++) {
        for (let s = 0; s <= 1; s++) {
          const testInputs = {
            DOOR_LOCKED: d,
            FIRE_CLEAR: f,
            POWER_STABLE: p,
            SECURITY_AUTHORIZED: s,
          };
          const result = evaluateCircuit(testInputs, slotBGateType);
          const expected = d === 1 && f === 1 && p === 1 && s === 1 ? 1 : 0;

          if (result.safeOutput !== expected) {
            passesAllTestVectors = false;
            failures.push({
              inputs: testInputs,
              actual: result.safeOutput,
              expected,
            });
          }
        }
      }
    }
  }

  return {
    passesAllTestVectors,
    failures,
    totalFailures: failures.length,
  };
}
