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

  // MODULE A (5 questions)
  // +1 point per correct answer, -1 point per wrong attempt
  const qListA = questions.moduleA;
  const correctACount = qListA.filter((q) => moduleAAnswers[q.id]?.isCorrect).length;
  const baseScoreA = correctACount * 1;
  const wrongAAttempts = qListA.reduce(
    (sum, q) => sum + (moduleAAnswers[q.id]?.wrongAttempts || 0),
    0
  );
  const penaltyA = wrongAAttempts * (stationConfig.penalties.wrongQuestionAnswer ?? 1);
  const scoreA = Math.max(0, Math.min(stationConfig.moduleWeights.moduleA, baseScoreA - penaltyA));

  // MODULE B (Max 26 points)
  // Circuit solved = 25 points, Verification Question = 1 point (+1 correct, -1 wrong attempt)
  const isCircuitRepaired = Boolean(circuitSolved || state.slotBGateType === "AND");
  let baseScoreB = 0;
  if (isCircuitRepaired) {
    baseScoreB += 25;
  }
  if (moduleBAnswers.q_mod_b_1?.isCorrect) {
    baseScoreB += 1;
  }
  const wrongBQuestionAttempts = moduleBAnswers.q_mod_b_1?.wrongAttempts || 0;
  const wrongGateAttemptsVal = wrongGateAttempts || state.wrongGateAttempts || 0;
  const penaltyB =
    wrongBQuestionAttempts * (stationConfig.penalties.wrongQuestionAnswer ?? 1) +
    wrongGateAttemptsVal * (stationConfig.penalties.wrongGatePlacement ?? 1);
  const scoreB = Math.max(0, Math.min(stationConfig.moduleWeights.moduleB, baseScoreB - penaltyB));

  // MODULE C (Max 30 points)
  // Tolerances in safe range = 15 points
  // Passcode authorization = 10 points
  // 5 Fail-safe questions * 1 point = 5 points (+1 correct, -1 wrong attempt)
  // Total base = 15 + 10 + 5 = 30 points
  let baseScoreC = 0;
  if (tolerancesSafe) {
    baseScoreC += 15;
  }
  if (authorized) {
    baseScoreC += 10;
  }
  const qListC = questions.moduleC;
  const correctCCount = qListC.filter((q) => moduleCAnswers[q.id]?.isCorrect).length;
  baseScoreC += correctCCount * 1;

  const wrongCQuestionAttempts = qListC.reduce(
    (sum, q) => sum + (moduleCAnswers[q.id]?.wrongAttempts || 0),
    0
  );
  const wrongCodeAttemptsVal = wrongCodeAttempts || state.wrongCodeAttempts || 0;
  const penaltyC =
    wrongCQuestionAttempts * (stationConfig.penalties.wrongQuestionAnswer ?? 1) +
    wrongCodeAttemptsVal * (stationConfig.penalties.wrongPasscodeAttempt ?? 1) +
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
  const maxPossible =
    stationConfig.moduleWeights.moduleA +
    stationConfig.moduleWeights.moduleB +
    stationConfig.moduleWeights.moduleC;
  const totalScore = Math.max(0, Math.min(maxPossible, Math.round(rawTotal)));

  return {
    totalScore,
    maxScore: maxPossible,
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
    maxScore: scoreData.maxScore || 100,
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
      gateSolveHistory: state.gateSolveHistory || [],
    },

    moduleC: {
      completed: scoreData.moduleC.completed,
      score: scoreData.moduleC.score,
      max: scoreData.moduleC.max,
      authorized: scoreData.moduleC.authorized,
    },

    gateSolveHistory: state.gateSolveHistory || [],
  };
}
