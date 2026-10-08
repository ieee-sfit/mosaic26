const STORAGE_KEY = "area51_station4_state";

export function saveStationState(state) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const payload = JSON.stringify({
      ...state,
      savedAt: Date.now(),
    });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (err) {
    console.warn("[Station 4 Storage] Failed to save state to localStorage:", err);
  }
}

export function loadStationState() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item);
  } catch (err) {
    console.warn("[Station 4 Storage] Failed to read state from localStorage:", err);
    return null;
  }
}

export function clearStationState() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[Station 4 Storage] Failed to clear state from localStorage:", err);
  }
}

export function hasSavedShift() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return false;
    const parsed = JSON.parse(item);
    return Boolean(parsed && parsed.shiftStarted && !parsed.isCompleted && !parsed.isTimedOut);
  } catch {
    return false;
  }
}
