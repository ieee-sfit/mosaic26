import { questions } from "../config/questions";
import { stationConfig } from "../config/stationConfig";

export function calculateScore(state) {
  const {
    moduleAAnswers = {},
    circuitSolved = false,
    moduleBAnswers = {},
    tolerancesSafe = false,
    bypassTriggered = false,
    authorized = false,
    moduleCAnswers = {},
    hintsUsed = [],
    errors = 0,
  } = state;

  // MODULE A (Max 20)
  const qListA = questions.moduleA;
  const correctACount = qListA.filter((q) => moduleAAnswers[q.id]?.isCorrect).length;
  let scoreA = Math.round((correctACount / qListA.length) * 20);
  const wrongAAttempts = qListA.reduce(
    (sum, q) => sum + (moduleAAnswers[q.id]?.wrongAttempts || 0),
    0
  );
  scoreA = Math.max(0, scoreA - wrongAAttempts * stationConfig.penalties.wrongQuestionAnswer);

  // MODULE B (Max 35)
  let scoreB = 0;
  if (circuitSolved) {
    scoreB += 25;
  }
  if (moduleBAnswers.q_mod_b_1?.isCorrect) {
    scoreB += 10;
  }
  const wrongBQuestionAttempts = moduleBAnswers.q_mod_b_1?.wrongAttempts || 0;
  const wrongGateAttempts = state.wrongGateAttempts || 0;
  const penaltyB =
    wrongBQuestionAttempts * stationConfig.penalties.wrongQuestionAnswer +
    wrongGateAttempts * stationConfig.penalties.wrongGatePlacement;
  scoreB = Math.max(0, scoreB - penaltyB);

  // MODULE C (Max 45)
  let scoreC = 0;
  if (tolerancesSafe) scoreC += 15;
  if (!bypassTriggered) scoreC += 5; // Reward for safety discipline
  if (authorized) scoreC += 10;
  const qListC = questions.moduleC;
  const correctCCount = qListC.filter((q) => moduleCAnswers[q.id]?.isCorrect).length;
  scoreC += Math.round((correctCCount / qListC.length) * 15);
  const wrongCQuestionAttempts = qListC.reduce(
    (sum, q) => sum + (moduleCAnswers[q.id]?.wrongAttempts || 0),
    0
  );
  const wrongCodeAttempts = state.wrongCodeAttempts || 0;
  const penaltyC =
    wrongCQuestionAttempts * stationConfig.penalties.wrongQuestionAnswer +
    wrongCodeAttempts * stationConfig.penalties.wrongPasscodeAttempt +
    (bypassTriggered ? stationConfig.penalties.bypassActivation : 0);
  scoreC = Math.max(0, scoreC - penaltyC);

  // HINT PENALTIES
  let hintDeduction = 0;
  hintsUsed.forEach((hintId) => {
    const hintObj = stationConfig.hints.find((h) => h.id === hintId);
    if (hintObj) {
      hintDeduction += hintObj.cost;
    }
  });

  const rawTotal = scoreA + scoreB + scoreC - hintDeduction;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  return {
    totalScore,
    moduleA: {
      score: scoreA,
      max: stationConfig.moduleWeights.moduleA,
      completed: questions.moduleA.every((q) => moduleAAnswers[q.id]?.isCorrect),
    },
    moduleB: {
      score: scoreB,
      max: stationConfig.moduleWeights.moduleB,
      completed: Boolean(circuitSolved && moduleBAnswers.q_mod_b_1?.isCorrect),
      circuitSolved,
    },
    moduleC: {
      score: scoreC,
      max: stationConfig.moduleWeights.moduleC,
      completed: Boolean(
        tolerancesSafe &&
          authorized &&
          questions.moduleC.every((q) => moduleCAnswers[q.id]?.isCorrect)
      ),
      authorized,
    },
    hintDeduction,
    errors,
  };
}

export function formatStationResult(state, scoreData, timeRemaining) {
  return {
    stationId: stationConfig.stationId,
    stationName: stationConfig.stationName,
    completed: Boolean(state.isCompleted),
    score: scoreData.totalScore,
    timeRemaining: Math.max(0, Math.round(timeRemaining)),
    errors: state.errors || 0,
    hintsUsed: (state.hintsUsed || []).length,

    moduleA: {
      completed: scoreData.moduleA.completed,
      score: scoreData.moduleA.score,
    },

    moduleB: {
      completed: scoreData.moduleB.completed,
      score: scoreData.moduleB.score,
      circuitSolved: scoreData.moduleB.circuitSolved,
    },

    moduleC: {
      completed: scoreData.moduleC.completed,
      score: scoreData.moduleC.score,
      authorized: scoreData.moduleC.authorized,
    },
  };
}
