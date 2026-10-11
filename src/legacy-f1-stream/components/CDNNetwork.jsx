import CDNNode from "./CDNNode";

export default function CDNNetwork({ nodes, selectedNodeId, onSelectNode }) {
  if (!nodes) return null;

  const origin = nodes.origin;
  const eu = nodes.eu_edge;
  const na = nodes.na_edge;
  const asia = nodes.asia_edge;
  const sa = nodes.sa_edge;

  const getPathColor = (node) => {
    if (!node) return "#1687FF";
    if (node.utilization >= 88) return "#E10600";
    if (node.utilization >= 75) return "#FFB020";
    return "#1687FF";
  };

  return (
    <div className="ws1-cdn-network-container" aria-label="Global CDN Network Topology Map">
      <div className="ws1-network-map-header">
        <div className="ws1-net-header-title">
          <span className="ws1-radar-pulse" aria-hidden="true" />
          <span>GLOBAL CDN EDGE DISTRIBUTION TOPOLOGY</span>
        </div>
        <div className="ws1-net-legend">
          <span className="ws1-legend-item"><span className="ws1-leg-dot ws1-leg-blue" /> OPTIMAL (&lt;75%)</span>
          <span className="ws1-legend-item"><span className="ws1-leg-dot ws1-leg-amber" /> CONGESTED (75-87%)</span>
          <span className="ws1-legend-item"><span className="ws1-leg-dot ws1-leg-red" /> CRITICAL (88%+)</span>
        </div>
      </div>

      {/* SVG Interactive Topology Diagram */}
      <div className="ws1-topology-canvas-wrap">
        <svg
          viewBox="0 0 900 360"
          className="ws1-topology-svg"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            {/* Pulsing linear gradients for edge links */}
            <linearGradient id="grad-eu" x1="50%" y1="50%" x2="20%" y2="20%">
              <stop offset="0%" stopColor="#1687FF" />
              <stop offset="100%" stopColor={getPathColor(eu)} />
            </linearGradient>
            <linearGradient id="grad-na" x1="50%" y1="50%" x2="80%" y2="20%">
              <stop offset="0%" stopColor="#1687FF" />
              <stop offset="100%" stopColor={getPathColor(na)} />
            </linearGradient>
            <linearGradient id="grad-asia" x1="50%" y1="50%" x2="20%" y2="80%">
              <stop offset="0%" stopColor="#1687FF" />
              <stop offset="100%" stopColor={getPathColor(asia)} />
            </linearGradient>
            <linearGradient id="grad-sa" x1="50%" y1="50%" x2="80%" y2="80%">
              <stop offset="0%" stopColor="#1687FF" />
              <stop offset="100%" stopColor={getPathColor(sa)} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g opacity="0.15">
            <line x1="0" y1="180" x2="900" y2="180" stroke="#1687FF" strokeDasharray="4 4" />
            <line x1="450" y1="0" x2="450" y2="360" stroke="#1687FF" strokeDasharray="4 4" />
            <circle cx="450" cy="180" r="140" fill="none" stroke="#1687FF" strokeDasharray="6 6" />
          </g>

          {/* Connected Flow Paths from Center (450, 180) */}
          {/* Path 1: Center -> Europe Edge (Top Left: 180, 75) */}
          <path
            d="M 450,180 L 180,75"
            fill="none"
            stroke={getPathColor(eu)}
            strokeWidth="3"
            strokeDasharray="6 6"
            className="ws1-flow-path"
          />

          {/* Path 2: Center -> North America Edge (Top Right: 720, 75) */}
          <path
            d="M 450,180 L 720,75"
            fill="none"
            stroke={getPathColor(na)}
            strokeWidth="3"
            strokeDasharray="6 6"
            className="ws1-flow-path"
          />

          {/* Path 3: Center -> Asia Edge (Bottom Left: 180, 285) */}
          <path
            d="M 450,180 L 180,285"
            fill="none"
            stroke={getPathColor(asia)}
            strokeWidth="3"
            strokeDasharray="6 6"
            className="ws1-flow-path"
          />

          {/* Path 4: Center -> South America Edge (Bottom Right: 720, 285) */}
          <path
            d="M 450,180 L 720,285"
            fill="none"
            stroke={getPathColor(sa)}
            strokeWidth="3"
            strokeDasharray="6 6"
            className="ws1-flow-path"
          />
        </svg>

        {/* DOM Node Cards laid out over topology */}
        <div className="ws1-topology-nodes-overlay">
          <div className="ws1-node-pos ws1-pos-eu">
            <CDNNode
              node={eu}
              isSelected={selectedNodeId === "eu_edge"}
              onSelect={onSelectNode}
            />
          </div>

          <div className="ws1-node-pos ws1-pos-na">
            <CDNNode
              node={na}
              isSelected={selectedNodeId === "na_edge"}
              onSelect={onSelectNode}
            />
          </div>

          <div className="ws1-node-pos ws1-pos-origin">
            <CDNNode
              node={origin}
              isSelected={selectedNodeId === "origin"}
              onSelect={onSelectNode}
            />
          </div>

          <div className="ws1-node-pos ws1-pos-asia">
            <CDNNode
              node={asia}
              isSelected={selectedNodeId === "asia_edge"}
              onSelect={onSelectNode}
            />
          </div>

          <div className="ws1-node-pos ws1-pos-sa">
            <CDNNode
              node={sa}
              isSelected={selectedNodeId === "sa_edge"}
              onSelect={onSelectNode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
