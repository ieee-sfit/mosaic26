import { useState } from "react";
import { stationConfig } from "../config/stationConfig";

export default function AuthorizationKeypad({
  onAuthorized,
  isAuthorized = false,
  onFailedAttempt,
}) {
  const [enteredCode, setEnteredCode] = useState("");
  const [feedback, setFeedback] = useState(
    isAuthorized
      ? { type: "accepted", message: "AUTHORIZATION ACCEPTED" }
      : null
  );

  const handleDigit = (digit) => {
    if (isAuthorized) return;
    if (enteredCode.length < 4) {
      const next = enteredCode + digit;
      setEnteredCode(next);
      setFeedback(null);
    }
  };

  const handleClear = () => {
    if (isAuthorized) return;
    setEnteredCode("");
    setFeedback(null);
  };

  const handleSubmit = () => {
    if (isAuthorized) return;
    if (enteredCode.length !== 4) {
      setFeedback({ type: "rejected", message: "ENTER 4 DIGITS" });
      return;
    }

    if (enteredCode === stationConfig.authorizationCode) {
      setFeedback({ type: "accepted", message: "AUTHORIZATION ACCEPTED" });
      onAuthorized();
    } else {
      setFeedback({ type: "rejected", message: "INVALID AUTHORIZATION" });
      setEnteredCode("");
      if (onFailedAttempt) {
        onFailedAttempt();
      }
    }
  };

  return (
    <div className="ws4-keypad-panel" id="ws4-keypad-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--ws4-text-secondary)" }}>
          FACILITY CLEARANCE KEYPAD
        </span>
        <span style={{ fontSize: "10px", color: "var(--ws4-cyan-accent)" }}>
          SEC-LVL: ALPHA
        </span>
      </div>

      <div className="ws4-keypad-display">
        <div className="ws4-keypad-code" id="ws4-keypad-code-display">
          {enteredCode ? enteredCode.padEnd(4, "•") : "••••"}
        </div>
        <div>
          {feedback && (
            <span
              className={`ws4-keypad-status-msg ${
                feedback.type === "accepted" ? "ws4-accepted" : "ws4-rejected"
              }`}
            >
              {feedback.message}
            </span>
          )}
        </div>
      </div>

      <div className="ws4-keypad-grid" role="group" aria-label="Security Keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            className="ws4-key-btn"
            onClick={() => handleDigit(String(num))}
            disabled={isAuthorized}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          className="ws4-key-btn ws4-clear"
          onClick={handleClear}
          disabled={isAuthorized}
        >
          CLR
        </button>

        <button
          type="button"
          className="ws4-key-btn"
          onClick={() => handleDigit("0")}
          disabled={isAuthorized}
        >
          0
        </button>

        <button
          type="button"
          className="ws4-key-btn ws4-enter"
          onClick={handleSubmit}
          disabled={isAuthorized || enteredCode.length !== 4}
          id="ws4-keypad-enter-btn"
        >
          ENT
        </button>
      </div>
    </div>
  );
}
