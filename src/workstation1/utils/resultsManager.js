const LOCAL_STORAGE_KEY = "ws1_game_results_cache";

/**
 * Rank an array of gameplay result records to determine performance.
 * 1. Score (highest)
 * 2. Time Remaining (highest, meaning faster completion)
 * 3. Errors (lowest)
 * 4. Hints used (lowest)
 */
export function determineRankings(results = []) {
  if (!Array.isArray(results) || results.length === 0) return [];

  const sorted = [...results].sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    const timeDiff = (b.timeRemainingSeconds ?? 0) - (a.timeRemainingSeconds ?? 0);
    if (timeDiff !== 0) return timeDiff;

    const errorDiff = (a.errors ?? 0) - (b.errors ?? 0);
    if (errorDiff !== 0) return errorDiff;

    return (a.hintsUsedCount ?? 0) - (b.hintsUsedCount ?? 0);
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
    isWinner: index === 0,
  }));
}

/**
 * Fetch past results with localStorage fallback.
 */
export async function fetchGameResults() {
  let serverResults = null;
  try {
    const res = await fetch("/api/workstation1/results");
    if (res.ok) {
      serverResults = await res.json();
    }
  } catch (err) {
    console.warn("[Station 1 Results] Could not fetch results from server endpoint:", err);
  }

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

  if (Array.isArray(serverResults)) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverResults));
    } catch (e) {
      console.warn("[Station 1 Results] Failed to sync to localStorage:", e);
    }
    return determineRankings(serverResults);
  }

  return determineRankings(localResults);
}

/**
 * Save a new gameplay result to results.json and localStorage.
 */
export async function saveGameResult(result) {
  if (!result) return false;

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(list)) list = [];

    const existingIdx = list.findIndex((r) => r.id === result.id);
    if (existingIdx >= 0) {
      list[existingIdx] = result;
    } else {
      list.push(result);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("[Station 1 Results] Failed saving to localStorage:", err);
  }

  try {
    const res = await fetch("/api/workstation1/save-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (res.ok) {
      const data = await res.json();
      return data.success;
    }
  } catch (err) {
    console.warn("[Station 1 Results] Server API failed, saved to local cache only:", err);
  }

  return true;
}

/**
 * Clear results cache.
 */
export async function clearAllResults() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (err) {
    console.warn(err);
  }

  try {
    await fetch("/api/workstation1/clear-results", { method: "POST" });
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Download results as JSON file.
 */
export function downloadResultsAsJSON(results = []) {
  try {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "workstation1_goat_anc_results.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error("[Station 1 Results] Failed to download JSON:", err);
  }
}
