export const stationConfig = {
  stationId: "station-4",
  stationName: "Area51 Facility Lockdown",
  subTitle: "EMERGENCY INTERLOCK SIMULATION",
  engineeringConcept: "DIGITAL ELECTRONICS / BOOLEAN LOGIC / LOGIC GATES",
  teamSize: "2–3",
  totalDurationSeconds: 720, // 12 minutes (12:00)
  authorizationCode: "1947",

  moduleWeights: {
    moduleA: 20,
    moduleB: 35,
    moduleC: 45,
  },

  penalties: {
    wrongQuestionAnswer: 3,
    wrongGatePlacement: 3,
    wrongPasscodeAttempt: 4,
    bypassActivation: 5,
    hints: [2, 3, 5], // Penalty for hint 1, 2, 3
  },

  tolerance: {
    powerStability: {
      id: "powerStability",
      label: "POWER STABILITY",
      unit: "%",
      min: 95,
      max: 100,
      initial: 92,
      sliderMin: 70,
      sliderMax: 100,
      step: 1,
    },

    temperature: {
      id: "temperature",
      label: "CORE TEMPERATURE",
      unit: "°C",
      min: 20,
      max: 50,
      initial: 55,
      sliderMin: 10,
      sliderMax: 80,
      step: 1,
    },

    doorPressure: {
      id: "doorPressure",
      label: "DOOR PRESSURE",
      unit: "%",
      min: 80,
      max: 100,
      initial: 76,
      sliderMin: 50,
      sliderMax: 100,
      step: 1,
    },

    securitySignal: {
      id: "securitySignal",
      label: "SECURITY SIGNAL",
      unit: "%",
      min: 95,
      max: 100,
      initial: 91,
      sliderMin: 60,
      sliderMax: 100,
      step: 1,
    },
  },

  hints: [
    {
      id: 1,
      title: "HINT 1 / CIRCUIT PRINCIPLE",
      text: "Check whether the final condition requires ALL safety inputs to be TRUE.",
      cost: 2,
    },
    {
      id: 2,
      title: "HINT 2 / GATE IDENTIFICATION",
      text: "Review the difference between AND and OR.",
      cost: 3,
    },
    {
      id: 3,
      title: "HINT 3 / TRACE LOGIC PATH",
      text: "Trace the circuit toward SAFE_OUTPUT.",
      cost: 5,
    },
  ],
};
