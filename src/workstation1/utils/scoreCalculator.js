import { station1Config } from "../config/stationConfig";

/**
 * Calculates the current and final score for F1 0-Lag Stream.
 * Clamps score to [0, 100].
 */
export function calculateScore({
  moduleAAnswers = {},
  isModuleACompleted = false,
  isLatencyTargetAchieved = false,
  moduleBAnswers = {},
  isModuleBCompleted = false,
  isBroadcastVerified = false,
  moduleCAnswers = {},
  isModuleCCompleted = false,
  wrongQuestionAttempts = 0,
  failedVerificationAttempts = 0,
  hintsUsed = [],
  errors = 0,
}) {
  const { scoring } = station1Config;

  // -------------------------------------------------------------
  // MODULE A (Max 20 Points)
  // -------------------------------------------------------------
  let moduleAScore = 0;
  const modAQ1Correct = moduleAAnswers["moduleA_q1"]?.selected === "B";
  const modAQ2Correct = moduleAAnswers["moduleA_q2"]?.selected === "C";

  if (modAQ1Correct) moduleAScore += 10;
  if (modAQ2Correct) moduleAScore += 10;

  const modAWrongCount =
    (moduleAAnswers["moduleA_q1"]?.wrongAttempts || 0) +
    (moduleAAnswers["moduleA_q2"]?.wrongAttempts || 0);
  moduleAScore = Math.max(0, moduleAScore - modAWrongCount * scoring.wrongQuestionPenalty);

  const moduleACompleted = isModuleACompleted || (modAQ1Correct && modAQ2Correct);

  // -------------------------------------------------------------
  // MODULE B (Max 35 Points)
  // Latency Target Achieved (25 pts) + Verification Question (10 pts)
  // -------------------------------------------------------------
  let moduleBScore = 0;
  if (isLatencyTargetAchieved) {
    moduleBScore += 25;
  }

  const modBQCorrect = moduleBAnswers["moduleB_q1"]?.selected === "B";
  if (modBQCorrect) {
    moduleBScore += 10;
  }

  const modBWrong =
    (moduleBAnswers["moduleB_q1"]?.wrongAttempts || 0) * scoring.wrongQuestionPenalty +
    (failedVerificationAttempts || 0) * scoring.failedVerificationPenalty;
  moduleBScore = Math.max(0, moduleBScore - modBWrong);

  const moduleBCompleted = isModuleBCompleted || (isLatencyTargetAchieved && modBQCorrect);

  // -------------------------------------------------------------
  // MODULE C (Max 45 Points)
  // Broadcast Authorization (25 pts) + Q1 (10 pts) + Q2 (10 pts)
  // -------------------------------------------------------------
  let moduleCScore = 0;
  if (isBroadcastVerified) {
    moduleCScore += 25;
  }

  const modCQ1Correct = moduleCAnswers["moduleC_q1"]?.selected === "A";
  const modCQ2Correct = moduleCAnswers["moduleC_q2"]?.selected === "B";

  if (modCQ1Correct) moduleCScore += 10;
  if (modCQ2Correct) moduleCScore += 10;

  const modCWrong =
    (moduleCAnswers["moduleC_q1"]?.wrongAttempts || 0) +
    (moduleCAnswers["moduleC_q2"]?.wrongAttempts || 0);
  moduleCScore = Math.max(0, moduleCScore - modCWrong * scoring.wrongQuestionPenalty);

  const moduleCCompleted =
    isModuleCCompleted || (isBroadcastVerified && modCQ1Correct && modCQ2Correct);

  // -------------------------------------------------------------
  // DEDUCTIONS (Hints)
  // -------------------------------------------------------------
  const hintsCount = Array.isArray(hintsUsed) ? hintsUsed.length : 0;
  const hintDeduction = hintsCount * scoring.hintPenalty;

  const rawTotal = moduleAScore + moduleBScore + moduleCScore - hintDeduction;
  const totalScore = Math.max(0, Math.min(scoring.totalMax, Math.round(rawTotal)));

  return {
    totalScore,
    moduleA: {
      score: moduleAScore,
      maxScore: scoring.moduleAMax,
      completed: moduleACompleted,
    },
    moduleB: {
      score: moduleBScore,
      maxScore: scoring.moduleBMax,
      completed: moduleBCompleted,
      latencyTargetAchieved: isLatencyTargetAchieved,
    },
    moduleC: {
      score: moduleCScore,
      maxScore: scoring.moduleCMax,
      completed: moduleCCompleted,
      broadcastVerified: isBroadcastVerified,
    },
    deductions: {
      hintDeduction,
      hintsCount,
      errorsCount: errors,
      wrongQuestionAttempts,
      failedVerificationAttempts,
    },
  };
}

/**
 * Formats the final results structure adhering to MOSAIC Station 1 specifications.
 */
export function formatStationResult(
  state,
  scoreData,
  timeRemainingSeconds,
  operatorName = "Pit Wall Broadcast Engineer",
  finalLatency = 1.32
) {
  return {
    id: `ws1_f1_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    stationId: station1Config.stationId,
    stationName: station1Config.stationName,
    operator: operatorName,
    completed: Boolean(state.isCompleted),
    score: scoreData.totalScore,
    finalLatency,
    timeRemaining: Math.max(0, timeRemainingSeconds),
    timeRemainingSeconds: Math.max(0, timeRemainingSeconds),
    timeUsedSeconds: Math.max(0, station1Config.totalDurationSeconds - timeRemainingSeconds),
    errors: state.errors || 0,
    hintsUsed: Array.isArray(state.hintsUsed) ? state.hintsUsed.length : 0,
    hintsUsedCount: Array.isArray(state.hintsUsed) ? state.hintsUsed.length : 0,
    timestamp: new Date().toISOString(),

    moduleA: {
      completed: Boolean(scoreData.moduleA?.completed),
      score: scoreData.moduleA?.score || 0,
    },

    moduleB: {
      completed: Boolean(scoreData.moduleB?.completed),
      score: scoreData.moduleB?.score || 0,
      latencyTargetAchieved: Boolean(scoreData.moduleB?.latencyTargetAchieved),
    },

    moduleC: {
      completed: Boolean(scoreData.moduleC?.completed),
      score: scoreData.moduleC?.score || 0,
      broadcastVerified: Boolean(scoreData.moduleC?.broadcastVerified),
    },
  };
}
