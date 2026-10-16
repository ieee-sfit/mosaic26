import { supabase, isSupabaseConfigured } from './supabase'

/** Shared secret baked into the kiosk build only (never into the public leaderboard build). */
export const KIOSK_SECRET = (import.meta.env.VITE_KIOSK_SECRET as string | undefined) ?? ''
export const isKioskConfigured = isSupabaseConfigured && KIOSK_SECRET.length > 0

export type PlayerStatus = 'OK' | 'UNREGISTERED' | 'UNPAID' | 'LIMIT'

export interface PlayerCheck {
  ok: boolean
  /** true when the lookup could not reach the server; the run is queued and validated on submit. */
  offline?: boolean
  error?: string
  /** Attempts allowed per player per station. */
  cap?: number
  p1?: { status: PlayerStatus; name: string; runs?: number }
  p2?: { status: PlayerStatus; name: string; runs?: number }
}

/** Verifies operator IDs if configured; never blocks players from launching. */
export async function checkPlayers(p1: string, p2: string, station?: string): Promise<PlayerCheck> {
  if (p1 === p2) return { ok: false, error: 'SAME_ID' }
  if (!isKioskConfigured) {
    return { ok: true, offline: true }
  }
  try {
    const { data, error } = station
      ? await supabase.rpc('check_players_for', { p_secret: KIOSK_SECRET, p1, p2, p_station: station })
      : await supabase.rpc('check_players', { p_secret: KIOSK_SECRET, p1, p2 })
    if (error) throw new Error(error.message)
    return { ...data, ok: true } as PlayerCheck
  } catch (e) {
    console.warn('[MOSAIC] check_players failed, allowing offline launch', e)
    return { ok: true, offline: true }
  }
}
