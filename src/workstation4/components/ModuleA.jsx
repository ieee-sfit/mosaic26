import { useState } from "react";
import QuestionCard from "./QuestionCard";
import { questions } from "../config/questions";

export default function ModuleA({
  moduleAnswers = {},
  onSubmitAnswer,
  onModuleCompleted,
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const questionList = questions.moduleA;
  const currentQ = questionList[currentQuestionIndex] || questionList[0];

  const allVerified = questionList.every((q) => moduleAnswers[q.id]?.isCorrect);

  const handleNext = () => {
    if (currentQuestionIndex < questionList.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const currentAnswerData = moduleAnswers[currentQ.id];

  return (
    <div className="ws4-center-panel" id="ws4-module-a-panel">
      <div className="ws4-module-header">
        <div className="ws4-module-title-wrap">
          <h2 className="ws4-module-title">
            MODULE A: SYSTEM KNOWLEDGE CHECK
            {allVerified && <span className="ws4-badge-done">\u2713 COMPLETE</span>}
          </h2>
          <span className="ws4-module-subtitle">
            DIAGNOSTIC PROTOCOL // DIGITAL LOGIC FOUNDATION VERIFICATION
          </span>
        </div>
        <span className="ws4-module-timer-hint">TARGET TIME: 01:30</span>
      </div>

      <div className="ws4-module-body">
        {/* Progress tabs for questions */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          {questionList.map((q, idx) => {
            const ans = moduleAnswers[q.id];
            const isCurrent = idx === currentQuestionIndex;
            return (
              <button
                key={q.id}
                type="button"
                className={`ws4-btn ${isCurrent ? "ws4-btn-primary" : ""}`}
                style={{
                  fontSize: "11px",
                  padding: "5px 10px",
                  borderColor: ans?.isCorrect ? "var(--ws4-neon-green)" : undefined,
                }}
                onClick={() => setCurrentQuestionIndex(idx)}
              >
                Q{idx + 1} {ans?.isCorrect ? "\u2713" : ""}
              </button>
            );
          })}
        </div>

        <QuestionCard
          key={currentQ.id}
          question={currentQ}
          onSubmitAnswer={onSubmitAnswer}
          alreadyAnswered={Boolean(currentAnswerData?.isCorrect)}
          savedSelectedKey={currentAnswerData?.selectedKey}
          onNext={handleNext}
          hasNext={currentQuestionIndex < questionList.length - 1 && Boolean(currentAnswerData?.isCorrect)}
        />

        {allVerified && (
          <div
            style={{
              background: "rgba(0, 255, 127, 0.08)",
              border: "1px solid var(--ws4-neon-green-dim)",
              borderRadius: "4px",
              padding: "16px",
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
                  fontSize: "14px",
                }}
              >
                \u2713 KNOWLEDGE VERIFIED
              </div>
              <div style={{ fontSize: "11.5px", color: "#8b9bb4", marginTop: "2px" }}>
                Basic Boolean logic verified. Proceed to facility emergency interlock schematic.
              </div>
            </div>

            <button
              type="button"
              className="ws4-btn ws4-btn-primary"
              onClick={onModuleCompleted}
              id="ws4-proceed-to-b-btn"
            >
              PROCEED TO MODULE B \u2192
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
