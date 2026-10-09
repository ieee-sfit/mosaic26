import { questions } from "../config/questions.js";
import { stationConfig } from "../config/stationConfig.js";

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
    wrongGateAttempts = 0,
    wrongCodeAttempts = 0,
  } = state;

  // MODULE A (Max 20 points)
  // 5 questions * 4 points = 20 points base
  const qListA = questions.moduleA;
  const correctACount = qListA.filter((q) => moduleAAnswers[q.id]?.isCorrect).length;
  const baseScoreA = correctACount * 4;
  const wrongAAttempts = qListA.reduce(
    (sum, q) => sum + (moduleAAnswers[q.id]?.wrongAttempts || 0),
    0
  );
  const penaltyA = wrongAAttempts * stationConfig.penalties.wrongQuestionAnswer;
  const scoreA = Math.max(0, Math.min(stationConfig.moduleWeights.moduleA, baseScoreA - penaltyA));

  // MODULE B (Max 35 points)
  // Circuit solved = 25 points, Verification Question = 10 points
  const isCircuitRepaired = Boolean(circuitSolved || state.slotBGateType === "AND");
  let baseScoreB = 0;
  if (isCircuitRepaired) {
    baseScoreB += 25;
  }
  if (moduleBAnswers.q_mod_b_1?.isCorrect) {
    baseScoreB += 10;
  }
  const wrongBQuestionAttempts = moduleBAnswers.q_mod_b_1?.wrongAttempts || 0;
  const wrongGateAttemptsVal = wrongGateAttempts || state.wrongGateAttempts || 0;
  const penaltyB =
    wrongBQuestionAttempts * stationConfig.penalties.wrongQuestionAnswer +
    wrongGateAttemptsVal * stationConfig.penalties.wrongGatePlacement;
  const scoreB = Math.max(0, Math.min(stationConfig.moduleWeights.moduleB, baseScoreB - penaltyB));

  // MODULE C (Max 45 points)
  // Tolerances in safe range = 15 points
  // Passcode authorization = 10 points
  // 5 Fail-safe questions * 4 points = 20 points
  // Total base = 15 + 10 + 20 = 45 points
  let baseScoreC = 0;
  if (tolerancesSafe) {
    baseScoreC += 15;
  }
  if (authorized) {
    baseScoreC += 10;
  }
  const qListC = questions.moduleC;
  const correctCCount = qListC.filter((q) => moduleCAnswers[q.id]?.isCorrect).length;
  baseScoreC += correctCCount * 4;

  const wrongCQuestionAttempts = qListC.reduce(
    (sum, q) => sum + (moduleCAnswers[q.id]?.wrongAttempts || 0),
    0
  );
  const wrongCodeAttemptsVal = wrongCodeAttempts || state.wrongCodeAttempts || 0;
  const penaltyC =
    wrongCQuestionAttempts * stationConfig.penalties.wrongQuestionAnswer +
    wrongCodeAttemptsVal * stationConfig.penalties.wrongPasscodeAttempt +
    (bypassTriggered ? stationConfig.penalties.bypassActivation : 0);
  const scoreC = Math.max(0, Math.min(stationConfig.moduleWeights.moduleC, baseScoreC - penaltyC));

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
      completed: Boolean(isCircuitRepaired && moduleBAnswers.q_mod_b_1?.isCorrect),
      circuitSolved: isCircuitRepaired,
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

export function formatStationResult(state, scoreData, timeRemaining, playerName = "Operator Alpha") {
  const safeTime = Math.max(0, Math.round(timeRemaining));
  const timeUsed = Math.max(0, stationConfig.totalDurationSeconds - safeTime);
  const minutes = Math.floor(safeTime / 60);
  const seconds = safeTime % 60;
  const usedMinutes = Math.floor(timeUsed / 60);
  const usedSeconds = timeUsed % 60;

  return {
    id: `ws4_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    playerName: playerName || "Operator Alpha",
    stationId: stationConfig.stationId,
    stationName: stationConfig.stationName,
    timestamp: new Date().toISOString(),
    formattedDate: new Date().toLocaleString("en-GB"),
    completed: Boolean(state.isCompleted),
    status: state.isCompleted ? "COMPLETED" : "TIMED_OUT",
    score: scoreData.totalScore,
    maxScore: 100,
    timeRemainingSeconds: safeTime,
    timeRemainingFormatted: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    timeUsedSeconds: timeUsed,
    timeUsedFormatted: `${String(usedMinutes).padStart(2, "0")}:${String(usedSeconds).padStart(2, "0")}`,
    errors: state.errors || 0,
    hintsUsedCount: (state.hintsUsed || []).length,

    moduleA: {
      completed: scoreData.moduleA.completed,
      score: scoreData.moduleA.score,
      max: scoreData.moduleA.max,
    },

    moduleB: {
      completed: scoreData.moduleB.completed,
      score: scoreData.moduleB.score,
      max: scoreData.moduleB.max,
      circuitSolved: scoreData.moduleB.circuitSolved,
    },

    moduleC: {
      completed: scoreData.moduleC.completed,
      score: scoreData.moduleC.score,
      max: scoreData.moduleC.max,
      authorized: scoreData.moduleC.authorized,
    },
  };
}
