import { stationConfig } from "../config/stationConfig";
import { calculateScore, formatStationResult } from "./scoreCalculator";
import { loadStationState } from "./storage";

let latestResult = null;

export function updateStationResult(state, scoreData, timeRemaining) {
  latestResult = formatStationResult(state, scoreData, timeRemaining);
}

export function getStationResult() {
  if (latestResult) return latestResult;
  const saved = loadStationState();
  if (saved) {
    const scoreData = calculateScore(saved);
    return formatStationResult(saved, scoreData, saved.timeRemaining || 0);
  }
  return {
    stationId: stationConfig.stationId,
    stationName: stationConfig.stationName,
    completed: false,
    score: 0,
    timeRemaining: stationConfig.totalDurationSeconds,
    errors: 0,
    hintsUsed: 0,
    moduleA: { completed: false, score: 0 },
    moduleB: { completed: false, score: 0, circuitSolved: false },
    moduleC: { completed: false, score: 0, authorized: false },
  };
}
