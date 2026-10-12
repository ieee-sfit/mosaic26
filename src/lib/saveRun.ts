import { supabase } from './supabase'
import { KIOSK_SECRET, isKioskConfigured } from './kiosk'

export interface RunPayload {
  p1_id: string
  p2_id: string
  station_id: string
  raw_score: number
  time_left: number
}

interface QueuedRun extends RunPayload {
  client_run_id: string
}

const QUEUE_KEY = 'mosaic_run_queue'
const REJECTED_KEY = 'mosaic_run_rejected'
const FLUSH_MS = 15000
/** Server answers that will never succeed on retry, so the run is parked instead of re-sent forever. */
const DEFINITIVE = new Set(['BAD_PAYLOAD', 'BAD_STATION', 'PLAYER_NOT_REGISTERED', 'UNAUTHORIZED_KIOSK'])

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

const uuid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

let flushing = false

/** Sends queued runs to the server. Safe to call repeatedly; failed network sends stay queued. */
export async function flushRuns(): Promise<void> {
  if (flushing || !isKioskConfigured) return
  flushing = true
  try {
    for (const run of read<QueuedRun>(QUEUE_KEY)) {
      let reply: { ok?: boolean; error?: string } | null = null
      try {
        const { data, error } = await supabase.rpc('submit_run', {
          p_secret: KIOSK_SECRET,
          p_client_run_id: run.client_run_id,
          p1: run.p1_id,
          p2: run.p2_id,
          p_station: run.station_id,
          p_raw: run.raw_score,
          p_time_left: run.time_left,
        })
        if (error) throw new Error(error.message)
        reply = data
      } catch (e) {
        console.warn('[MOSAIC] submit_run network failure, will retry', e)
        break
      }
      const rest = read<QueuedRun>(QUEUE_KEY).filter((r) => r.client_run_id !== run.client_run_id)
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

/** Persists the run locally first (so it survives a crash or outage), then tries to send it. */
export async function saveRun(run: RunPayload): Promise<{ ok: boolean; queued: number }> {
  const entry: QueuedRun = {
    ...run,
    raw_score: Math.max(0, Math.min(120, Math.round(run.raw_score))),
    time_left: Math.max(0, Math.min(720, Math.round(run.time_left))),
    client_run_id: uuid(),
  }
  write(QUEUE_KEY, [...read(QUEUE_KEY), entry])
  await flushRuns()
  const queued = read(QUEUE_KEY).length
  return { ok: queued === 0, queued }
}
