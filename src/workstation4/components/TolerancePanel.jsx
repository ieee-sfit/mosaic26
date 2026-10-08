import { stationConfig } from "../config/stationConfig";

export default function TolerancePanel({
  values,
  onChangeValue,
  allSafe,
}) {
  const params = Object.values(stationConfig.tolerance);

  const handleAdjust = (id, delta) => {
    const config = stationConfig.tolerance[id];
    if (!config) return;
    const current = values[id] ?? config.initial;
    const next = Math.max(config.sliderMin, Math.min(config.sliderMax, current + delta));
    onChangeValue(id, next);
  };

  const handleSliderChange = (id, e) => {
    const next = Number(e.target.value);
    onChangeValue(id, next);
  };

  return (
    <div className="ws4-tolerance-panel" id="ws4-tolerance-panel">
      <div className="ws4-tolerance-title">
        <span>FACILITY SAFETY PARAMETERS</span>
        <span
          style={{
            color: allSafe ? "var(--ws4-neon-green)" : "var(--ws4-amber-warn)",
            fontSize: "11px",
          }}
        >
          {allSafe ? "● ALL SENSORS NOMINAL" : "⚠ SENSORS OUT OF SPEC"}
        </span>
      </div>

      {params.map((param) => {
        const val = values[param.id] ?? param.initial;
        const isInRange = val >= param.min && val <= param.max;

        return (
          <div key={param.id} className="ws4-tolerance-item">
            <div className="ws4-tol-top">
              <span className="ws4-tol-name">{param.label}</span>
              <span className="ws4-tol-safe-range">
                SAFE: {param.min}–{param.max}
                {param.unit}
              </span>
            </div>

            <div className="ws4-tol-val-row">
              <span
                className={`ws4-tol-val ${isInRange ? "ws4-in-range" : "ws4-out-range"}`}
              >
                {val}
                <span style={{ fontSize: "12px", marginLeft: "2px" }}>{param.unit}</span>
              </span>

              <button
                type="button"
                className="ws4-tol-step-btn"
                onClick={() => handleAdjust(param.id, -param.step)}
                aria-label={`Decrease ${param.label}`}
              >
                -
              </button>

              <input
                type="range"
                className="ws4-tol-slider"
                min={param.sliderMin}
                max={param.sliderMax}
                step={param.step}
                value={val}
                onChange={(e) => handleSliderChange(param.id, e)}
                aria-label={`${param.label} slider`}
              />

              <button
                type="button"
                className="ws4-tol-step-btn"
                onClick={() => handleAdjust(param.id, param.step)}
                aria-label={`Increase ${param.label}`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
