import { station1Config } from "../config/stationConfig";

export default function BufferHealth({
  selectedBufferId = "BALANCED_LIVE",
  selectedPacketLossId = "CMAF_FEC",
  onSelectBuffer,
  onSelectPacketLoss,
}) {
  const buffers = station1Config.bufferProfiles;
  const strategies = station1Config.packetLossStrategies;

  return (
    <div className="ws1-buffer-health-grid">
      {/* Task 2: Buffer Cushion Configuration */}
      <div className="ws1-opt-task-card">
        <div className="ws1-task-card-header">
          <span className="ws1-task-badge">TASK 2</span>
          <h4 className="ws1-task-title">BUFFER HEALTH &amp; PLAYBACK CUSHION</h4>
        </div>
        <p className="ws1-task-desc">
          Configure player buffer window. Deeper buffers prevent frame stalls but introduce
          proportional broadcast latency delay.
        </p>

        <div className="ws1-profile-choice-list">
          {buffers.map((b) => {
            const isSelected = selectedBufferId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                className={`ws1-profile-card-btn ${isSelected ? "ws1-btn-choice-active" : ""}`}
                onClick={() => onSelectBuffer(b.id)}
              >
                <div className="ws1-choice-header">
                  <span className="ws1-choice-name">{b.label}</span>
                  <span className="ws1-choice-delta">
                    LATENCY: {b.latencyDelta >= 0 ? `+${b.latencyDelta}s` : `${b.latencyDelta}s`}
                  </span>
                </div>
                <p className="ws1-choice-body">{b.description}</p>
                <span className="ws1-choice-meta">STALL RISK: {b.stallRisk}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task 3: Packet Loss Mitigation Strategy */}
      <div className="ws1-opt-task-card">
        <div className="ws1-task-card-header">
          <span className="ws1-task-badge">TASK 3</span>
          <h4 className="ws1-task-title">PACKET-LOSS MITIGATION PROTOCOL</h4>
        </div>
        <p className="ws1-task-desc">
          Select loss-recovery strategy to protect stream integrity across congested internet
          transit backbones.
        </p>

        <div className="ws1-profile-choice-list">
          {strategies.map((s) => {
            const isSelected = selectedPacketLossId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`ws1-profile-card-btn ${isSelected ? "ws1-btn-choice-active" : ""}`}
                onClick={() => onSelectPacketLoss(s.id)}
              >
                <div className="ws1-choice-header">
                  <span className="ws1-choice-name">{s.label}</span>
                  <span className="ws1-choice-delta">
                    LOSS: {s.lossRatePercent}%
                  </span>
                </div>
                <p className="ws1-choice-body">{s.description}</p>
                <span className="ws1-choice-meta">
                  LATENCY OVERHEAD: {s.latencyDelta >= 0 ? `+${s.latencyDelta}s` : `${s.latencyDelta}s`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
