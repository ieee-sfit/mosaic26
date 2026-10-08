import { useState } from "react";

export default function QuestionCard({
  question,
  onSubmitAnswer,
  alreadyAnswered = false,
  savedSelectedKey = null,
  onNext,
  hasNext = false,
}) {
  const [selectedKey, setSelectedKey] = useState(savedSelectedKey || "");
  const [feedback, setFeedback] = useState(() => {
    if (alreadyAnswered) {
      return { isCorrect: true, message: "\u2713 CORRECT" };
    }
    return null;
  });
  const [isSubmitted, setIsSubmitted] = useState(alreadyAnswered);

  const handleSelectOption = (key) => {
    if (isSubmitted && feedback?.isCorrect) return; // Locked once verified correct
    setSelectedKey(key);
    // Clear failure feedback on new selection
    if (feedback && !feedback.isCorrect) {
      setFeedback(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedKey) return;
    const isCorrect = selectedKey === question.correctAnswer;
    const newFeedback = {
      isCorrect,
      message: isCorrect ? "\u2713 CORRECT" : "\u2717 INCORRECT",
    };
    setFeedback(newFeedback);

    if (isCorrect) {
      setIsSubmitted(true);
    }

    if (onSubmitAnswer) {
      onSubmitAnswer({
        questionId: question.id,
        selectedKey,
        isCorrect,
        timestamp: Date.now(),
      });
    }
  };

  return (
    <div className="ws4-question-card" id={`ws4-qcard-${question.id}`}>
      <div className="ws4-question-meta">
        <span>
          QUESTION {question.questionNumber} OF {question.totalInModule}
        </span>
        <span style={{ color: "var(--ws4-cyan-accent)" }}>{question.moduleTitle}</span>
      </div>

      <div className="ws4-question-prompt">{question.prompt}</div>

      <div className="ws4-options-list" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((opt) => {
          const isSelected = selectedKey === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              className={`ws4-option-btn ${isSelected ? "ws4-selected" : ""}`}
              onClick={() => handleSelectOption(opt.key)}
              role="radio"
              aria-checked={isSelected}
              disabled={isSubmitted && feedback?.isCorrect}
            >
              <span className="ws4-option-key">{opt.key}</span>
              <span className="ws4-option-text">{opt.text}</span>
            </button>
          );
        })}
      </div>

      <div className="ws4-question-actions">
        <div>
          {feedback && (
            <div
              className={`ws4-feedback-inline ${
                feedback.isCorrect ? "ws4-correct" : "ws4-incorrect"
              }`}
            >
              <span>{feedback.message}</span>
              {!feedback.isCorrect && (
                <span style={{ fontSize: "11px", fontWeight: "normal", color: "#e6edf3" }}>
                  - Select an alternate option and retry
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {!isSubmitted || !feedback?.isCorrect ? (
            <button
              type="button"
              className="ws4-btn ws4-btn-primary"
              disabled={!selectedKey}
              onClick={handleSubmit}
              id={`ws4-submit-${question.id}`}
            >
              [ SUBMIT ]
            </button>
          ) : hasNext ? (
            <button
              type="button"
              className="ws4-btn ws4-btn-primary"
              onClick={onNext}
              id="ws4-next-question-btn"
            >
              NEXT QUESTION \u2192
            </button>
          ) : (
            <div className="ws4-badge-done" style={{ padding: "6px 12px", fontSize: "11px" }}>
              \u2713 KNOWLEDGE VERIFIED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
