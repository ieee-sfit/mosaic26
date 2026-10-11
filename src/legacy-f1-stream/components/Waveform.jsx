import { useMemo } from "react";
import { samplesToSvgPath } from "../utils/signalSimulator";

export default function Waveform({
  samples,
  width = 600,
  height = 260,
  color = "#00e5ff",
  glowColor = "rgba(0, 229, 255, 0.4)",
  strokeWidth = 2.2,
  label = "SIGNAL",
  visible = true,
  dashed = false,
  maxAmplitude = 120,
}) {
  const pathD = useMemo(() => {
    if (!visible || !samples || samples.length === 0) return "";
    return samplesToSvgPath(samples, width, height, maxAmplitude);
  }, [samples, width, height, maxAmplitude, visible]);

  if (!visible || !pathD) return null;

  const filterId = `glow-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <g className="ws1-waveform-group">
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ambient glow underlay */}
      <path
        d={pathD}
        fill="none"
        stroke={glowColor}
        strokeWidth={strokeWidth + 3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />

      {/* Primary sharp trace */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "6 4" : undefined}
        filter={`url(#${filterId})`}
      />
    </g>
  );
}
