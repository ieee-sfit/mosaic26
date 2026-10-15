import { supabase, isSupabaseConfigured } from './supabase'

/** Shared secret baked into the kiosk build only (never into the public leaderboard build). */
export const KIOSK_SECRET = (import.meta.env.VITE_KIOSK_SECRET as string | undefined) ?? ''
export const isKioskConfigured = isSupabaseConfigured && KIOSK_SECRET.length > 0

export type LookupStatus =
  | 'OK' | 'NOT_REGISTERED' | 'NO_CREDITS' | 'CAP' | 'IN_LOBBY' | 'BAD_ID' | 'BAD_STATION'
  | 'UNAUTHORIZED_KIOSK' | 'KIOSK_NOT_CONFIGURED' | 'OFFLINE'

export interface PlayerLookup {
  ok: boolean
  status: LookupStatus
  first_name?: string
  college?: string
  codename?: string
  balance?: number
  runs_used?: number
  cap?: number
}

export const uuid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

/** Local development without Supabase only: pretend everybody is registered. Production builds must be configured. */
const devBypass = () => !isKioskConfigured && import.meta.env.DEV

/** Looks a player up (first name + college) without spending anything. */
export async function lookupPlayer(id: string, station: string): Promise<PlayerLookup> {
  if (!isKioskConfigured) {
    return devBypass()
      ? { ok: true, status: 'OK', first_name: 'DEV', college: 'LOCAL', codename: 'DEV MODE', balance: 99, runs_used: 0, cap: 10 }
      : { ok: false, status: 'KIOSK_NOT_CONFIGURED' }
  }
  try {
    const { data, error } = await supabase.rpc('kiosk_lookup', { p_secret: KIOSK_SECRET, p_id: id, p_station: station })
    if (error) throw new Error(error.message)
    return data as PlayerLookup
  } catch (e) {
    console.warn('[MOSAIC] kiosk_lookup failed', e)
    return { ok: false, status: 'OFFLINE' }
  }
}

export interface StartResult {
  ok: boolean
  error?: string
  run_id?: string
  balance?: number
  attempt_no?: number
  cap?: number
  first_name?: string
  codename?: string
}

/**
 * Spends one credit and creates the run row. Idempotent on `runId`: if the answer is lost and the player presses again,
 * the same id returns the same run without a second charge.
 */
export async function startRun(id: string, station: string, runId: string): Promise<StartResult> {
  if (!isKioskConfigured) return devBypass() ? { ok: true, run_id: runId, balance: 98, attempt_no: 1, cap: 10 } : { ok: false, error: 'KIOSK_NOT_CONFIGURED' }
  try {
    const { data, error } = await supabase.rpc('start_run', { p_secret: KIOSK_SECRET, p_client_run_id: runId, p_id: id, p_station: station })
    if (error) throw new Error(error.message)
    return data as StartResult
  } catch (e) {
    console.warn('[MOSAIC] start_run failed', e)
    return { ok: false, error: 'OFFLINE' }
  }
}

export interface Standing {
  ok: boolean
  codename?: string
  rank?: number | null
  of?: number
  total?: number
  shared?: boolean
}

/** End-screen standing: leaderboard name, rank and consolidated score. */
export async function getStanding(id: string): Promise<Standing | null> {
  if (!isKioskConfigured) return null
  try {
    const { data, error } = await supabase.rpc('kiosk_standing', { p_secret: KIOSK_SECRET, p_id: id })
    if (error) return null
    return data as Standing
  } catch {
    return null
  }
}
