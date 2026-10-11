import { createContext, useContext } from 'react'

export const SESSION_DURATION_SECONDS = 720 // unified 12-minute shift

export const SessionContext = createContext(null)

/**
 * Standardized session data shared by all stations:
 * { stationId, p1_id, p2_id, startedAt, durationSeconds, endsAt }
 */
export function useSession() {
  return useContext(SessionContext)
}

export function createSession(stationId, p1_id, p2_id) {
  const startedAt = Date.now()
  return {
    stationId,
    p1_id,
    p2_id,
    startedAt,
    durationSeconds: SESSION_DURATION_SECONDS,
    endsAt: startedAt + SESSION_DURATION_SECONDS * 1000,
  }
}
