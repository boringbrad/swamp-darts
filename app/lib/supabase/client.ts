import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a Supabase client for use in Client Components
 * This client automatically handles session management
 */
export function createClient() {
  // Use NEXT_PUBLIC_ prefixed env vars for client-side access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: options.signal || AbortSignal.timeout(10000), // 10 second timeout
        })
      },
    },
  })
}
