import { useState } from "react";
import TolerancePanel from "./TolerancePanel";
import BypassSwitch from "./BypassSwitch";
import AuthorizationKeypad from "./AuthorizationKeypad";
import QuestionCard from "./QuestionCard";
import { questions } from "../config/questions";

export default function ModuleC({
  toleranceValues,
  onChangeTolerance,
  allTolerancesSafe,
  isBypassActive,
  onToggleBypass,
  isAuthorized,
  onAuthorized,
  onFailedAuthAttempt,
  moduleAnswers = {},
  onSubmitAnswer,
  isModuleACompleted,
  isCircuitSolved,
  safeOutput,
  onTriggerFinalAuthorization,
}) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);

  const qList = questions.moduleC;
  const currentQ = qList[currentQIndex] || qList[0];
  const allQuestionsComplete = qList.every((q) => moduleAnswers[q.id]?.isCorrect);

  const allConditionsSatisfied =
    isModuleACompleted &&
    isCircuitSolved &&
    safeOutput === 1 &&
    allTolerancesSafe &&
    !isBypassActive &&
    isAuthorized &&
    allQuestionsComplete;

  const handleAuthorizeClick = () => {
    if (!allConditionsSatisfied || isVerifying) return;
    setIsVerifying(true);

    const steps = [
      "LOGIC INTEGRITY",
      "POWER STABILITY",
      "DOOR INTERLOCK",
      "FIRE STATUS",
      "SECURITY AUTHORIZATION",
      "BYPASS STATUS",
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      setVerifyStep(current);
      if (current >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          onTriggerFinalAuthorization();
        }, 600);
      }
    }, 400);
  };

  const verificationItems = [
    { label: "MODULE A KNOWLEDGE CHECK", satisfied: isModuleACompleted },
    { label: "CIRCUIT REPAIRED (AND GATE)", satisfied: isCircuitSolved },
    { label: "SAFE_OUTPUT = HIGH / 1", satisfied: safeOutput === 1 && !isBypassActive },
    { label: "SAFETY PARAMETERS IN TOLERANCE", satisfied: allTolerancesSafe },
    { label: "EMERGENCY BYPASS DISABLED", satisfied: !isBypassActive },
    { label: "AUTHORIZATION CODE (1947)", satisfied: isAuthorized },
    { label: "FAIL-SAFE QUESTIONS VERIFIED", satisfied: allQuestionsComplete },
  ];

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
        <span className="ws4-module-timer-hint">TARGET TIME: 06:00</span>
      </div>

      <div className="ws4-module-body">
        {/* Two-column industrial grid for Tolerances & Keypad */}
        <div className="ws4-mod-c-grid">
          {/* Left Column: Tolerance Parameters & Bypass Warning */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <TolerancePanel
              values={toleranceValues}
              onChangeValue={onChangeTolerance}
              allSafe={allTolerancesSafe}
            />

            <BypassSwitch
              isBypassActive={isBypassActive}
              onToggleBypass={onToggleBypass}
            />
          </div>

          {/* Right Column: Keypad & Module C Questions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <AuthorizationKeypad
              onAuthorized={onAuthorized}
              isAuthorized={isAuthorized}
              onFailedAttempt={onFailedAuthAttempt}
            />

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
                      Q{idx + 1} {moduleAnswers[q.id]?.isCorrect ? "\u2713" : ""}
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
          </div>
        </div>

        {/* Final Authorization Readiness & Execution Panel */}
        <div className="ws4-final-auth-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--ws4-border-subtle)",
              paddingBottom: "8px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>
              AUTHORIZATION READINESS MATRIX
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: allConditionsSatisfied ? "var(--ws4-neon-green)" : "var(--ws4-amber-warn)",
              }}
            >
              {allConditionsSatisfied ? "READY FOR AUTHORIZATION" : "PENDING VERIFICATION CRITERIA"}
            </span>
          </div>

          <div className="ws4-auth-checklist">
            {verificationItems.map((item, idx) => (
              <div
                key={idx}
                className={`ws4-check-item ${
                  item.satisfied ? "ws4-checked" : "ws4-pending"
                }`}
              >
                <span>{item.satisfied ? "\u2713" : "\u2717"}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {isVerifying ? (
            <div
              style={{
                background: "#000",
                border: "2px solid var(--ws4-neon-green)",
                borderRadius: "4px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ color: "var(--ws4-neon-green)", fontWeight: 800, fontSize: "14px" }}>
                SYSTEM CHECK IN PROGRESS...
              </div>
              <div style={{ fontSize: "12px", color: "#c4d1e2" }}>
                {verifyStep >= 1 && <div>\u2713 LOGIC INTEGRITY</div>}
                {verifyStep >= 2 && <div>\u2713 POWER STABILITY</div>}
                {verifyStep >= 3 && <div>\u2713 DOOR INTERLOCK</div>}
                {verifyStep >= 4 && <div>\u2713 FIRE STATUS</div>}
                {verifyStep >= 5 && <div>\u2713 SECURITY AUTHORIZATION</div>}
                {verifyStep >= 6 && <div>\u2713 BYPASS STATUS</div>}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="ws4-authorize-facility-btn"
              disabled={!allConditionsSatisfied}
              onClick={handleAuthorizeClick}
              id="ws4-authorize-facility-btn"
            >
              [ AUTHORIZE FACILITY ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
