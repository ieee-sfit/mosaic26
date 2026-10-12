import { supabase, isSupabaseConfigured } from './supabase'

/** Shared secret baked into the kiosk build only (never into the public leaderboard build). */
export const KIOSK_SECRET = (import.meta.env.VITE_KIOSK_SECRET as string | undefined) ?? ''
export const isKioskConfigured = isSupabaseConfigured && KIOSK_SECRET.length > 0

export type PlayerStatus = 'OK' | 'UNREGISTERED' | 'UNPAID'

export interface PlayerCheck {
  ok: boolean
  /** true when the lookup could not reach the server; the run is queued and validated on submit. */
  offline?: boolean
  error?: string
  p1?: { status: PlayerStatus; name: string }
  p2?: { status: PlayerStatus; name: string }
}

/** Verifies both operator IDs are registered and paid before a station is launched. */
export async function checkPlayers(p1: string, p2: string): Promise<PlayerCheck> {
  if (p1 === p2) return { ok: false, error: 'SAME_ID' }
  if (!isKioskConfigured) {
    // Local dev without Supabase: let any pair of 6-digit IDs through. Production builds must be configured.
    return import.meta.env.DEV ? { ok: true, offline: true } : { ok: false, error: 'KIOSK_NOT_CONFIGURED' }
  }
  try {
    const { data, error } = await supabase.rpc('check_players', { p_secret: KIOSK_SECRET, p1, p2 })
    if (error) throw new Error(error.message)
    return data as PlayerCheck
  } catch (e) {
    console.warn('[MOSAIC] check_players failed, allowing offline launch', e)
    return { ok: true, offline: true }
  }
}
