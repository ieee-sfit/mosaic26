import { station1Config } from "../config/stationConfig.js";
import { calculateScore, formatStationResult } from "./scoreCalculator.js";
import { loadStationState } from "./storage.js";

let latestResult = null;

export function updateStationResult(state, scoreData, timeRemaining, operatorName) {
  latestResult = formatStationResult(state, scoreData, timeRemaining, operatorName);
}

export function getStationResult() {
  if (latestResult) return latestResult;
  const saved = loadStationState();
  if (saved) {
    const scoreData = calculateScore(saved);
    return formatStationResult(
      saved,
      scoreData,
      saved.timeRemaining || 0,
      saved.operatorName || "Flight Acoustic Specialist"
    );
  }
  return {
    stationId: station1Config.stationId,
    stationName: station1Config.stationName,
    completed: false,
    score: 0,
    timeRemaining: station1Config.totalDurationSeconds,
    errors: 0,
    hintsUsed: 0,
    moduleA: { completed: false, score: 0 },
    moduleB: { completed: false, score: 0, latencyTargetAchieved: false },
    moduleC: { completed: false, score: 0, broadcastVerified: false },
  };
}
