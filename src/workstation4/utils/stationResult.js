import { stationConfig } from "../config/stationConfig.js";
import { calculateScore, formatStationResult } from "./scoreCalculator.js";
import { loadStationState } from "./storage.js";

let latestResult = null;

export function updateStationResult(state, scoreData, timeRemaining, playerName) {
  latestResult = formatStationResult(state, scoreData, timeRemaining, playerName);
}

export function getStationResult() {
  if (latestResult) return latestResult;
  const saved = loadStationState();
  if (saved) {
    const scoreData = calculateScore(saved);
    return formatStationResult(saved, scoreData, saved.timeRemaining || 0, saved.playerName || "Operator Alpha");
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
