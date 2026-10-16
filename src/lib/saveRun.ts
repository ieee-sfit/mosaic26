import { supabase } from './supabase'
import { KIOSK_SECRET, isKioskConfigured } from './kiosk'
import { SCORING } from '../core/scoring'

/** What a finished station hands over. `run_id` is the run created (and charged) by start_run. */
export interface RunPayload {
  run_id: string
  player_id: string
  station_id: string
  raw_score: number
  time_left: number
  hints_used: number
  wrong_attempts: number
}

const QUEUE_KEY = 'mosaic_run_queue_v2'
const REJECTED_KEY = 'mosaic_run_rejected_v2'
const FLUSH_MS = 15000
/** Server answers that will never succeed on retry, so the run is parked instead of re-sent forever. */
const DEFINITIVE = new Set(['BAD_PAYLOAD', 'BAD_STATION', 'RUN_NOT_FOUND', 'RUN_VOID', 'UNAUTHORIZED_KIOSK'])

function read<T>(key: string): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
function write(key: string, list: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(-200)))
  } catch (err) {
    console.warn('[MOSAIC] localStorage write failed', err)
  }
}

let flushing = false

/** Sends queued runs to the server. Safe to call repeatedly; failed network sends stay queued. */
export async function flushRuns(): Promise<void> {
  if (flushing || !isKioskConfigured) return
  flushing = true
  try {
    for (const run of read<RunPayload>(QUEUE_KEY)) {
      let reply: { ok?: boolean; error?: string } | null = null
      try {
        const { data, error } = await supabase.rpc('submit_run', {
          p_secret: KIOSK_SECRET,
          p_client_run_id: run.run_id,
          p_id: run.player_id,
          p_station: run.station_id,
          p_raw: run.raw_score,
          p_time_left: run.time_left,
          p_hints: run.hints_used,
          p_wrong: run.wrong_attempts,
        })
        if (error) throw new Error(error.message)
        reply = data
      } catch (e) {
        console.warn('[MOSAIC] submit_run network failure, will retry', e)
        break
      }
      const rest = read<RunPayload>(QUEUE_KEY).filter((r) => r.run_id !== run.run_id)
      if (reply?.ok) write(QUEUE_KEY, rest)
      else if (reply?.error && DEFINITIVE.has(reply.error)) {
        write(QUEUE_KEY, rest)
        write(REJECTED_KEY, [...read(REJECTED_KEY), { ...run, error: reply.error }])
        console.error('[MOSAIC] run rejected by server:', reply.error, run)
      } else break
    }
  } finally {
    flushing = false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushRuns())
  setInterval(() => void flushRuns(), FLUSH_MS)
}

const clampInt = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : 0)))

/** Persists the run locally first (so it survives a crash or outage), then tries to send it. */
export async function saveRun(run: RunPayload): Promise<{ ok: boolean; queued: number }> {
  const entry: RunPayload = {
    ...run,
    raw_score: clampInt(run.raw_score, 0, SCORING.rawMax),
    time_left: clampInt(run.time_left, 0, 720),
    hints_used: clampInt(run.hints_used, 0, 500),
    wrong_attempts: clampInt(run.wrong_attempts, 0, 5000),
  }
  write(QUEUE_KEY, [...read<RunPayload>(QUEUE_KEY).filter((r) => r.run_id !== entry.run_id), entry])
  await flushRuns()
  const queued = read(QUEUE_KEY).length
  return { ok: queued === 0, queued }
}
