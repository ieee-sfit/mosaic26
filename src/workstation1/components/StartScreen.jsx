import { useState, useEffect } from "react";
import raceDuelImage from "../../assets/ford_vs_ferrari_duel.jpg";

export default function StartScreen({
  onStartShift,
  onOpenLeaderboard,
  initialOperatorName = "Shelby F1 Pit Wall",
}) {
  const [operatorName, setOperatorName] = useState(initialOperatorName);
  const [countdown, setCountdown] = useState(null); // null | 3 | 2 | 1

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 1) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 950);
      return () => clearTimeout(timer);
    }

    if (countdown === 1) {
      const timer = setTimeout(() => {
        setCountdown(null);
        onStartShift(operatorName || "Pit Wall Crew");
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [countdown, onStartShift, operatorName]);

  const handleStartClick = () => {
    setCountdown(3);
  };

  return (
    <div className="ws1-start-screen">
      <div className="ws1-start-card">
        {countdown !== null ? (
          <div className="ws1-countdown-overlay" aria-live="assertive">
            <div className="ws1-f1-gantry-lights" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((lightIdx) => {
                const isLit = lightIdx <= (4 - countdown) * 2;
                return (
                  <div
                    key={lightIdx}
                    className={`ws1-gantry-light ${isLit ? "ws1-light-red-on" : ""}`}
                  />
                );
              })}
            </div>

            <div className="ws1-countdown-badge">F1 BROADCAST SYSTEM INITIALIZING</div>
            <div className="ws1-countdown-number">{countdown}</div>
            <div className="ws1-countdown-text">
              CONNECTING PIT-WALL TELEMETRY TO CDN BACKHAUL...
            </div>
          </div>
        ) : (
          <>
            <div className="ws1-start-badge-strip">
              <span className="ws1-badge-pill ws1-pill-blue">FORD MOTOR CO.</span>
              <span className="ws1-badge-pill ws1-pill-red">SCUDERIA FERRARI</span>
              <span className="ws1-badge-pill">F1 BROADCAST ARCHITECTURE</span>
            </div>

            <div className="ws1-start-header">
              <div className="ws1-start-title-row">
                <span className="ws1-live-badge-glow">● LIVE BROADCAST</span>
                <h1 className="ws1-start-title">F1 0-LAG STREAM</h1>
              </div>
              <h2 className="ws1-start-subtitle">FORD VS FERRARI</h2>
              <div className="ws1-start-tagline">
                THE RACE IS LIVE. THE STREAM IS FAILING.
              </div>
            </div>

            {/* Race Preview Backdrop */}
            <div className="ws1-start-race-preview">
              <img
                src={raceDuelImage}
                alt="Ford GT40 vs Ferrari 330 P4 duel"
                className="ws1-start-img"
              />
              <div className="ws1-start-img-overlay">
                <span className="ws1-img-hud-item">LE MANS CIRCUIT • DUSK REGIME</span>
                <span className="ws1-img-hud-item ws1-hud-warn">LATENCY CRITICAL: 2.8s</span>
              </div>
            </div>

            <div className="ws1-briefing-panel">
              <div className="ws1-briefing-title">
                <span className="ws1-radar-icon" aria-hidden="true">📡</span>
                <span>MISSION BRIEFING</span>
              </div>
              <p className="ws1-briefing-text">
                "A broadcast traffic spike has pushed race-stream latency beyond the
                permitted threshold. Your team has 12 minutes to stabilize the network,
                rebalance global CDN edge traffic, and restore a smooth live broadcast
                under 1.5 seconds."
              </p>
            </div>

            <div className="ws1-spec-grid">
              <div className="ws1-spec-card">
                <span className="ws1-spec-label">SHIFT TIME</span>
                <span className="ws1-spec-value">12:00</span>
                <span className="ws1-spec-hint">Countdown Active</span>
              </div>

              <div className="ws1-spec-card">
                <span className="ws1-spec-label">CREW SIZE</span>
                <span className="ws1-spec-value">2–3 PARTICIPANTS</span>
                <span className="ws1-spec-hint">Engineering Station</span>
              </div>

              <div className="ws1-spec-card ws1-spec-warn">
                <span className="ws1-spec-label">TARGET LATENCY</span>
                <span className="ws1-spec-value ws1-text-safe">&lt; 1.50 SEC</span>
                <span className="ws1-spec-hint">Current: 2.80s (Degraded)</span>
              </div>
            </div>

            <div className="ws1-operator-input-box">
              <label htmlFor="ws1-operator-input" className="ws1-operator-label">
                ENGINEERING CALLSIGN / PIT WALL ID
              </label>
              <input
                id="ws1-operator-input"
                type="text"
                className="ws1-operator-input"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Enter Callsign / Crew Name..."
                maxLength={32}
              />
            </div>

            <div className="ws1-start-action-row">
              <button
                type="button"
                className="ws1-start-btn"
                onClick={handleStartClick}
                autoFocus
              >
                <span className="ws1-start-btn-icon" aria-hidden="true">🏁</span>
                <span>START RACE SHIFT</span>
              </button>

              {onOpenLeaderboard && (
                <button
                  type="button"
                  className="ws1-start-secondary-btn"
                  onClick={onOpenLeaderboard}
                  id="ws1-start-leaderboard-btn"
                >
                  <span aria-hidden="true">🏆</span>
                  <span>LEADERBOARD</span>
                </button>
              )}
            </div>

            <div className="ws1-start-footer-note">
              <span>VISUAL SIMULATION ONLY</span>
              <span className="ws1-divider">•</span>
              <span>NO PHYSICAL AUDIO PLAYBACK</span>
              <span className="ws1-divider">•</span>
              <span>EVERY MILLISECOND COUNTS. EVERY SECOND WINS.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
