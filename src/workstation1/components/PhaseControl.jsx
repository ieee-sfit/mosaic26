import { useRef } from "react";

export default function PhaseControl({
  phase = 90, // current phase in degrees (0 to 360)
  targetPhase = 180,
  tolerance = 5,
  isAcceptable = false,
  onChange,
  disabled = false,
}) {
  const dialRef = useRef(null);

  const handleSliderChange = (e) => {
    if (disabled) return;
    const val = Number(e.target.value);
    onChange(val);
  };

  const handleStep = (delta) => {
    if (disabled) return;
    let next = (phase + delta) % 360;
    if (next < 0) next += 360;
    onChange(Math.round(next));
  };

  // Dial mouse/drag interaction
  const handleDialPointerDown = (e) => {
    e.preventDefault();
    if (disabled || !dialRef.current) return;

    const onPointerMove = (moveEvent) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;

      // Calculate angle in degrees from top (0 deg at 12 o'clock or 3 o'clock)
      let rad = Math.atan2(dy, dx); // -pi to +pi, 0 at 3 o'clock
      let deg = (rad * 180) / Math.PI + 90; // Rotate so 0 is top
      if (deg < 0) deg += 360;

      onChange(Math.round(deg) % 360);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div className={`ws1-control-card ${isAcceptable ? "ws1-control-locked" : ""}`}>
      <div className="ws1-control-header">
        <div className="ws1-control-title-group">
          <span className="ws1-control-tag">PHASE CONTROL</span>
          <span className="ws1-control-target-note">
            TARGET: {targetPhase}° (±{tolerance}°)
          </span>
        </div>
        <div
          className={`ws1-lock-badge ${
            isAcceptable ? "ws1-badge-success" : "ws1-badge-unlocked"
          }`}
        >
          {isAcceptable ? "PHASE LOCKED" : "PHASE UNLOCKED"}
        </div>
      </div>

      <div className="ws1-dial-and-readout">
        {/* Interactive Rotary Dial */}
        <div
          ref={dialRef}
          className={`ws1-rotary-dial ${isAcceptable ? "ws1-dial-acceptable" : ""}`}
          onPointerDown={handleDialPointerDown}
          role="slider"
          aria-label="Anti-noise phase angle dial"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={phase}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") handleStep(1);
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") handleStep(-1);
          }}
        >
          {/* Target phase marker line on dial rim */}
          <div
            className="ws1-dial-target-sector"
            style={{
              transform: `rotate(${targetPhase}deg)`,
            }}
            title={`Target: ${targetPhase}°`}
          />

          {/* Current dial needle */}
          <div
            className="ws1-dial-needle"
            style={{
              transform: `rotate(${phase}deg)`,
            }}
          >
            <div className="ws1-needle-tip" />
          </div>

          <div className="ws1-dial-cap">
            <span className="ws1-cap-angle">{phase}°</span>
          </div>
        </div>

        {/* Digital Readout & Preset jumps */}
        <div className="ws1-phase-meta">
          <div className="ws1-readout-box">
            <span className="ws1-readout-label">ANTI-NOISE ANGLE</span>
            <span className="ws1-readout-value">{phase.toFixed(0)}°</span>
          </div>

          <div className="ws1-nudge-row">
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleStep(-5)}
              disabled={disabled}
              title="Step -5°"
            >
              -5°
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleStep(-1)}
              disabled={disabled}
              title="Step -1°"
            >
              -1°
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleStep(1)}
              disabled={disabled}
              title="Step +1°"
            >
              +1°
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleStep(5)}
              disabled={disabled}
              title="Step +5°"
            >
              +5°
            </button>
          </div>

          <div className="ws1-preset-row">
            {[0, 90, 180, 225, 270].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`ws1-preset-btn ${phase === preset ? "ws1-preset-active" : ""}`}
                onClick={() => !disabled && onChange(preset)}
                disabled={disabled}
              >
                {preset}°
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Precision Slider Bar */}
      <div className="ws1-slider-track-wrap">
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={phase}
          onChange={handleSliderChange}
          disabled={disabled}
          className="ws1-range-slider"
          aria-label="Phase in degrees"
        />
        <div className="ws1-slider-ticks">
          <span>0°</span>
          <span>90°</span>
          <span>180°</span>
          <span>270°</span>
          <span>360°</span>
        </div>
      </div>
    </div>
  );
}
