import { useState } from "react";
import QuestionCard from "./QuestionCard";
import { moduleAQuestions } from "../config/questions";

export default function ModuleA({
  answers = {},
  isCompleted = false,
  onSubmitAnswer,
  onProceedToModuleB,
}) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const currentQuestion = moduleAQuestions[activeQuestionIndex];
  const q1Answer = answers["moduleA_q1"];
  const q2Answer = answers["moduleA_q2"];

  const bothAnsweredCorrectly =
    Boolean(q1Answer?.isCorrect) && Boolean(q2Answer?.isCorrect);

  const handleNextQuestion = () => {
    if (activeQuestionIndex < moduleAQuestions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(activeQuestionIndex - 1);
    }
  };

  return (
    <div className="ws1-module-container ws1-module-a">
      <div className="ws1-module-header">
        <div className="ws1-mod-badge-group">
          <span className="ws1-module-code">MODULE A</span>
          <span className="ws1-module-time-est">TARGET: 01:30</span>
        </div>
        <h2 className="ws1-module-title">RACE ENGINEERING BRIEFING</h2>
        <p className="ws1-module-desc">
          Verify technical understanding of CDN edge server caching, geographic backhaul, and
          end-to-end stream latency before entering live traffic control.
        </p>
      </div>

      {/* Question Stepper Tabs */}
      <div className="ws1-q-tabs">
        {moduleAQuestions.map((q, idx) => {
          const ans = answers[q.id];
          const isDone = Boolean(ans?.isCorrect);
          const isActive = idx === activeQuestionIndex;

          return (
            <button
              key={q.id}
              type="button"
              className={`ws1-q-tab-btn ${isActive ? "ws1-q-tab-active" : ""} ${
                isDone ? "ws1-q-tab-done" : ""
              }`}
              onClick={() => setActiveQuestionIndex(idx)}
            >
              <span>{isDone ? "✓ " : ""}{q.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Question Card */}
      <div className="ws1-q-wrapper">
        <QuestionCard
          question={currentQuestion}
          submittedAnswer={answers[currentQuestion.id]}
          onSubmitAnswer={(res) => {
            onSubmitAnswer(res);
            if (res.isCorrect && activeQuestionIndex === 0) {
              setTimeout(() => {
                setActiveQuestionIndex(1);
              }, 1100);
            }
          }}
        />
      </div>

      {/* Nav Row */}
      <div className="ws1-q-nav-row">
        <button
          type="button"
          className="ws1-q-prev-btn"
          disabled={activeQuestionIndex === 0}
          onClick={handlePrevQuestion}
        >
          ← PREVIOUS QUESTION
        </button>

        {activeQuestionIndex < moduleAQuestions.length - 1 ? (
          <button
            type="button"
            className="ws1-q-next-btn"
            disabled={!q1Answer?.isCorrect}
            onClick={handleNextQuestion}
          >
            NEXT QUESTION →
          </button>
        ) : null}
      </div>

      {/* Completion Banner */}
      {(bothAnsweredCorrectly || isCompleted) && (
        <div className="ws1-verified-box ws1-box-glow">
          <div className="ws1-verified-text-wrap">
            <span className="ws1-verified-icon" aria-hidden="true">✓</span>
            <div>
              <h4 className="ws1-verified-headline">RACE BRIEFING VERIFIED</h4>
              <p className="ws1-verified-sub">
                Core CDN streaming principles confirmed. Authorization granted to access
                live CDN edge traffic routing controls in Module B.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ws1-advance-module-btn"
            onClick={onProceedToModuleB}
          >
            PROCEED TO MODULE B (CDN CONTROL) →
          </button>
        </div>
      )}
    </div>
  );
}
