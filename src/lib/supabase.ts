import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[MOSAIC] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — Supabase disabled. ' +
      'Runs are saved to localStorage only and the leaderboard will be empty.'
  )
}

// createClient throws on an empty URL, so fall back to inert placeholders.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'missing-anon-key'
)
