'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Header from '@/app/components/Header'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    // Validation
    if (!email || !password || !displayName) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      console.log('Attempting signup with:', { email, displayName })

      // Sign up the user
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log('Signup response:', { data, error: signupError })

      if (signupError) {
        console.error('Signup error:', signupError)
        throw signupError
      }

      if (data.user) {
        console.log('User created successfully:', data.user.id)
        setSuccessMessage(
          'Account created! Please check your email to verify your account before logging in.'
        )
        // Clear form
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setDisplayName('')
      } else {
        console.warn('No user returned from signup')
        setError('Signup completed but no user data returned. Please try logging in.')
      }
    } catch (err: any) {
      console.error('Signup exception:', err)
      setError(err.message || 'An error occurred during signup')
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
            Create Your Account
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Join Swamp Darts and start tracking your games
          </p>

          {successMessage && (
            <div className="bg-green-500/20 border border-green-500 text-green-300 p-4 rounded-lg mb-6">
              <p className="font-semibold mb-2">Success!</p>
              <p className="text-sm">{successMessage}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-gray-300 mb-2 font-semibold">
                Display Name *
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="The Mayor"
                required
                disabled={loading || !!successMessage}
              />
              <p className="text-xs text-gray-400 mt-1">
                This is how your name will appear in games
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-gray-300 mb-2 font-semibold">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="you@example.com"
                required
                disabled={loading || !!successMessage}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-gray-300 mb-2 font-semibold">
                Password *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="Min. 6 characters"
                required
                disabled={loading || !!successMessage}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-gray-300 mb-2 font-semibold">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                placeholder="Re-enter password"
                required
                disabled={loading || !!successMessage}
              />
            </div>

            {/* Account Type Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Account Type:</strong> All new accounts start as <strong>Player</strong> accounts.
                You can request venue access after signup if needed.
              </p>
            </div>

            {/* Submit Button */}
            {!successMessage && (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-gray-400">
            <p className="text-sm">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/auth/login')}
                className="text-green-400 hover:text-green-300 font-semibold"
              >
                Login
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
