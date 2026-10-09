const LOCAL_STORAGE_KEY = "ws4_game_results_cache";

/**
 * Rank an array of gameplay result records to determine winners.
 * 1. Score (highest)
 * 2. Time Remaining (highest, meaning fastest completion)
 * 3. Errors (lowest)
 * 4. Hints used (lowest)
 */
export function determineRankings(results = []) {
  if (!Array.isArray(results) || results.length === 0) return [];

  const sorted = [...results].sort((a, b) => {
    // 1. Highest score first
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    // 2. Highest time remaining (fastest solver)
    const timeDiff = (b.timeRemainingSeconds ?? 0) - (a.timeRemainingSeconds ?? 0);
    if (timeDiff !== 0) return timeDiff;

    // 3. Lowest errors
    const errorDiff = (a.errors ?? 0) - (b.errors ?? 0);
    if (errorDiff !== 0) return errorDiff;

    // 4. Lowest hints used
    return (a.hintsUsedCount ?? 0) - (b.hintsUsedCount ?? 0);
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
    isWinner: index === 0,
  }));
}

/**
 * Fetch all past game results from server API, with localStorage fallback.
 */
export async function fetchGameResults() {
  let serverResults = null;
  try {
    const res = await fetch("/api/workstation4/results");
    if (res.ok) {
      serverResults = await res.json();
    }
  } catch (err) {
    console.warn("[Station 4 Results] Could not fetch results from server endpoint:", err);
  }

  // Get local cache
  let localResults = [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      localResults = JSON.parse(stored);
      if (!Array.isArray(localResults)) localResults = [];
    }
  } catch {
    localResults = [];
  }

  // If server responded, synchronize local storage cache
  if (Array.isArray(serverResults)) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverResults));
    } catch (e) {
      console.warn("[Station 4 Results] Failed to sync to localStorage:", e);
    }
    return determineRankings(serverResults);
  }

  return determineRankings(localResults);
}

/**
 * Save a new gameplay result to the workstation4/results.json file and localStorage.
 */
export async function saveGameResult(result) {
  if (!result) return false;

  // 1. Update localStorage immediately
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(list)) list = [];
    
    // Avoid duplicates by id
    const existingIdx = list.findIndex((r) => r.id === result.id);
    if (existingIdx >= 0) {
      list[existingIdx] = result;
    } else {
      list.push(result);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("[Station 4 Results] Failed saving to localStorage:", err);
  }

  // 2. Post to server to save inside src/workstation4/results.json
  try {
    const res = await fetch("/api/workstation4/save-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (res.ok) {
      const data = await res.json();
      return data.success;
    }
  } catch (err) {
    console.warn("[Station 4 Results] Server API failed, saved to local cache only:", err);
  }

  return true;
}

/**
 * Clear all results from server and localStorage.
 */
export async function clearAllResults() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (err) {
    console.warn(err);
  }

  try {
    await fetch("/api/workstation4/clear-results", { method: "POST" });
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Triggers a browser download of the results JSON file.
 */
export function downloadResultsAsJSON(results = []) {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "workstation4_results.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error("[Station 4 Results] Failed to download JSON:", err);
  }
}
