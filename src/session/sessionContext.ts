import { createContext, useContext } from 'react'

export const SESSION_DURATION_SECONDS = 720 // unified 12-minute shift

/** Standardized session data handed to every station by the launcher. */
export interface Session {
  stationId: number
  p1_id: string
  p2_id: string
  startedAt: number
  durationSeconds: number
  endsAt: number
}

export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session | null {
  return useContext(SessionContext)
}

export function createSession(stationId: number, p1_id: string, p2_id: string): Session {
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
