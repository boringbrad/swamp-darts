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
    auth: {
      // Custom lock implementation that prevents the auth-js internal mutex
      // from hanging data queries indefinitely during a token refresh.
      //
      // Background: auth-js calls _notifyAllSubscribers() while holding its
      // JS mutex (lockAcquired = true). If any code inside onAuthStateChange
      // makes a Supabase data query, that query calls getSession() which tries
      // to re-enter the lock via pendingInLock — creating a deadlock.
      //
      // We already fixed AuthContext to never make Supabase calls inside
      // onAuthStateChange. This custom lock is a safety net: if a token
      // refresh (acquireTimeout > 0) ever holds navigator.locks for longer
      // than expected, read-only getSession() calls (acquireTimeout === -1)
      // will give up after 5 seconds and proceed without the lock rather than
      // waiting forever.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
        if (typeof navigator === 'undefined' || !('locks' in navigator)) {
          // SSR or unsupported browser — run without locking
          return fn()
        }
        if (acquireTimeout === -1) {
          // Read mode: cap the wait at 5 seconds.
          // If we can't acquire within 5s, run fn() optimistically without
          // the lock rather than hanging forever. Reading a slightly-stale
          // token is far better than blocking the entire app.
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 5000)
          try {
            return await navigator.locks.request(name, { signal: controller.signal }, fn)
          } catch (e: unknown) {
            if ((e as { name?: string })?.name === 'AbortError') {
              return fn()
            }
            throw e
          } finally {
            clearTimeout(timer)
          }
        }
        if (acquireTimeout === 0) {
          // Try once, fail immediately if lock not available
          return navigator.locks.request(name, { ifAvailable: true }, async (lock) => {
            if (!lock) throw new Error('Auth lock not available')
            return fn()
          })
        }
        // Exclusive write mode (token refresh, sign-in, etc.) — use a bounded timeout
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), acquireTimeout)
        try {
          return await navigator.locks.request(name, { signal: controller.signal }, fn)
        } catch (e: unknown) {
          if ((e as { name?: string })?.name === 'AbortError') {
            throw new Error(`Auth lock acquire timed out after ${acquireTimeout}ms`)
          }
          throw e
        } finally {
          clearTimeout(timer)
        }
      },
    },
    global: {
      fetch: (url, options = {}) => {
        // Never apply our timeout to auth endpoints.
        // Aborting a token-refresh request prevents @supabase/auth-js from
        // releasing its internal auth lock, causing ALL subsequent Supabase
        // calls to hang indefinitely until a hard page refresh.
        const urlStr = typeof url === 'string' ? url
          : url instanceof URL ? url.toString()
          : (url as Request).url;
        if (urlStr.includes('/auth/v1/')) {
          // Auth calls (token refresh, sign-in, etc.) get a longer timeout.
          // 10 seconds is too short — an aborted refresh corrupts the auth lock,
          // hanging all subsequent Supabase calls. 30 seconds covers cold starts
          // while still guarding against a truly unreachable server.
          return fetch(url, {
            ...options,
            signal: options.signal || AbortSignal.timeout(30000),
          });
        }
        return fetch(url, {
          ...options,
          signal: options.signal || AbortSignal.timeout(10000),
        });
      },
    },
  })

  return _client;
}
