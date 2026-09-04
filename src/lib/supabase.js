// Re-exports the single canonical Supabase client instead of creating
// a second one. Having two separate createClient() calls in the app
// meant two independent GoTrueClient instances each running their own
// auth/token-refresh cycle — which can cause intermittent session
// drops or "invalid refresh token" errors. Everything should point
// at src/supabaseClient.js as the one source of truth.
export { supabase } from '../supabaseClient'
