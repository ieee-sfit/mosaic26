export default function AmplitudeControl({
  amplitude = 45, // 0 to 100%
  targetAmplitude = 75,
  tolerance = 5,
  isMatched = false,
  onChange,
  disabled = false,
}) {
  const handleSliderChange = (e) => {
    if (disabled) return;
    onChange(Number(e.target.value));
  };

  const handleNudge = (delta) => {
    if (disabled) return;
    const next = Math.max(0, Math.min(100, amplitude + delta));
    onChange(next);
  };

  const diff = Math.abs(amplitude - targetAmplitude);

  return (
    <div className={`ws1-control-card ${isMatched ? "ws1-control-locked" : ""}`}>
      <div className="ws1-control-header">
        <div className="ws1-control-title-group">
          <span className="ws1-control-tag">ANTI-NOISE AMPLITUDE</span>
          <span className="ws1-control-target-note">
            TARGET: {targetAmplitude}% (±{tolerance}%)
          </span>
        </div>
        <div
          className={`ws1-lock-badge ${
            isMatched ? "ws1-badge-success" : "ws1-badge-unlocked"
          }`}
        >
          {isMatched ? "AMPLITUDE MATCHED" : `MISMATCH (Δ ${diff}%)`}
        </div>
      </div>

      <div className="ws1-amplitude-body">
        {/* Visual Bar Level Meter */}
        <div className="ws1-level-bar-container">
          <div
            className={`ws1-level-bar-fill ${isMatched ? "ws1-fill-matched" : ""}`}
            style={{ width: `${amplitude}%` }}
          />
          {/* Target marker notch */}
          <div
            className="ws1-target-marker-notch"
            style={{ left: `${targetAmplitude}%` }}
            title={`Target: ${targetAmplitude}%`}
          />
        </div>

        {/* Digital Readout & Fine Nudge Buttons */}
        <div className="ws1-control-readout-row">
          <div className="ws1-readout-box">
            <span className="ws1-readout-label">ANTI-NOISE POWER</span>
            <span className="ws1-readout-value">{amplitude}%</span>
          </div>

          <div className="ws1-nudge-row">
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleNudge(-5)}
              disabled={disabled}
              title="Step -5%"
            >
              -5%
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleNudge(-1)}
              disabled={disabled}
              title="Step -1%"
            >
              -1%
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleNudge(1)}
              disabled={disabled}
              title="Step +1%"
            >
              +1%
            </button>
            <button
              type="button"
              className="ws1-nudge-btn"
              onClick={() => handleNudge(5)}
              disabled={disabled}
              title="Step +5%"
            >
              +5%
            </button>
          </div>
        </div>

        {/* Precision Range Slider */}
        <div className="ws1-slider-track-wrap">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={amplitude}
            onChange={handleSliderChange}
            disabled={disabled}
            className="ws1-range-slider"
            aria-label="Anti-noise amplitude percentage"
          />
          <div className="ws1-slider-ticks">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
