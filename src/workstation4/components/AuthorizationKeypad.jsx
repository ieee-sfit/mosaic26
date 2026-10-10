import { useState, useEffect } from "react";

export default function AuthorizationKeypad({
  onAuthorized,
  isAuthorized = false,
  onFailedAttempt,
  targetCode = "1947",
  isUnlocked = true,
  externalCode = "",
}) {
  const [enteredCode, setEnteredCode] = useState("");
  const [feedback, setFeedback] = useState(
    isAuthorized
      ? { type: "accepted", message: "AUTHORIZATION ACCEPTED" }
      : null
  );

  // Sync external code if passed from auto-fill
  useEffect(() => {
    if (externalCode && externalCode.length === 4 && !isAuthorized) {
      setEnteredCode(externalCode);
      setFeedback(null);
    }
  }, [externalCode, isAuthorized]);

  // Physical keyboard support for rapid input
  useEffect(() => {
    if (!isUnlocked || isAuthorized) return;

    const handleKeyDown = (e) => {
      // Numbers 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setEnteredCode((prev) => (prev.length < 4 ? prev + e.key : prev));
        setFeedback(null);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setEnteredCode((prev) => prev.slice(0, -1));
        setFeedback(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        submitCode(enteredCode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isUnlocked, isAuthorized, enteredCode, targetCode]);

  const handleDigit = (digit) => {
    if (isAuthorized || !isUnlocked) return;
    if (enteredCode.length < 4) {
      const next = enteredCode + digit;
      setEnteredCode(next);
      setFeedback(null);
    }
  };

  const handleClear = () => {
    if (isAuthorized || !isUnlocked) return;
    setEnteredCode("");
    setFeedback(null);
  };

  const submitCode = (codeToSubmit) => {
    if (isAuthorized || !isUnlocked) return;
    if (codeToSubmit.length !== 4) {
      setFeedback({ type: "rejected", message: "ENTER 4 DIGITS" });
      return;
    }

    if (codeToSubmit === targetCode) {
      setFeedback({ type: "accepted", message: "AUTHORIZATION ACCEPTED" });
      if (onAuthorized) {
        onAuthorized(targetCode);
      }
    } else {
      setFeedback({ type: "rejected", message: "INVALID CODE // RE-ENTER" });
      setEnteredCode("");
      if (onFailedAttempt) {
        onFailedAttempt();
      }
    }
  };

  const handleSubmit = () => {
    submitCode(enteredCode);
  };

  return (
    <div className="ws4-keypad-panel" id="ws4-keypad-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--ws4-text-secondary)" }}>
          FACILITY CLEARANCE KEYPAD
        </span>
        <span style={{ fontSize: "10px", color: isUnlocked ? "var(--ws4-cyan-accent)" : "var(--ws4-amber-warn)" }}>
          {isUnlocked ? "SEC-LVL: ALPHA (READY)" : "SEC-LVL: LOCKED"}
        </span>
      </div>

      <div className="ws4-keypad-display">
        <div className="ws4-keypad-code" id="ws4-keypad-code-display">
          {!isUnlocked
            ? "LOCKED"
            : enteredCode
            ? enteredCode.padEnd(4, "•")
            : "••••"}
        </div>
        <div>
          {feedback ? (
            <span
              className={`ws4-keypad-status-msg ${
                feedback.type === "accepted" ? "ws4-accepted" : "ws4-rejected"
              }`}
            >
              {feedback.message}
            </span>
          ) : !isUnlocked ? (
            <span style={{ fontSize: "10px", color: "var(--ws4-amber-warn)", fontWeight: 700 }}>
              VERIFY 5 PROTOCOL QUESTIONS FIRST
            </span>
          ) : (
            <span style={{ fontSize: "10px", color: "var(--ws4-cyan-accent)", fontWeight: 700 }}>
              INPUT 4-DIGIT CIPHER // PRESS ENT
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
            disabled={isAuthorized || !isUnlocked}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          className="ws4-key-btn ws4-clear"
          onClick={handleClear}
          disabled={isAuthorized || !isUnlocked}
        >
          CLR
        </button>

        <button
          type="button"
          className="ws4-key-btn"
          onClick={() => handleDigit("0")}
          disabled={isAuthorized || !isUnlocked}
        >
          0
        </button>

        <button
          type="button"
          className="ws4-key-btn ws4-enter"
          onClick={handleSubmit}
          disabled={isAuthorized || !isUnlocked || enteredCode.length !== 4}
          id="ws4-keypad-enter-btn"
        >
          ENT
        </button>
      </div>
    </div>
  );
}
