import { createBrowserClient } from '@supabase/ssr'

/**
 * Singleton browser Supabase client.
 *
 * Multiple createBrowserClient() instances cause a token-refresh race condition:
 * each instance detects an expired access token and tries to refresh it
 * simultaneously, causing the others' refresh tokens to be invalidated.
 * Sharing one instance ensures only one refresh ever happens at a time.
 *
 * The module-level variable is reset on hard page navigations (the module is
 * re-evaluated), which is the correct behaviour — client-side navigations reuse
 * the same instance throughout the session.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<any>>;
let _client: SupabaseBrowserClient | undefined;

export function createClient(): SupabaseBrowserClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project settings.'
    )
  }

  _client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: options.signal || AbortSignal.timeout(10000), // 10 second timeout
        })
      },
    },
  })

  return _client;
}
