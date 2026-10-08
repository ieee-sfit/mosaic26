export default function CircuitWire({
  wires,
  isBypassActive = false,
  hasMismatchWarning = false,
}) {
  const getWireClass = (val, isMismatch = false) => {
    if (isMismatch) return "ws4-wire-path ws4-wire-err";
    if (isBypassActive) return "ws4-wire-path ws4-wire-low";
    return val === 1 ? "ws4-wire-path ws4-wire-high ws4-wire-pulse" : "ws4-wire-path ws4-wire-low";
  };

  return (
    <svg
      className="ws4-circuit-svg"
      viewBox="0 0 720 380"
      preserveAspectRatio="none"
      aria-label="Circuit wires diagram"
    >
      <defs>
        <filter id="ws4Glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Wire 1: DOOR_LOCKED to Gate 1 (Slot A Top) */}
      <path
        d="M 170 45 L 205 45 L 205 65 L 240 65"
        className={getWireClass(wires.doorToGate1)}
      />

      {/* Wire 2: FIRE_CLEAR to Gate 1 (Slot A Bottom) */}
      <path
        d="M 170 125 L 205 125 L 205 105 L 240 105"
        className={getWireClass(wires.fireToGate1)}
      />

      {/* Wire 3: POWER_STABLE to Gate 2 (Slot B Top) */}
      <path
        d="M 170 235 L 205 235 L 205 255 L 240 255"
        className={getWireClass(wires.powerToGate2)}
      />

      {/* Wire 4: SECURITY_AUTHORIZED to Gate 2 (Slot B Bottom) */}
      <path
        d="M 170 315 L 205 315 L 205 295 L 240 295"
        className={getWireClass(wires.securityToGate2, hasMismatchWarning)}
      />

      {/* Wire 5: Gate 1 Out (Sig A) to Gate 3 Top */}
      <path
        d="M 360 90 L 400 90 L 400 160 L 440 160"
        className={getWireClass(wires.gate1ToGate3)}
      />

      {/* Wire 6: Gate 2 Out (Sig B) to Gate 3 Bottom */}
      <path
        d="M 360 280 L 400 280 L 400 200 L 440 200"
        className={getWireClass(wires.gate2ToGate3, hasMismatchWarning)}
      />

      {/* Wire 7: Gate 3 Out to SAFE_OUTPUT */}
      <path
        d="M 560 185 L 590 185"
        className={getWireClass(wires.gate3ToOutput)}
      />

      {/* Signal text tags along wires for accessibility */}
      <text x="210" y="58" fill={wires.doorToGate1 ? "#00ff7f" : "#506177"} fontSize="9" fontFamily="monospace">
        {wires.doorToGate1 ? "1" : "0"}
      </text>
      <text x="210" y="120" fill={wires.fireToGate1 ? "#00ff7f" : "#506177"} fontSize="9" fontFamily="monospace">
        {wires.fireToGate1 ? "1" : "0"}
      </text>
      <text x="210" y="248" fill={wires.powerToGate2 ? "#00ff7f" : "#506177"} fontSize="9" fontFamily="monospace">
        {wires.powerToGate2 ? "1" : "0"}
      </text>
      <text x="210" y="310" fill={wires.securityToGate2 ? "#00ff7f" : "#506177"} fontSize="9" fontFamily="monospace">
        {wires.securityToGate2 ? "1" : "0"}
      </text>

      <text x="375" y="85" fill={wires.gate1ToGate3 ? "#00ff7f" : "#506177"} fontSize="9" fontFamily="monospace">
        SIG_A:{wires.gate1ToGate3 ? "1" : "0"}
      </text>
      <text x="375" y="295" fill={wires.gate2ToGate3 ? "#00ff7f" : "#506177"} fontSize="9" fontFamily="monospace">
        SIG_B:{wires.gate2ToGate3 ? "1" : "0"}
      </text>
      <text x="565" y="178" fill={wires.gate3ToOutput ? "#00ff7f" : "#506177"} fontSize="9" fontFamily="monospace">
        OUT:{wires.gate3ToOutput ? "1" : "0"}
      </text>
    </svg>
  );
}
