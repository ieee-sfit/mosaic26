import { useState } from "react";
import Waveform from "./Waveform";

export default function Oscilloscope({
  originalSamples = [],
  antiNoiseSamples = [],
  residualSamples = [],
  originalRms = 0,
  antiNoiseRms = 0,
  residualRms = 0,
  residualNoiseDb = 80,
  safeNoiseLimitDb = 50,
  isResidualSafe = false,
  isPhaseAcceptable = false,
  isFrequencyLocked = false,
  cancellationEfficiency = 0,
}) {
  const [showOriginal, setShowOriginal] = useState(true);
  const [showAntiNoise, setShowAntiNoise] = useState(true);
  const [showResidual, setShowResidual] = useState(true);
  const [timebaseScale, setTimebaseScale] = useState("2.0ms"); // "1.0ms" | "2.0ms" | "5.0ms"

  // Residual color changes dynamically based on safety threshold
  const residualColor = isResidualSafe ? "#00ff88" : "#ff3344";
  const residualGlow = isResidualSafe
    ? "rgba(0, 255, 136, 0.45)"
    : "rgba(255, 51, 68, 0.45)";

  const svgWidth = 800;
  const svgHeight = 320;
  const gridCols = 10;
  const gridRows = 8;

  return (
    <div className="ws1-oscilloscope-container" aria-label="Digital Storage Oscilloscope">
      {/* Top Instrument Header */}
      <div className="ws1-scope-header">
        <div className="ws1-scope-model">
          <span className="ws1-led-status-dot ws1-led-active" />
          <span className="ws1-scope-title">DSO-804A DUAL-BEAM ACOUSTIC ANALYZER</span>
          <span className="ws1-scope-rate">25.0 kSa/s • LIVE SWEEP</span>
        </div>

        <div className="ws1-scope-controls-strip">
          <div className="ws1-scale-toggle-group">
            <span className="ws1-scale-label">TIMEBASE:</span>
            {["1.0ms", "2.0ms", "5.0ms"].map((scale) => (
              <button
                key={scale}
                type="button"
                className={`ws1-scale-btn ${timebaseScale === scale ? "ws1-scale-btn-active" : ""}`}
                onClick={() => setTimebaseScale(scale)}
              >
                {scale}/div
              </button>
            ))}
          </div>

          <div className="ws1-trigger-badge">
            <span className="ws1-trigger-dot" />
            <span>TRIG: CH1 AUTO</span>
          </div>
        </div>
      </div>

      {/* SVG Screen Display */}
      <div className="ws1-scope-screen">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="ws1-scope-svg"
          preserveAspectRatio="none"
          role="img"
          aria-label="Oscilloscope Waveform Display"
        >
          {/* Subtle Background Graticule Grid */}
          <g className="ws1-graticule-grid" opacity="0.35">
            {/* Vertical time grid lines */}
            {Array.from({ length: gridCols + 1 }).map((_, i) => {
              const x = (i * svgWidth) / gridCols;
              const isCenter = i === gridCols / 2;
              return (
                <line
                  key={`v-${i}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={svgHeight}
                  stroke={isCenter ? "#00ff88" : "#213348"}
                  strokeWidth={isCenter ? 1.4 : 0.8}
                  strokeDasharray={isCenter ? undefined : "3 3"}
                  opacity={isCenter ? 0.7 : 0.4}
                />
              );
            })}

            {/* Horizontal voltage grid lines */}
            {Array.from({ length: gridRows + 1 }).map((_, i) => {
              const y = (i * svgHeight) / gridRows;
              const isCenter = i === gridRows / 2;
              return (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={y}
                  x2={svgWidth}
                  y2={y}
                  stroke={isCenter ? "#00ff88" : "#213348"}
                  strokeWidth={isCenter ? 1.4 : 0.8}
                  strokeDasharray={isCenter ? undefined : "3 3"}
                  opacity={isCenter ? 0.7 : 0.4}
                />
              );
            })}

            {/* Sub-division ticks on center axes */}
            {Array.from({ length: 41 }).map((_, i) => {
              const x = (i * svgWidth) / 40;
              const centerY = svgHeight / 2;
              return (
                <line
                  key={`tick-x-${i}`}
                  x1={x}
                  y1={centerY - 3}
                  x2={x}
                  y2={centerY + 3}
                  stroke="#00ff88"
                  strokeWidth="0.8"
                  opacity="0.6"
                />
              );
            })}
          </g>

          {/* Reference Baseline Label */}
          <text
            x="8"
            y={svgHeight / 2 - 6}
            fill="#567290"
            fontSize="10"
            fontFamily="monospace"
          >
            0.0 V (GROUND REFERENCE)
          </text>

          {/* Render Waveforms */}
          {/* CH1: Original Noise (Red) */}
          <Waveform
            samples={originalSamples}
            width={svgWidth}
            height={svgHeight}
            color="#ff3344"
            glowColor="rgba(255, 51, 68, 0.4)"
            label="ORIGINAL NOISE"
            visible={showOriginal}
            maxAmplitude={120}
          />

          {/* CH2: Anti-Noise (Cyan) */}
          <Waveform
            samples={antiNoiseSamples}
            width={svgWidth}
            height={svgHeight}
            color="#00e5ff"
            glowColor="rgba(0, 229, 255, 0.4)"
            label="ANTI-NOISE"
            visible={showAntiNoise}
            maxAmplitude={120}
          />

          {/* CH3: Residual Superposition (Green/Red) */}
          <Waveform
            samples={residualSamples}
            width={svgWidth}
            height={svgHeight}
            color={residualColor}
            glowColor={residualGlow}
            strokeWidth={3}
            label="RESIDUAL NOISE"
            visible={showResidual}
            maxAmplitude={120}
          />

          {/* Moving Scan Beam Indicator */}
          <line
            className="ws1-scan-beam"
            x1="0"
            y1="0"
            x2="0"
            y2={svgHeight}
            stroke="rgba(0, 255, 136, 0.25)"
            strokeWidth="3"
          />
        </svg>

        {/* Screen Watermark & Status Pill */}
        <div className="ws1-screen-overlay-stats">
          <span className="ws1-screen-stat">
            LIMIT: <strong>{safeNoiseLimitDb} dB</strong>
          </span>
          <span className="ws1-screen-stat">
            PHASE: <strong className={isPhaseAcceptable ? "ws1-text-safe" : "ws1-text-alert"}>{isPhaseAcceptable ? "LOCKED" : "UNLOCKED"}</strong>
          </span>
          <span className="ws1-screen-stat">
            FREQ: <strong className={isFrequencyLocked ? "ws1-text-safe" : "ws1-text-alert"}>{isFrequencyLocked ? "SYNC" : "DRIFT"}</strong>
          </span>
          <span className="ws1-screen-stat">
            RESIDUAL RMS: <strong>{residualRms.toFixed(1)}</strong>
          </span>
          <span className="ws1-screen-stat">
            EFFICIENCY: <strong>{cancellationEfficiency}%</strong>
          </span>
          <span
            className={`ws1-screen-stat ${
              isResidualSafe ? "ws1-text-safe" : "ws1-text-alert"
            }`}
          >
            {isResidualSafe ? "INTERFERENCE: DESTRUCTIVE (SAFE)" : "INTERFERENCE: INCOMPLETE"}
          </span>
        </div>
      </div>

      {/* Channel Toggles & Channel Legends */}
      <div className="ws1-channels-panel">
        {/* CH1: Original */}
        <button
          type="button"
          className={`ws1-ch-badge ws1-ch1 ${!showOriginal ? "ws1-ch-muted" : ""}`}
          onClick={() => setShowOriginal(!showOriginal)}
          aria-pressed={showOriginal}
          title="Toggle Channel 1 (Original Noise)"
        >
          <span className="ws1-ch-indicator ws1-ind-red" />
          <div className="ws1-ch-details">
            <span className="ws1-ch-name">CH1: ORIGINAL NOISE</span>
            <span className="ws1-ch-meta">RMS: {originalRms.toFixed(1)}</span>
          </div>
        </button>

        {/* CH2: Anti-Noise */}
        <button
          type="button"
          className={`ws1-ch-badge ws1-ch2 ${!showAntiNoise ? "ws1-ch-muted" : ""}`}
          onClick={() => setShowAntiNoise(!showAntiNoise)}
          aria-pressed={showAntiNoise}
          title="Toggle Channel 2 (Anti-Noise)"
        >
          <span className="ws1-ch-indicator ws1-ind-cyan" />
          <div className="ws1-ch-details">
            <span className="ws1-ch-name">CH2: ANTI-NOISE</span>
            <span className="ws1-ch-meta">RMS: {antiNoiseRms.toFixed(1)}</span>
          </div>
        </button>

        {/* CH3 / MATH: Residual */}
        <button
          type="button"
          className={`ws1-ch-badge ws1-ch3 ${
            isResidualSafe ? "ws1-ch-safe" : "ws1-ch-alert"
          } ${!showResidual ? "ws1-ch-muted" : ""}`}
          onClick={() => setShowResidual(!showResidual)}
          aria-pressed={showResidual}
          title="Toggle Math Channel 3 (Residual Superposition)"
        >
          <span
            className={`ws1-ch-indicator ${
              isResidualSafe ? "ws1-ind-green" : "ws1-ind-crimson"
            }`}
          />
          <div className="ws1-ch-details">
            <span className="ws1-ch-name">MATH: RESIDUAL NOISE</span>
            <span className="ws1-ch-meta">
              RMS: {residualRms.toFixed(1)} | {residualNoiseDb.toFixed(1)} dB
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
