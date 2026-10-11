import { station1Config } from "../config/stationConfig";

export default function BitrateControls({
  selectedBitrateId = "BALANCED",
  onSelectBitrate,
}) {
  const profiles = station1Config.bitrateProfiles;

  return (
    <div className="ws1-opt-task-card">
      <div className="ws1-task-card-header">
        <span className="ws1-task-badge">TASK 1</span>
        <h4 className="ws1-task-title">BROADCAST BITRATE PROFILE</h4>
      </div>
      <p className="ws1-task-desc">
        Select stream encoding bitrate. Balancing visual fidelity against network bandwidth
        avoids edge node buffer backpressure.
      </p>

      <div className="ws1-bitrate-options-grid">
        {profiles.map((p) => {
          const isSelected = selectedBitrateId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`ws1-bitrate-btn ${isSelected ? "ws1-bitrate-active" : ""}`}
              onClick={() => onSelectBitrate(p.id)}
            >
              <div className="ws1-bitrate-top">
                <span className="ws1-bitrate-label">{p.label}</span>
                {p.isOptimal && <span className="ws1-tag-rec">RECOMMENDED</span>}
              </div>
              <p className="ws1-bitrate-body">{p.description}</p>
              <div className="ws1-bitrate-stats">
                <span>EGRESS: {p.bandwidthGbps} Gbps</span>
                <span>QUALITY: {p.qualityScore}/100</span>
                <span>LATENCY: {p.latencyDelta >= 0 ? `+${p.latencyDelta}s` : `${p.latencyDelta}s`}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
