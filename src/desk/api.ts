import { supabase } from '../lib/supabase'

/** Calls a desk RPC. Throws Error(code) with the Postgres/PostgREST message on failure (e.g. NOT_COMMITTEE). */
export async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const err = new Error(error.message || 'Request failed') as Error & { code?: string }
    err.code = error.code
    throw err
  }
  return data as T
}

export const uuid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@desk.mosaic26.local`

export { boardUrl } from '../lib/boardUrl'

export const ERRORS: Record<string, string> = {
  NAME_REQUIRED: 'Name is required.',
  COLLEGE_REQUIRED: 'College is required.',
  YEAR_REQUIRED: 'Year is required.',
  DEPARTMENT_REQUIRED: 'Department is required.',
  BAD_PHONE: 'Phone must be a 10-digit number.',
  BAD_MODE: 'Choose a payment mode.',
  BAD_AMOUNT: 'Amount must be a whole number of credits.',
  NOT_REGISTERED: 'No player with that ID.',
  REASON_REQUIRED: 'A reason (3+ characters) is required.',
  ALREADY_CLOSED: 'That run is already refunded or voided.',
  NOT_COMMITTEE: 'This account is not a committee member.',
  WINDOW_CLOSED: 'That window is closed and can no longer change.',
  NOT_ENDED: 'That window has not ended yet.',
  RESOLVE_TOSS_FIRST: 'An earlier window has an unresolved coin toss. Resolve it first.',
  ALREADY_RUNNING: 'That lobby has already started.',
  NOT_CLAIMABLE: 'Already claimed, or not claimable.',
  BAD_PAYLOAD: 'That does not look right. Check the values.',
}
export const errText = (code?: string, fallback = 'Something went wrong.') => (code && ERRORS[code]) || fallback

/** Event time zone for everything the desk shows or edits. */
export const TZ = 'Asia/Kolkata'
export const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : ''
/** ISO -> value for <input type="datetime-local"> in IST. */
export const toLocalInput = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000)
  return d.toISOString().slice(0, 16)
}
/** datetime-local value (interpreted as IST) -> ISO. */
export const fromLocalInput = (v: string) => new Date(`${v}:00+05:30`).toISOString()
