import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a Supabase client for use in Client Components
 * This client automatically handles session management
 */
export function createClient() {
  // In Next.js, we need to access env vars directly, not through process.env in browser
  const supabaseUrl = 'https://tregewscspnjflqgsjki.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZWdld3Njc3BuamZscWdzamtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDQyODUsImV4cCI6MjA4NDkyMDI4NX0.Xzzt22tEGgIVAA8wzB5YrAmsWDf-jsJuXuWEMq5QZo8'

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
