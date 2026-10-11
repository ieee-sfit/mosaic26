export default function TrafficControls({
  allocations,
  totalAllocation,
  isAllocationValid,
  onChangeAllocation,
  onApplyOptimalDistribution,
  onResetDistribution,
}) {
  const handleSlider = (nodeKey, value) => {
    const val = Number(value);
    onChangeAllocation(nodeKey, val);
  };

  const handleNudge = (nodeKey, delta) => {
    const current = allocations[nodeKey] || 0;
    const next = Math.max(0, Math.min(100, current + delta));
    onChangeAllocation(nodeKey, next);
  };

  const controlList = [
    { key: "eu_edge", label: "EUROPE EDGE", code: "LHR-04 (Silverstone)" },
    { key: "na_edge", label: "NORTH AMERICA EDGE", code: "ORD-02 (Detroit)" },
    { key: "asia_edge", label: "ASIA EDGE", code: "NRT-07 (Suzuka)" },
    { key: "sa_edge", label: "SOUTH AMERICA EDGE", code: "GRU-03 (Interlagos)" },
    { key: "origin", label: "PRIMARY ORIGIN", code: "FRA-01 (Frankfurt)" },
  ];

  return (
    <div className="ws1-traffic-controls-panel" aria-label="CDN Traffic Allocation Controls">
      <div className="ws1-traffic-ctrl-header">
        <div className="ws1-ctrl-title-wrap">
          <span className="ws1-ctrl-tag">CDN TRAFFIC ALLOCATION ENGINE</span>
          <span className="ws1-ctrl-desc">
            Shift viewer streams away from overloaded origin & congested edge PoPs.
          </span>
        </div>

        {/* 100% Allocation Balance Pill */}
        <div
          className={`ws1-total-alloc-pill ${
            isAllocationValid ? "ws1-alloc-valid" : "ws1-alloc-invalid"
          }`}
        >
          <span className="ws1-alloc-label">TOTAL ALLOCATION:</span>
          <span className="ws1-alloc-val">{totalAllocation}% / 100%</span>
          {isAllocationValid ? (
            <span className="ws1-alloc-check" aria-hidden="true">✓ BALANCED</span>
          ) : (
            <span className="ws1-alloc-warn" aria-hidden="true">
              ⚠ {totalAllocation > 100 ? `OVER (+${totalAllocation - 100}%)` : `UNDER (-${100 - totalAllocation}%)`}
            </span>
          )}
        </div>
      </div>

      {/* Grid of Sliders */}
      <div className="ws1-traffic-sliders-grid">
        {controlList.map((item) => {
          const val = allocations[item.key] || 0;
          return (
            <div key={item.key} className="ws1-traffic-fader-card">
              <div className="ws1-fader-top">
                <span className="ws1-fader-label">{item.label}</span>
                <span className="ws1-fader-percent">{val}%</span>
              </div>
              <span className="ws1-fader-code">{item.code}</span>

              {/* Slider */}
              <div className="ws1-slider-track-wrap">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={val}
                  onChange={(e) => handleSlider(item.key, e.target.value)}
                  className="ws1-range-slider"
                  aria-label={`Traffic allocation for ${item.label}`}
                />
              </div>

              {/* Nudge Buttons */}
              <div className="ws1-fader-nudge-row">
                <button
                  type="button"
                  className="ws1-nudge-btn"
                  onClick={() => handleNudge(item.key, -5)}
                  title="-5%"
                >
                  -5
                </button>
                <button
                  type="button"
                  className="ws1-nudge-btn"
                  onClick={() => handleNudge(item.key, -1)}
                  title="-1%"
                >
                  -1
                </button>
                <button
                  type="button"
                  className="ws1-nudge-btn"
                  onClick={() => handleNudge(item.key, 1)}
                  title="+1%"
                >
                  +1
                </button>
                <button
                  type="button"
                  className="ws1-nudge-btn"
                  onClick={() => handleNudge(item.key, 5)}
                  title="+5%"
                >
                  +5
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Presets */}
      <div className="ws1-traffic-presets-row">
        <button
          type="button"
          className="ws1-preset-action-btn ws1-btn-optimal"
          onClick={onApplyOptimalDistribution}
        >
          <span aria-hidden="true">⚡</span>
          <span>APPLY OPTIMAL RACE DISTRIBUTION (35% EU / 30% NA / 18% ASIA / 12% SA / 5% ORIGIN)</span>
        </button>

        <button
          type="button"
          className="ws1-preset-action-btn ws1-btn-reset"
          onClick={onResetDistribution}
        >
          <span aria-hidden="true">↺</span>
          <span>RESET TO CRISIS DEFAULT</span>
        </button>
      </div>
    </div>
  );
}
