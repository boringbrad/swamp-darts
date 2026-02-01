import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Create a Supabase client for use in Middleware
 * This refreshes the user's session and must be used in middleware.ts
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    'https://tregewscspnjflqgsjki.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZWdld3Njc3BuamZscWdzamtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDQyODUsImV4cCI6MjA4NDkyMDI4NX0.Xzzt22tEGgIVAA8wzB5YrAmsWDf-jsJuXuWEMq5QZo8',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Don't run authentication on auth callback route
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return supabaseResponse
  }

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedRoutes = [
    '/',
    '/cricket',
    '/golf',
    '/extra',
    '/stats',
    '/profile',
    '/league',
    '/friends',
  ]

  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  )

  // If accessing a protected route without authentication, redirect to welcome page
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  // If accessing welcome/auth pages while authenticated, redirect to home
  const authRoutes = ['/welcome', '/auth/login', '/auth/signup']
  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
