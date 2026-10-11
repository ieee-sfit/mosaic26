export default function StationTimer({ timeRemaining = 720 }) {
  const safeTime = Math.max(0, timeRemaining);
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;

  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  const isLowTime = safeTime <= 120 && safeTime > 60;
  const isCriticalTime = safeTime <= 60;

  return (
    <div
      className={`ws1-timer-container ${
        isCriticalTime ? "ws1-timer-critical" : isLowTime ? "ws1-timer-warning" : ""
      }`}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${formattedMinutes} minutes and ${formattedSeconds} seconds`}
    >
      <div className="ws1-timer-header">
        <span className="ws1-timer-icon" aria-hidden="true">⏱</span>
        <span className="ws1-timer-label">SHIFT CLOCK</span>
      </div>
      <div className="ws1-timer-digits">
        <span className="ws1-digit">{formattedMinutes}</span>
        <span className="ws1-colon">:</span>
        <span className="ws1-digit">{formattedSeconds}</span>
      </div>
    </div>
  );
}
