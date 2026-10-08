import { useState } from "react";
import { stationConfig } from "../config/stationConfig";

export default function HintPanel({ hintsUsed, onUnlockHint }) {
  const [isOpen, setIsOpen] = useState(false);
  const nextAvailableHint = stationConfig.hints.find(
    (h) => !hintsUsed.includes(h.id)
  );

  return (
    <div className="ws4-hint-card" id="ws4-hints-panel">
      <div className="ws4-hint-header">
        <span>SECURITY ADVISORY // HINTS</span>
        <span style={{ fontSize: "10px", color: "var(--ws4-text-secondary)" }}>
          USED: {hintsUsed.length} / {stationConfig.hints.length}
        </span>
      </div>

      {!isOpen ? (
        <button
          type="button"
          className="ws4-hint-btn"
          onClick={() => setIsOpen(true)}
          id="ws4-need-help-btn"
        >
          [ NEED HELP? ]
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {hintsUsed.map((hintId) => {
            const hintObj = stationConfig.hints.find((h) => h.id === hintId);
            if (!hintObj) return null;
            return (
              <div key={hintObj.id} className="ws4-hint-content">
                <div
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 800,
                    color: "var(--ws4-amber-warn)",
                    marginBottom: "3px",
                  }}
                >
                  {hintObj.title} (-{hintObj.cost} PTS)
                </div>
                <div>{hintObj.text}</div>
              </div>
            );
          })}

          {nextAvailableHint ? (
            <button
              type="button"
              className="ws4-hint-btn"
              onClick={() => onUnlockHint(nextAvailableHint.id)}
              id={`ws4-unlock-hint-${nextAvailableHint.id}`}
            >
              UNLOCK {nextAvailableHint.title} (-{nextAvailableHint.cost} PTS)
            </button>
          ) : (
            <div style={{ fontSize: "10.5px", color: "var(--ws4-text-muted)" }}>
              ALL AVAILABLE ADVISORIES UNLOCKED
            </div>
          )}

          <button
            type="button"
            className="ws4-btn"
            style={{ fontSize: "10px", padding: "4px 8px" }}
            onClick={() => setIsOpen(false)}
          >
            COLLAPSE ADVISORY
          </button>
        </div>
      )}
    </div>
  );
}
