import { createContext, useContext } from 'react'

export const SESSION_DURATION_SECONDS = 720 // unified 12-minute shift

/** Standardized session data handed to every station by the launcher. One player, one 4-digit ID. */
export interface Session {
  stationId: number
  /** The player's system-generated 4-digit ID. */
  player_id: string
  /** The run row created (and charged) by start_run; submit_run completes it. */
  runId: string
  /** Versus lobby only: same seed for every player so everybody gets the same instance. */
  lobbyId?: number
  seed?: number
  startedAt: number
  durationSeconds: number
  endsAt: number
}

export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session | null {
  return useContext(SessionContext)
}

export function createSession(stationId: number, player_id: string, runId: string, extra: { lobbyId?: number; seed?: number } = {}): Session {
  const startedAt = Date.now()
  return {
    stationId,
    player_id,
    runId,
    ...extra,
    startedAt,
    durationSeconds: SESSION_DURATION_SECONDS,
    endsAt: startedAt + SESSION_DURATION_SECONDS * 1000,
  }
}
