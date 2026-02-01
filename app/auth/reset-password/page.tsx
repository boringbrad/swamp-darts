'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Header from '@/app/components/Header'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setIsValidSession(true)
      } else {
        setError('Invalid or expired reset link. Please request a new password reset.')
      }
      setCheckingSession(false)
    }

    checkSession()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    // Validation
    if (!password || !confirmPassword) {
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

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      setSuccessMessage('Password updated successfully! You can now login with your new password.')
      setPassword('')
      setConfirmPassword('')

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An error occurred while resetting password')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
        <Header title="SWAMP DARTS" showBackButton={false} />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-8 border border-green-500/50">
            <p className="text-white text-center">Verifying reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
      <Header title="SWAMP DARTS" showBackButton={false} />

      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-8 border border-green-500/50">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Reset Password
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Enter your new password below
          </p>

          {successMessage && (
            <div className="bg-green-500/20 border border-green-500 text-green-300 p-4 rounded-lg mb-6">
              <p className="font-semibold mb-2">Success!</p>
              <p className="text-sm">{successMessage}</p>
              <p className="text-sm mt-2">Redirecting to login...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
              {!isValidSession && (
                <button
                  onClick={() => router.push('/auth/forgot-password')}
                  className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Request New Reset Link
                </button>
              )}
            </div>
          )}

          {isValidSession && !successMessage && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-gray-300 mb-2 font-semibold">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                  placeholder="Min. 6 characters"
                  required
                  disabled={loading}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-gray-300 mb-2 font-semibold">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
                  placeholder="Re-enter password"
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
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="text-gray-400 hover:text-gray-300 text-sm"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
