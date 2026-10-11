import { useState } from "react";

export default function QuestionCard({
  question,
  submittedAnswer = null, // { selected: "B", isCorrect: true, wrongAttempts: 0 }
  onSubmitAnswer,
  isLocked = false,
}) {
  // Track local user selection per question ID: { [questionId]: { selectedOption, feedback } }
  const [localSelections, setLocalSelections] = useState({});

  if (!question) return null;

  const isVerified = Boolean(submittedAnswer && submittedAnswer.isCorrect);
  const currentLocal = localSelections[question.id];

  // Derive active selection and feedback status
  let selectedOption = null;
  let feedback = null;

  if (isVerified) {
    selectedOption = submittedAnswer.selected;
    feedback = "correct";
  } else if (currentLocal && currentLocal.selectedOption !== undefined) {
    selectedOption = currentLocal.selectedOption;
    feedback = currentLocal.feedback;
  } else if (submittedAnswer) {
    selectedOption = submittedAnswer.selected;
    feedback = submittedAnswer.isCorrect ? "correct" : "incorrect";
  }

  const handleSelect = (optionId) => {
    if (isVerified || isLocked) return;
    setLocalSelections((prev) => ({
      ...prev,
      [question.id]: {
        selectedOption: optionId,
        feedback: null, // Clear error banner on new selection so user can try fresh
      },
    }));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!selectedOption || isVerified || isLocked) return;

    const isCorrect = selectedOption === question.correctAnswer;
    setLocalSelections((prev) => ({
      ...prev,
      [question.id]: {
        selectedOption,
        feedback: isCorrect ? "correct" : "incorrect",
      },
    }));

    if (onSubmitAnswer) {
      onSubmitAnswer({
        questionId: question.id,
        selected: selectedOption,
        isCorrect,
      });
    }
  };

  return (
    <div className={`ws1-question-card ${feedback ? `ws1-card-${feedback}` : ""}`}>
      <div className="ws1-question-header">
        <span className="ws1-question-tag">{question.title || "TECHNICAL VERIFICATION"}</span>
        {isVerified && (
          <span className="ws1-badge-verified">
            <span aria-hidden="true">✓</span> VERIFIED
          </span>
        )}
      </div>

      <h3 className="ws1-question-prompt">{question.prompt}</h3>

      <div className="ws1-options-list" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          let optionClass = "";

          if (isVerified) {
            if (opt.id === question.correctAnswer) {
              optionClass = "ws1-option-correct";
            }
          } else if (feedback === "incorrect" && isSelected) {
            optionClass = "ws1-option-wrong";
          } else if (isSelected) {
            optionClass = "ws1-option-selected";
          }

          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isVerified || isLocked}
              className={`ws1-option-btn ${optionClass}`}
              onClick={() => handleSelect(opt.id)}
            >
              <span className="ws1-option-badge">{opt.label}</span>
              <span className="ws1-option-text">{opt.text}</span>
              {isVerified && opt.id === question.correctAnswer && (
                <span className="ws1-opt-icon-correct" aria-hidden="true">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`ws1-feedback-banner ${
            feedback === "correct" ? "ws1-feedback-success" : "ws1-feedback-error"
          }`}
          role="alert"
        >
          <div className="ws1-feedback-header">
            <span className="ws1-feedback-icon" aria-hidden="true">
              {feedback === "correct" ? "✓" : "⚠"}
            </span>
            <span className="ws1-feedback-title">
              {feedback === "correct" ? "CORRECT ANSWER" : "INCORRECT RESPONSE"}
            </span>
          </div>
          <p className="ws1-feedback-text">
            {feedback === "correct"
              ? question.explanation
              : "Incorrect response. Review broadcast telemetry, latency, and CDN architecture to select an alternate response."}
          </p>
        </div>
      )}

      {!isVerified && (
        <div className="ws1-question-actions">
          <button
            type="button"
            className="ws1-submit-btn"
            disabled={!selectedOption || isLocked}
            onClick={handleSubmit}
          >
            CONFIRM SUBMISSION
          </button>
        </div>
      )}
    </div>
  );
}
