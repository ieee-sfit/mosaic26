export interface Station3Result {
  id: string;
  teamName: string;
  teamSize: number;
  completedAt: string;
  completedTimeFormatted: string;
  timeRemainingSeconds: number;
  timeRemainingFormatted: string;
  timeTakenSeconds: number;
  timeTakenFormatted: string;
  score: number;
  scoreBreakdown: {
    moduleABase: number;
    moduleAPenalty: number;
    moduleBBase: number;
    moduleBPenalty: number;
    moduleCBase: number;
    moduleCPenalty: number;
    speedBonus: number;
    totalScore: number;
  };
  rank: string;
  station: string;
}

const LOCAL_STORAGE_KEY = "ws3_game_results_cache";

/**
 * Format seconds into MM:SS
 */
export function formatSeconds(secs: number): string {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Fetch all Station 3 results from server (with localStorage fallback).
 */
export async function fetchStation3Results(): Promise<Station3Result[]> {
  let serverResults: Station3Result[] | null = null;
  try {
    const res = await fetch("/api/workstation3/results");
    if (res.ok) {
      serverResults = await res.json();
    }
  } catch (err) {
    console.warn("[Station 3 Results] Server fetch failed:", err);
  }

  let localResults: Station3Result[] = [];
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
      console.warn("[Station 3 Results] Could not sync to localStorage:", e);
    }
    return serverResults;
  }

  return localResults;
}

/**
 * Save a new Station 3 gameplay session to both results.json via server API and localStorage.
 */
export async function saveStation3Result(result: Station3Result): Promise<boolean> {
  if (!result) return false;

  // 1. Sync to local storage
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: Station3Result[] = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(list)) list = [];

    const existingIdx = list.findIndex((r) => r.id === result.id);
    if (existingIdx >= 0) {
      list[existingIdx] = result;
    } else {
      list.push(result);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem("ws3_last_session", JSON.stringify(result));
  } catch (err) {
    console.warn("[Station 3 Results] Failed saving to localStorage:", err);
  }

  // 2. Dispatch mosaic station complete custom event
  try {
    window.dispatchEvent(new CustomEvent("mosaic:station-complete", { detail: result }));
  } catch {
    /* ignore */
  }

  // 3. Post to backend endpoint to write to src/workstation3/results.json
  try {
    const res = await fetch("/api/workstation3/save-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch (err) {
    console.warn("[Station 3 Results] Server API save failed, saved locally:", err);
  }

  return true;
}

/**
 * Download results as formatted JSON file.
 */
export function downloadStation3ResultsAsJSON(results?: Station3Result[]) {
  try {
    const dataToSave = results || (() => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    })();

    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToSave, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "workstation3_results.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error("[Station 3 Results] Failed to download JSON:", err);
  }
}
