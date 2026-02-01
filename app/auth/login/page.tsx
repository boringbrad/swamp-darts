'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Header from '@/app/components/Header'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        throw loginError
      }

      if (data.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          setError('Please verify your email before logging in. Check your inbox for the verification link.')
          await supabase.auth.signOut()
          return
        }

        // Successful login - redirect to home
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      if (err.message.includes('Email not confirmed')) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.')
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password')
      } else {
        setError(err.message || 'An error occurred during login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex flex-col">
      <Header title="SWAMP DARTS" showBackButton={false} />

      <div className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 max-w-md w-full">
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-8 border border-green-500/50">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Login to continue your dart journey
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-gray-300 mb-2 font-semibold">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-gray-300 mb-2 font-semibold">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="Your password"
                required
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/auth/forgot-password')}
              className="text-green-400 hover:text-green-300 text-sm"
            >
              Forgot your password?
            </button>
          </div>

          {/* Signup Link */}
          <div className="mt-6 text-center text-gray-400">
            <p className="text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/auth/signup')}
                className="text-green-400 hover:text-green-300 font-semibold"
              >
                Create Account
              </button>
            </p>
          </div>

          {/* Back to Welcome */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/welcome')}
              className="text-gray-500 hover:text-gray-400 text-sm"
            >
              ← Back to Welcome
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
