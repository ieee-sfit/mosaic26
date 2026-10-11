export default function CDNNode({ node, isSelected = false, onSelect }) {
  const { name, region, code, utilization, latencyMs, allocation, status } = node;

  let statusClass = "ws1-node-healthy";
  let statusText = "HEALTHY";
  if (status === "CRITICAL" || utilization >= 88) {
    statusClass = "ws1-node-critical";
    statusText = "CRITICAL";
  } else if (status === "OVERLOADED" || status === "ELEVATED" || utilization >= 75) {
    statusClass = "ws1-node-overloaded";
    statusText = "OVERLOADED";
  }

  return (
    <div
      className={`ws1-cdn-node-card ${statusClass} ${isSelected ? "ws1-node-selected" : ""}`}
      onClick={() => onSelect && onSelect(node.id)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect && onSelect(node.id);
        }
      }}
    >
      <div className="ws1-node-header">
        <div className="ws1-node-identity">
          <span className="ws1-node-name">{name}</span>
          <span className="ws1-node-code">{code} • {region}</span>
        </div>
        <span className={`ws1-node-status-pill ${statusClass}`}>{statusText}</span>
      </div>

      <div className="ws1-node-metrics-grid">
        <div className="ws1-node-kpi">
          <span className="ws1-node-kpi-label">LOAD</span>
          <span className="ws1-node-kpi-val">{utilization}%</span>
        </div>
        <div className="ws1-node-kpi">
          <span className="ws1-node-kpi-label">LATENCY</span>
          <span className="ws1-node-kpi-val">{latencyMs}ms</span>
        </div>
        <div className="ws1-node-kpi">
          <span className="ws1-node-kpi-label">ALLOCATION</span>
          <span className="ws1-node-kpi-val ws1-val-alloc">{allocation}%</span>
        </div>
      </div>

      {/* Progress Load Bar */}
      <div className="ws1-node-bar-track">
        <div
          className={`ws1-node-bar-fill ${
            utilization >= 88
              ? "ws1-bar-red"
              : utilization >= 75
              ? "ws1-bar-amber"
              : "ws1-bar-blue"
          }`}
          style={{ width: `${utilization}%` }}
        />
        <div className="ws1-node-threshold-marker" title="75% Ceiling" />
      </div>
    </div>
  );
}
