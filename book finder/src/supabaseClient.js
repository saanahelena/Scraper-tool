import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export function getSupabaseClient() {
  if (!url || !publishableKey) {
    throw new Error('Add your Supabase Project URL and publishable key to book finder/.env.local, then restart the development server.')
  }

  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('Use a Supabase publishable key starting with sb_publishable_. Never use a secret or service_role key in React.')
  }

  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
