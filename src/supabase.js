import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase Project URL and Publishable key, or set them in .env
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_PROJECT_URL'
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'YOUR_SUPABASE_PUBLISHABLE_KEY'

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabasePublishableKey) &&
  !supabaseUrl.includes('YOUR_SUPABASE') &&
  !supabasePublishableKey.includes('YOUR_SUPABASE')

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null
