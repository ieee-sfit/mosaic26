import { supabase, isSupabaseConfigured } from './supabase'

export interface RunPayload {
  p1_id: string
  p2_id: string
  station_id: string
  raw_score: number
  time_left: number
}

const RECENT_KEY = 'recent_runs'
const MAX_LOCAL = 100

function writeLocal(run: RunPayload & { synced: boolean }) {
  try {
    const prev = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    const list = Array.isArray(prev) ? prev : []
    list.push({ ...run, saved_at: new Date().toISOString() })
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(-MAX_LOCAL)))
  } catch (err) {
    console.warn('[MOSAIC] localStorage fallback failed', err)
  }
}

export async function saveRun(run: RunPayload): Promise<{ ok: boolean; error?: string }> {
  const payload: RunPayload = {
    ...run,
    raw_score: Math.round(run.raw_score),
    time_left: Math.max(0, Math.round(run.time_left)),
  }

  let error: string | undefined
  if (!isSupabaseConfigured) {
    error = 'Supabase not configured'
  } else {
    try {
      const res = await supabase.from('station_runs').insert([payload])
      if (res.error) error = res.error.message
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  if (error) console.warn('[MOSAIC] saveRun remote insert failed:', error)
  writeLocal({ ...payload, synced: !error })
  return error ? { ok: false, error } : { ok: true }
}
