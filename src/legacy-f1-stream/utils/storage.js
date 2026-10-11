/**
 * GOAT ANC - Session State Persistence & Recovery
 * Uses versioned localStorage key to persist active shift data across refreshes.
 */

export const STORAGE_KEY = "mosaic:workstation1:session:v1";

/**
 * Persists current station state to localStorage.
 */
export function saveStationState(state) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const payload = JSON.stringify({
      ...state,
      savedAt: Date.now(),
    });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (err) {
    console.warn("[Station 1 Storage] Failed to write state to localStorage:", err);
  }
}

/**
 * Loads and validates saved station state from localStorage.
 */
export function loadStationState() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    const parsed = JSON.parse(item);

    // Validate essential structure
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch (err) {
    console.warn("[Station 1 Storage] Failed to parse state from localStorage:", err);
    return null;
  }
}

/**
 * Clears station state from localStorage.
 */
export function clearStationState() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[Station 1 Storage] Failed to remove state from localStorage:", err);
  }
}

/**
 * Checks if a valid, uncompleted active shift exists.
 */
export function hasSavedShift() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return false;
    const parsed = JSON.parse(item);
    return Boolean(
      parsed &&
        parsed.shiftStarted &&
        !parsed.isCompleted &&
        !parsed.isTimedOut &&
        parsed.startTimestamp
    );
  } catch {
    return false;
  }
}
