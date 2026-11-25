import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://pzagcymbtgptjeubiryx.supabase.co'
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_WhvMLfn_zF-fLBXJ7ch6ZQ_p-f9EN9F'

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabasePublishableKey) &&
  !supabaseUrl.includes('YOUR_SUPABASE') &&
  !supabasePublishableKey.includes('YOUR_SUPABASE')

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null
