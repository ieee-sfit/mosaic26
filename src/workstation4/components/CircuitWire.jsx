export default function CircuitWire({
  wires,
  isBypassActive = false,
  slotBGateType = "AND",
}) {
  const isNotGate = slotBGateType === "NOT";

  // Real physical output of Gate 03
  const outSignal = isBypassActive ? 0 : wires.gate3ToOutput;

  // Render a multi-layered circuit wire with conduit track, baseline, glow, animated pulse, and solder pins
  const renderWire = (pathD, isHigh, key, isError = false) => {
    return (
      <g key={key}>
        {/* Base dark conduit channel */}
        <path d={pathD} className="ws4-wire-track" />

        {/* Dim trace */}
        <path d={pathD} className="ws4-wire-dim" />

        {/* Active energized state */}
        {isHigh && !isError && (
          <>
            <path d={pathD} className="ws4-wire-active-glow" />
            <path d={pathD} className="ws4-wire-active-flow" />
          </>
        )}

        {/* Disconnected / Fault state */}
        {isError && (
          <path d={pathD} className="ws4-wire-err-flow" />
        )}
      </g>
    );
  };

  // Render a connection solder pin
  const renderPin = (cx, cy, isHigh, key, isError = false) => {
    const fillColor = isError ? "#ff3344" : isHigh ? "#00ff7f" : "#334155";
    const strokeColor = isError ? "#ff3344" : isHigh ? "#00ff7f" : "#1e293b";

    return (
      <g key={key}>
        <circle
          cx={cx}
          cy={cy}
          r="4.5"
          fill="#06090e"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <circle
          cx={cx}
          cy={cy}
          r="2.5"
          fill={fillColor}
          filter={isHigh ? "url(#ws4Glow)" : undefined}
        />
      </g>
    );
  };

  return (
    <svg
      className="ws4-circuit-svg"
      viewBox="0 0 780 380"
      preserveAspectRatio="none"
      aria-label="Circuit wires diagram"
    >
      <defs>
        <filter id="ws4Glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Wire 1: DOOR_LOCKED (170, 48) -> Gate 1 Top (240, 48) */}
      {renderWire("M 170 48 L 240 48", wires.doorToGate1 === 1, "w1")}
      {renderPin(170, 48, wires.doorToGate1 === 1, "p1-src")}
      {renderPin(240, 48, wires.doorToGate1 === 1, "p1-dst")}

      {/* Wire 2: FIRE_CLEAR (170, 130) -> Gate 1 Bottom (240, 88) */}
      {renderWire("M 170 130 L 205 130 L 205 88 L 240 88", wires.fireToGate1 === 1, "w2")}
      {renderPin(170, 130, wires.fireToGate1 === 1, "p2-src")}
      {renderPin(240, 88, wires.fireToGate1 === 1, "p2-dst")}

      {/* Wire 3: POWER_STABLE (170, 212) -> Gate 2 Top (240, 248) or NOT Pin (240, 268) */}
      {renderWire(
        isNotGate
          ? "M 170 212 L 205 212 L 205 268 L 240 268"
          : "M 170 212 L 205 212 L 205 248 L 240 248",
        wires.powerToGate2 === 1,
        "w3"
      )}
      {renderPin(170, 212, wires.powerToGate2 === 1, "p3-src")}
      {renderPin(240, isNotGate ? 268 : 248, wires.powerToGate2 === 1, "p3-dst")}

      {/* Wire 4: SECURITY_AUTHORIZED (170, 294) -> Gate 2 Bottom (240, 288) (Disabled when NOT) */}
      {isNotGate ? (
        <>
          {renderWire("M 170 294 L 205 294", false, "w4", true)}
          {renderPin(170, 294, false, "p4-src", true)}
          {renderPin(205, 294, false, "p4-term", true)}
        </>
      ) : (
        <>
          {renderWire("M 170 294 L 205 294 L 205 288 L 240 288", wires.securityToGate2 === 1, "w4")}
          {renderPin(170, 294, wires.securityToGate2 === 1, "p4-src")}
          {renderPin(240, 288, wires.securityToGate2 === 1, "p4-dst")}
        </>
      )}

      {/* Wire 5: Gate 1 Out (360, 68) -> Gate 3 Top (440, 142) */}
      {renderWire("M 360 68 L 400 68 L 400 142 L 440 142", wires.gate1ToGate3 === 1, "w5")}
      {renderPin(360, 68, wires.gate1ToGate3 === 1, "p5-src")}
      {renderPin(440, 142, wires.gate1ToGate3 === 1, "p5-dst")}

      {/* Wire 6: Gate 2 Out (360, 268) -> Gate 3 Bottom (440, 192) */}
      {renderWire("M 360 268 L 400 268 L 400 192 L 440 192", wires.gate2ToGate3 === 1, "w6")}
      {renderPin(360, 268, wires.gate2ToGate3 === 1, "p6-src")}
      {renderPin(440, 192, wires.gate2ToGate3 === 1, "p6-dst")}

      {/* Wire 7: Gate 3 Out (560, 168) -> SAFE_OUTPUT (630, 168) */}
      {renderWire("M 560 168 L 630 168", outSignal === 1, "w7")}
      {renderPin(560, 168, outSignal === 1, "p7-src")}
      {renderPin(630, 168, outSignal === 1, "p7-dst")}

      {/* Input signal value tags */}
      <g transform="translate(195, 40)">
        <rect x="-10" y="-8" width="20" height="15" rx="2" fill="#06090e" stroke={wires.doorToGate1 ? "#00ff7f" : "#243242"} strokeWidth="1" />
        <text x="0" y="3" textAnchor="middle" fill={wires.doorToGate1 ? "#00ff7f" : "#64748b"} fontSize="9" fontWeight="800" fontFamily="monospace">
          {wires.doorToGate1 ? "1" : "0"}
        </text>
      </g>

      <g transform="translate(195, 144)">
        <rect x="-10" y="-8" width="20" height="15" rx="2" fill="#06090e" stroke={wires.fireToGate1 ? "#00ff7f" : "#243242"} strokeWidth="1" />
        <text x="0" y="3" textAnchor="middle" fill={wires.fireToGate1 ? "#00ff7f" : "#64748b"} fontSize="9" fontWeight="800" fontFamily="monospace">
          {wires.fireToGate1 ? "1" : "0"}
        </text>
      </g>

      <g transform="translate(195, 202)">
        <rect x="-10" y="-8" width="20" height="15" rx="2" fill="#06090e" stroke={wires.powerToGate2 ? "#00ff7f" : "#243242"} strokeWidth="1" />
        <text x="0" y="3" textAnchor="middle" fill={wires.powerToGate2 ? "#00ff7f" : "#64748b"} fontSize="9" fontWeight="800" fontFamily="monospace">
          {wires.powerToGate2 ? "1" : "0"}
        </text>
      </g>

      <g transform="translate(195, 308)">
        <rect x="-12" y="-8" width="24" height="15" rx="2" fill="#06090e" stroke={isNotGate ? "#ff3344" : wires.securityToGate2 ? "#00ff7f" : "#243242"} strokeWidth="1" />
        <text x="0" y="3" textAnchor="middle" fill={isNotGate ? "#ff3344" : wires.securityToGate2 ? "#00ff7f" : "#64748b"} fontSize="8.5" fontWeight="800" fontFamily="monospace">
          {isNotGate ? "N/C" : wires.securityToGate2 ? "1" : "0"}
        </text>
      </g>

      {/* Middle Gate Signals (SIG_A and SIG_B) */}
      <g transform="translate(400, 52)">
        <rect x="-28" y="-8" width="56" height="16" rx="3" fill="#06090e" stroke={wires.gate1ToGate3 ? "#00ff7f" : "#243242"} strokeWidth="1" />
        <text x="0" y="4" textAnchor="middle" fill={wires.gate1ToGate3 ? "#00ff7f" : "#64748b"} fontSize="9.5" fontWeight="800" fontFamily="monospace">
          SIG_A:{wires.gate1ToGate3 ? "1" : "0"}
        </text>
      </g>

      <g transform="translate(400, 284)">
        <rect x="-28" y="-8" width="56" height="16" rx="3" fill="#06090e" stroke={wires.gate2ToGate3 ? "#00ff7f" : "#243242"} strokeWidth="1" />
        <text x="0" y="4" textAnchor="middle" fill={wires.gate2ToGate3 ? "#00ff7f" : "#64748b"} fontSize="9.5" fontWeight="800" fontFamily="monospace">
          SIG_B:{wires.gate2ToGate3 ? "1" : "0"}
        </text>
      </g>

      {/* Output Signal OUT */}
      <g transform="translate(595, 152)">
        <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#06090e" stroke={outSignal ? "#00ff7f" : "#243242"} strokeWidth="1" />
        <text x="0" y="4" textAnchor="middle" fill={outSignal ? "#00ff7f" : "#64748b"} fontSize="9.5" fontWeight="800" fontFamily="monospace">
          OUT:{outSignal ? "1" : "0"}
        </text>
      </g>
    </svg>
  );
}
