import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Create a Supabase client for use in Server Components, Server Actions, and Route Handlers
 * This client handles cookie-based session management on the server side
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    'https://tregewscspnjflqgsjki.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZWdld3Njc3BuamZscWdzamtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDQyODUsImV4cCI6MjA4NDkyMDI4NX0.Xzzt22tEGgIVAA8wzB5YrAmsWDf-jsJuXuWEMq5QZo8',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
