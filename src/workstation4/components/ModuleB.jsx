import CircuitBoard from "./CircuitBoard";
import QuestionCard from "./QuestionCard";
import { questions } from "../config/questions";

export default function ModuleB({
  inputs,
  onToggleInput,
  slotBGateType,
  onChangeSlotBGate,
  onCircuitVerified,
  isCircuitSolved,
  moduleAnswers = {},
  onSubmitAnswer,
  onModuleCompleted,
  isCompleted,
  isBypassActive,
}) {
  const verificationQ = questions.moduleB[0];
  const qAns = moduleAnswers[verificationQ.id];
  const isQuestionAnsweredCorrectly = Boolean(qAns?.isCorrect);

  return (
    <div className="ws4-center-panel" id="ws4-module-b-panel">
      <div className="ws4-module-header">
        <div className="ws4-module-title-wrap">
          <h2 className="ws4-module-title">
            MODULE B: EMERGENCY INTERLOCK REPAIR
            {isCompleted && <span className="ws4-badge-done">✓ COMPLETE</span>}
          </h2>
          <span className="ws4-module-subtitle">
            DIAGNOSE LOGIC FAILURE // REPLACE INCORRECT GATE // VERIFY FAIL-SAFE CRITERIA
          </span>
        </div>
        <span className="ws4-module-timer-hint">TARGET TIME: 04:30</span>
      </div>

      <div className="ws4-module-body">
        <div
          style={{
            background: "#080c12",
            borderLeft: "3px solid var(--ws4-cyan-accent)",
            padding: "10px 14px",
            borderRadius: "3px",
            fontSize: "12px",
            lineHeight: "1.4",
            color: "#c4d2e5",
          }}
        >
          <strong>OPERATIONAL BRIEF:</strong> The facility supervisory circuit detected an unsafe
          logic condition. The secondary interlock branch (GATE 02) contains an incorrect gate type.
          Locate the error, drag/click the correct gate from the toolbox into Slot B, and verify
          that <strong>SAFE_OUTPUT = HIGH / 1</strong> only when all 4 facility lines are secure.
        </div>

        {/* Live Interactive Circuit Board */}
        <CircuitBoard
          inputs={inputs}
          onToggleInput={onToggleInput}
          slotBGateType={slotBGateType}
          onChangeSlotBGate={onChangeSlotBGate}
          onCircuitVerified={onCircuitVerified}
          isCircuitSolved={isCircuitSolved}
          isBypassActive={isBypassActive}
        />

        {/* Post-circuit verification question */}
        {isCircuitSolved && (
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "var(--ws4-cyan-accent)",
                letterSpacing: "1px",
              }}
            >
              MODULE B LOGIC PRINCIPLE VERIFICATION:
            </div>

            <QuestionCard
              key={verificationQ.id}
              question={verificationQ}
              onSubmitAnswer={onSubmitAnswer}
              alreadyAnswered={isQuestionAnsweredCorrectly}
              savedSelectedKey={qAns?.selectedKey}
            />

            {isQuestionAnsweredCorrectly && (
              <div
                style={{
                  background: "rgba(0, 255, 127, 0.08)",
                  border: "1px solid var(--ws4-neon-green-dim)",
                  borderRadius: "4px",
                  padding: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "var(--ws4-neon-green)",
                      fontWeight: 900,
                      letterSpacing: "1.5px",
                      fontSize: "13px",
                    }}
                  >
                    ✓ MODULE B VERIFIED
                  </div>
                  <div style={{ fontSize: "11px", color: "#8b9bb4" }}>
                    Interlock logic restored to nominal AND configuration. Ready for final authorization.
                  </div>
                </div>

                <button
                  type="button"
                  className="ws4-btn ws4-btn-primary"
                  onClick={onModuleCompleted}
                  id="ws4-proceed-to-c-btn"
                >
                  PROCEED TO MODULE C ➔
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
