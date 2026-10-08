export default function StationTimer({ timeRemaining, isUrgent }) {
  const safeTime = Math.max(0, Math.floor(timeRemaining));
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      className={`ws4-timer-container ${isUrgent ? "ws4-timer-urgent" : ""}`}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${formattedTime}`}
    >
      <span className="ws4-timer-label">TIME LIMIT:</span>
      <span className="ws4-timer-digits" id="ws4-timer-display">
        {formattedTime}
      </span>
    </div>
  );
}
