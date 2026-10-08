export const circuitConfig = {
  inputs: [
    {
      id: "DOOR_LOCKED",
      label: "DOOR_LOCKED",
      code: "IN_01",
      initial: 1,
      description: "Blast door hydraulic perimeter seals engaged",
    },
    {
      id: "FIRE_CLEAR",
      label: "FIRE_CLEAR",
      code: "IN_02",
      initial: 1,
      description: "Containment zone thermal sensors nominal",
    },
    {
      id: "POWER_STABLE",
      label: "POWER_STABLE",
      code: "IN_03",
      initial: 1,
      description: "Auxiliary power grid frequency in tolerance",
    },
    {
      id: "SECURITY_AUTHORIZED",
      label: "SECURITY_AUTHORIZED",
      code: "IN_04",
      initial: 1,
      description: "Biometric perimeter clearance verified",
    },
  ],

  gates: [
    {
      id: "gate_1",
      slotId: "SLOT_A",
      label: "GATE 01",
      type: "AND",
      isReplaceable: false,
      inputs: ["DOOR_LOCKED", "FIRE_CLEAR"],
      outputLabel: "SIG_A",
    },
    {
      id: "gate_2",
      slotId: "SLOT_B",
      label: "GATE 02 [FAULT DETECTED]",
      type: "OR", // INTENTIONALLY FAULTY
      initialType: "OR",
      correctType: "AND",
      isReplaceable: true,
      inputs: ["POWER_STABLE", "SECURITY_AUTHORIZED"],
      outputLabel: "SIG_B",
    },
    {
      id: "gate_3",
      slotId: "SLOT_OUT",
      label: "GATE 03",
      type: "AND",
      isReplaceable: false,
      inputs: ["SIG_A", "SIG_B"],
      outputLabel: "SAFE_OUTPUT",
    },
  ],

  toolboxGates: [
    {
      type: "AND",
      symbol: "&",
      name: "AND GATE",
      description: "Output is 1 ONLY when both inputs are 1",
      truthTable: [
        { a: 0, b: 0, out: 0 },
        { a: 0, b: 1, out: 0 },
        { a: 1, b: 0, out: 0 },
        { a: 1, b: 1, out: 1 },
      ],
    },
    {
      type: "OR",
      symbol: "≥1",
      name: "OR GATE",
      description: "Output is 1 if AT LEAST one input is 1",
      truthTable: [
        { a: 0, b: 0, out: 0 },
        { a: 0, b: 1, out: 1 },
        { a: 1, b: 0, out: 1 },
        { a: 1, b: 1, out: 1 },
      ],
    },
    {
      type: "XOR",
      symbol: "=1",
      name: "XOR GATE",
      description: "Output is 1 ONLY when inputs are different",
      truthTable: [
        { a: 0, b: 0, out: 0 },
        { a: 0, b: 1, out: 1 },
        { a: 1, b: 0, out: 1 },
        { a: 1, b: 1, out: 0 },
      ],
    },
    {
      type: "NOT",
      symbol: "1",
      name: "NOT GATE",
      description: "Single-input inverter (reverses logic signal)",
      truthTable: [
        { a: 0, b: "-", out: 1 },
        { a: 1, b: "-", out: 0 },
      ],
    },
  ],
};
