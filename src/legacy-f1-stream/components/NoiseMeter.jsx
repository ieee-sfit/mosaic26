export default function NoiseMeter({
  originalNoiseDb = 80,
  residualNoiseDb = 80,
  safeNoiseLimitDb = 50,
  cancellationEfficiency = 0,
  isResidualSafe = false,
}) {
  // Map dB (20 to 100 dB) to percentage for meter visualization
  const minMeterDb = 20;
  const maxMeterDb = 100;
  const dbToPercent = (db) => {
    const clamped = Math.max(minMeterDb, Math.min(maxMeterDb, db));
    return ((clamped - minMeterDb) / (maxMeterDb - minMeterDb)) * 100;
  };

  const residualPercent = dbToPercent(residualNoiseDb);
  const safeThresholdPercent = dbToPercent(safeNoiseLimitDb);
  const originalPercent = dbToPercent(originalNoiseDb);

  return (
    <div className="ws1-noise-meter-card" aria-label="Acoustic Noise Pressure Meter">
      <div className="ws1-meter-top">
        <div className="ws1-meter-brand">
          <span className="ws1-meter-icon" aria-hidden="true">📊</span>
          <span className="ws1-meter-title">CABIN SOUND PRESSURE LEVEL (SPL)</span>
        </div>
        <div
          className={`ws1-meter-status-pill ${
            isResidualSafe ? "ws1-pill-safe" : "ws1-pill-alert"
          }`}
        >
          {isResidualSafe ? "CABIN STATUS: SAFE" : "CABIN STATUS: NOISE EXCEEDED"}
        </div>
      </div>

      {/* 3 Digital Key Value Indicators */}
      <div className="ws1-meter-kpi-grid">
        <div className="ws1-meter-kpi ws1-kpi-original">
          <span className="ws1-kpi-label">ORIGINAL CABIN NOISE</span>
          <div className="ws1-kpi-val-row">
            <span className="ws1-kpi-num">{originalNoiseDb.toFixed(1)}</span>
            <span className="ws1-kpi-unit">dB SPL</span>
          </div>
          <span className="ws1-kpi-sub">Baseline Unmitigated</span>
        </div>

        <div className="ws1-meter-kpi ws1-kpi-threshold">
          <span className="ws1-kpi-label">SAFE CABIN LIMIT</span>
          <div className="ws1-kpi-val-row">
            <span className="ws1-kpi-num">{safeNoiseLimitDb.toFixed(1)}</span>
            <span className="ws1-kpi-unit">dB SPL</span>
          </div>
          <span className="ws1-kpi-sub">Aviation Safety Standard</span>
        </div>

        <div
          className={`ws1-meter-kpi ws1-kpi-residual ${
            isResidualSafe ? "ws1-kpi-safe" : "ws1-kpi-exceeded"
          }`}
        >
          <span className="ws1-kpi-label">RESIDUAL CABIN NOISE</span>
          <div className="ws1-kpi-val-row">
            <span className="ws1-kpi-num">{residualNoiseDb.toFixed(1)}</span>
            <span className="ws1-kpi-unit">dB SPL</span>
          </div>
          <span className="ws1-kpi-sub">
            {isResidualSafe ? "Below 50 dB Threshold" : "Exceeds Safety Threshold"}
          </span>
        </div>

        <div className="ws1-meter-kpi ws1-kpi-efficiency">
          <span className="ws1-kpi-label">CANCELLATION EFFICIENCY</span>
          <div className="ws1-kpi-val-row">
            <span className="ws1-kpi-num">{cancellationEfficiency}%</span>
            <span className="ws1-kpi-unit">RMS DROP</span>
          </div>
          <span className="ws1-kpi-sub">Destructive Interference</span>
        </div>
      </div>

      {/* Graphical Scale & Bar with Threshold Notch */}
      <div className="ws1-spl-bar-section">
        <div className="ws1-spl-track">
          {/* Safe limit threshold vertical marker */}
          <div
            className="ws1-threshold-marker-line"
            style={{ left: `${safeThresholdPercent}%` }}
          >
            <span className="ws1-marker-bubble">LIMIT: {safeNoiseLimitDb} dB</span>
          </div>

          {/* Original noise ghost indicator */}
          <div
            className="ws1-original-ghost-marker"
            style={{ left: `${originalPercent}%` }}
            title={`Original Noise: ${originalNoiseDb} dB`}
          />

          {/* Residual sound level fill bar */}
          <div
            className={`ws1-spl-fill-bar ${
              isResidualSafe ? "ws1-fill-safe" : "ws1-fill-danger"
            }`}
            style={{ width: `${residualPercent}%` }}
          />
        </div>

        {/* Meter Axis Labels */}
        <div className="ws1-spl-axis-labels">
          <span>20 dB (Whisper)</span>
          <span>40 dB</span>
          <span className="ws1-axis-threshold">50 dB (SAFE LIMIT)</span>
          <span>70 dB</span>
          <span>85 dB (Hazard)</span>
          <span>100 dB</span>
        </div>
      </div>

      <div className="ws1-meter-disclaimer">
        <span>* Normalized simulation dB estimate based on RMS ratio. Educational acoustics model.</span>
      </div>
    </div>
  );
}
