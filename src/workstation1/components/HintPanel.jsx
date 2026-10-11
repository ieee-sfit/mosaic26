import { useState } from "react";
import { station1Config } from "../config/stationConfig";

export default function HintPanel({
  hintsUsed = [], // Array of hint IDs unlocked: ["hint-1"]
  onUnlockHint,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const allHints = station1Config.hints;
  const nextHintIndex = hintsUsed.length;
  const hasMoreHints = nextHintIndex < allHints.length;
  const nextHint = hasMoreHints ? allHints[nextHintIndex] : null;

  const handleRequestNextHint = () => {
    if (nextHint && onUnlockHint) {
      onUnlockHint(nextHint.id);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        className="ws1-hint-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open Technical Hints"
      >
        <span className="ws1-hint-icon" aria-hidden="true">💡</span>
        <span>NEED HELP?</span>
        {hintsUsed.length > 0 && (
          <span className="ws1-hint-count-pill">{hintsUsed.length}</span>
        )}
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          className="ws1-modal-backdrop"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="ws1-hint-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ws1-hint-modal-title"
          >
            <div className="ws1-modal-header">
              <div className="ws1-modal-title-wrap">
                <span className="ws1-modal-icon" aria-hidden="true">💡</span>
                <h3 id="ws1-hint-modal-title" className="ws1-modal-title">
                  F1 RACE STREAM GUIDANCE
                </h3>
              </div>
              <button
                type="button"
                className="ws1-modal-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close guidance panel"
              >
                ✕
              </button>
            </div>

            <div className="ws1-hint-penalty-alert">
              <span className="ws1-alert-icon" aria-hidden="true">⚠</span>
              <span>
                Each unlocked hint incurs a {station1Config.scoring.hintPenalty}-point deduction
                from the station evaluation score.
              </span>
            </div>

            {/* Unlocked Hints List */}
            <div className="ws1-hints-list">
              {allHints.map((hint, index) => {
                const isUnlocked = hintsUsed.includes(hint.id);
                return (
                  <div
                    key={hint.id}
                    className={`ws1-hint-item ${
                      isUnlocked ? "ws1-hint-unlocked" : "ws1-hint-locked"
                    }`}
                  >
                    <div className="ws1-hint-level-badge">
                      <span>LEVEL {index + 1}</span>
                      {isUnlocked && <span className="ws1-hint-tag-active">UNLOCKED</span>}
                    </div>
                    {isUnlocked ? (
                      <div className="ws1-hint-content">
                        <h4 className="ws1-hint-name">{hint.title}</h4>
                        <p className="ws1-hint-body">{hint.text}</p>
                      </div>
                    ) : (
                      <div className="ws1-hint-placeholder">
                        <span className="ws1-lock-icon" aria-hidden="true">🔒</span>
                        <span>Tier {index + 1} Guidance Locked</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Request Next Hint Action */}
            <div className="ws1-modal-footer">
              {hasMoreHints ? (
                <button
                  type="button"
                  className="ws1-request-hint-btn"
                  onClick={handleRequestNextHint}
                >
                  <span>REQUEST HINT {nextHintIndex + 1}</span>
                  <span className="ws1-hint-sub">(-{station1Config.scoring.hintPenalty} pts)</span>
                </button>
              ) : (
                <div className="ws1-all-hints-unlocked-note">
                  ALL GUIDANCE PROTOCOLS UNLOCKED
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
