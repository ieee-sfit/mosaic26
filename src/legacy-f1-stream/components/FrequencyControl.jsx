export default function FrequencyControl({
  frequency = 220, // in Hz
  targetFrequency = 200,
  tolerancePercent = 1,
  isLocked = false,
  onChange,
  disabled = false,
}) {
  const handleSliderChange = (e) => {
    if (disabled) return;
    onChange(Number(e.target.value));
  };

  const handleNudge = (delta) => {
    if (disabled) return;
    const next = Math.max(100, Math.min(400, frequency + delta));
    onChange(next);
  };

  const diffHz = Math.abs(frequency - targetFrequency);
  const maxTolHz = ((tolerancePercent / 100) * targetFrequency).toFixed(1);

  return (
    <div className={`ws1-control-card ${isLocked ? "ws1-control-locked" : ""}`}>
      <div className="ws1-control-header">
        <div className="ws1-control-title-group">
          <span className="ws1-control-tag">FREQUENCY SYNCHRONIZATION</span>
          <span className="ws1-control-target-note">
            TARGET: {targetFrequency} Hz (±{maxTolHz} Hz / {tolerancePercent}%)
          </span>
        </div>
        <div
          className={`ws1-lock-badge ${
            isLocked ? "ws1-badge-success" : "ws1-badge-unlocked"
          }`}
        >
          {isLocked ? "FREQUENCY LOCKED" : `MISMATCH (Δ ${diffHz} Hz)`}
        </div>
      </div>

      <div className="ws1-freq-body">
        {/* Dual Frequency Comparison Readout */}
        <div className="ws1-freq-compare-grid">
          <div className="ws1-freq-box ws1-box-orig">
            <span className="ws1-freq-sub">ORIGINAL NOISE</span>
            <span className="ws1-freq-number">{targetFrequency} Hz</span>
          </div>

          <div className="ws1-freq-sync-indicator" aria-hidden="true">
            <span className={`ws1-sync-symbol ${isLocked ? "ws1-sync-active" : ""}`}>
              {isLocked ? "⇄ SYNCHRONIZED" : "≠ DRIFTING"}
            </span>
          </div>

          <div className={`ws1-freq-box ws1-box-anti ${isLocked ? "ws1-freq-matched" : ""}`}>
            <span className="ws1-freq-sub">ANTI-NOISE GENERATOR</span>
            <span className="ws1-freq-number">{frequency} Hz</span>
          </div>
        </div>

        {/* Fine Nudge Controls */}
        <div className="ws1-control-readout-row">
          <span className="ws1-readout-label">ADJUST CARRIER TONE:</span>
          <div className="ws1-nudge-row">
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleNudge(-10)}
              disabled={disabled}
              title="Step -10 Hz"
            >
              -10
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleNudge(-1)}
              disabled={disabled}
              title="Step -1 Hz"
            >
              -1
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleNudge(1)}
              disabled={disabled}
              title="Step +1 Hz"
            >
              +1
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleNudge(10)}
              disabled={disabled}
              title="Step +10 Hz"
            >
              +10
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="ws1-slider-track-wrap">
          <input
            type="range"
            min="100"
            max="400"
            step="1"
            value={frequency}
            onChange={handleSliderChange}
            disabled={disabled}
            className="ws1-range-slider"
            aria-label="Anti-noise frequency in Hz"
          />
          <div className="ws1-slider-ticks">
            <span>100 Hz</span>
            <span>175 Hz</span>
            <span>250 Hz</span>
            <span>325 Hz</span>
            <span>400 Hz</span>
          </div>
        </div>
      </div>
    </div>
  );
}
