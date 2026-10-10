import { useState, useEffect, useRef } from "react";
import TolerancePanel from "./TolerancePanel";
import AuthorizationKeypad from "./AuthorizationKeypad";
import QuestionCard from "./QuestionCard";
import { questions } from "../config/questions";

export default function ModuleC({
  toleranceValues,
  onChangeTolerance,
  allTolerancesSafe,
  isAuthorized,
  onAuthorized,
  onFailedAuthAttempt,
  moduleAnswers = {},
  onSubmitAnswer,
  isModuleACompleted,
  isCircuitSolved,
  safeOutput,
  onTriggerFinalAuthorization,
  clearanceCode = "1947",
  onSetClearanceCode,
}) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [targetCode, setTargetCode] = useState(() => {
    return clearanceCode && clearanceCode.length === 4 ? clearanceCode : "1947";
  });
  const [displayDigits, setDisplayDigits] = useState(() => {
    return clearanceCode && clearanceCode.length === 4
      ? clearanceCode.split("")
      : ["•", "•", "•", "•"];
  });
  const [lockedIndices, setLockedIndices] = useState([false, false, false, false]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [keypadPrefill, setKeypadPrefill] = useState("");
  const hasAnimatedRef = useRef(false);

  const qList = questions.moduleC;
  const currentQ = qList[currentQIndex] || qList[0];
  const allQuestionsComplete = qList.every((q) => moduleAnswers[q.id]?.isCorrect);
  const isFullyReady = allQuestionsComplete && allTolerancesSafe;

  // Progressive slot-machine cipher decryption animation
  useEffect(() => {
    if (!isFullyReady) return;
    if (hasAnimatedRef.current) return;

    hasAnimatedRef.current = true;

    // Pick or generate random 4-digit code
    const newCode = String(Math.floor(1000 + Math.random() * 9000));
    setTargetCode(newCode);
    if (onSetClearanceCode) {
      onSetClearanceCode(newCode);
    }

    setIsDecrypting(true);
    setIsDecrypted(false);

    const hexChars = "0123456789ABCDEF";
    let tick = 0;

    const interval = setInterval(() => {
      tick++;

      // Progressively lock digits into place
      const lock0 = tick > 8;
      const lock1 = tick > 16;
      const lock2 = tick > 24;
      const lock3 = tick > 32;

      setLockedIndices([lock0, lock1, lock2, lock3]);

      setDisplayDigits([
        lock0 ? newCode[0] : hexChars[Math.floor(Math.random() * hexChars.length)],
        lock1 ? newCode[1] : hexChars[Math.floor(Math.random() * hexChars.length)],
        lock2 ? newCode[2] : hexChars[Math.floor(Math.random() * hexChars.length)],
        lock3 ? newCode[3] : hexChars[Math.floor(Math.random() * hexChars.length)],
      ]);

      if (tick >= 34) {
        clearInterval(interval);
        setDisplayDigits(newCode.split(""));
        setLockedIndices([true, true, true, true]);
        setIsDecrypting(false);
        setIsDecrypted(true);
      }
    }, 55);

    return () => clearInterval(interval);
  }, [isFullyReady, onSetClearanceCode]);

  // If questions are already completed and animation previously ran, ensure ready state
  useEffect(() => {
    // Only restore state if we are fully ready, NOT decrypting, AND we've already decrypted successfully
    // This prevents the animation from being skipped during state transitions.
    if (isFullyReady && !isDecrypting && isDecrypted && hasAnimatedRef.current) {
      setDisplayDigits((targetCode || clearanceCode || "1947").split(""));
      setLockedIndices([true, true, true, true]);
    }
  }, [isFullyReady, isDecrypting, isDecrypted, targetCode, clearanceCode]);

  const handleKeypadAuthorized = (code) => {
    if (onAuthorized) onAuthorized(code);
    if (onTriggerFinalAuthorization) onTriggerFinalAuthorization();
  };

  const handleInsertIntoKeypad = () => {
    const code = targetCode || clearanceCode || "1947";
    setKeypadPrefill(code);
  };

  return (
    <div className="ws4-center-panel" id="ws4-module-c-panel">
      <div className="ws4-module-header">
        <div className="ws4-module-title-wrap">
          <h2 className="ws4-module-title">
            MODULE C: FINAL FACILITY AUTHORIZATION
          </h2>
          <span className="ws4-module-subtitle">
            TOLERANCE CALIBRATION // FAIL-SAFE POLICIES // COMMAND AUTHORIZATION
          </span>
        </div>
      </div>

      <div className="ws4-module-body">
        {/* Two-column industrial grid for Tolerances & Keypad */}
        <div className="ws4-mod-c-grid">
          {/* Left Column: Tolerance Parameters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <TolerancePanel
              values={toleranceValues}
              onChangeValue={onChangeTolerance}
              allSafe={allTolerancesSafe}
            />
          </div>

          {/* Right Column: Module C Questions (Above), Clearance Code Banner & Keypad (Below) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Questions Section */}
            <div
              style={{
                background: "var(--ws4-bg-surface)",
                border: "1px solid var(--ws4-border-subtle)",
                borderRadius: "4px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "var(--ws4-cyan-accent)",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <span>FAIL-SAFE PROTOCOL CHECKS</span>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {qList.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      className={`ws4-btn ${idx === currentQIndex ? "ws4-btn-primary" : ""}`}
                      style={{ fontSize: "10px", padding: "2px 7px" }}
                      onClick={() => setCurrentQIndex(idx)}
                    >
                      Q{idx + 1} {moduleAnswers[q.id]?.isCorrect ? "✓" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <QuestionCard
                key={currentQ.id}
                question={currentQ}
                onSubmitAnswer={onSubmitAnswer}
                alreadyAnswered={Boolean(moduleAnswers[currentQ.id]?.isCorrect)}
                savedSelectedKey={moduleAnswers[currentQ.id]?.selectedKey}
                onNext={() => {
                  if (currentQIndex < qList.length - 1) {
                    setCurrentQIndex((prev) => prev + 1);
                  }
                }}
                hasNext={
                  currentQIndex < qList.length - 1 &&
                  Boolean(moduleAnswers[currentQ.id]?.isCorrect)
                }
              />
            </div>

            {/* Generated Random Clearance Code Animation Banner */}
            {isFullyReady && (
              <div
                className="ws4-cipher-generator-card"
                style={{
                  background: "linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(0, 255, 127, 0.12) 100%)",
                  border: isDecrypted
                    ? "1px solid var(--ws4-neon-green)"
                    : "1px solid var(--ws4-cyan-accent)",
                  boxShadow: isDecrypted
                    ? "0 0 25px rgba(0, 255, 127, 0.3)"
                    : "0 0 20px rgba(0, 229, 255, 0.25)",
                  borderRadius: "4px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  animation: "ws4FadeIn 0.5s ease-out",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 900,
                      color: "var(--ws4-cyan-accent)",
                      letterSpacing: "1px",
                    }}
                  >
                    ⚡ CLEARANCE CIPHER PROTOCOL
                  </span>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "3px",
                      background: isDecrypting
                        ? "rgba(255, 170, 0, 0.2)"
                        : "rgba(0, 255, 127, 0.2)",
                      color: isDecrypting ? "var(--ws4-amber-warn)" : "var(--ws4-neon-green)",
                      border: `1px solid ${
                        isDecrypting ? "var(--ws4-amber-warn)" : "var(--ws4-neon-green)"
                      }`,
                    }}
                  >
                    {isDecrypting ? "DECRYPTING CIPHER..." : "✓ CIPHER DECRYPTED"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "4px 0",
                  }}
                >
                  {displayDigits.map((digit, i) => {
                    const isLocked = lockedIndices[i] || isDecrypted;
                    return (
                      <div
                        key={i}
                        style={{
                          width: "48px",
                          height: "56px",
                          background: "#04070a",
                          border: `2px solid ${
                            isLocked
                              ? "var(--ws4-neon-green)"
                              : isDecrypting
                              ? "var(--ws4-cyan-accent)"
                              : "var(--ws4-border-subtle)"
                          }`,
                          boxShadow: isLocked
                            ? "0 0 16px rgba(0, 255, 127, 0.55), inset 0 0 8px rgba(0, 255, 127, 0.2)"
                            : isDecrypting
                            ? "0 0 14px rgba(0, 229, 255, 0.4)"
                            : "none",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "26px",
                          fontWeight: 900,
                          fontFamily: "var(--ws4-font-mono)",
                          color: isLocked ? "#00ff7f" : isDecrypting ? "#00e5ff" : "#64748b",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {digit}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: isDecrypting ? "#8b9bb4" : "#c4d1e2",
                    textAlign: "center",
                    fontWeight: 600,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>
                    {isDecrypting
                      ? "AUTHENTICATING FACILITY CLEARANCE PROTOCOLS..."
                      : "ENTER THIS 4-DIGIT SECURITY CODE INTO THE KEYPAD BELOW & PRESS [ENT]"}
                  </span>

                  {isDecrypted && (
                    <button
                      type="button"
                      className="ws4-btn ws4-btn-primary"
                      onClick={handleInsertIntoKeypad}
                      style={{
                        fontSize: "11px",
                        padding: "5px 12px",
                        letterSpacing: "0.8px",
                        marginTop: "2px",
                      }}
                    >
                      [ 📋 INSERT {targetCode} INTO KEYPAD ]
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Keypad Section (Below) */}
            <AuthorizationKeypad
              targetCode={targetCode || clearanceCode || "1947"}
              isUnlocked={isFullyReady}
              onAuthorized={handleKeypadAuthorized}
              isAuthorized={isAuthorized}
              onFailedAttempt={onFailedAuthAttempt}
              externalCode={keypadPrefill}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
