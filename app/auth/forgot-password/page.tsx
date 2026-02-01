'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import Header from '@/app/components/Header'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      setSuccessMessage(
        'Password reset email sent! Please check your inbox and click the link to reset your password.'
      )
      setEmail('')
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
      <Header title="SWAMP DARTS" showBackButton={false} />

      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-8 border border-green-500/50">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Forgot Password?
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Enter your email and we'll send you a link to reset your password
          </p>

          {successMessage && (
            <div className="bg-green-500/20 border border-green-500 text-green-300 p-4 rounded-lg mb-6">
              <p className="font-semibold mb-2">Email Sent!</p>
              <p className="text-sm">{successMessage}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleResetRequest} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-gray-300 mb-2 font-semibold">
                  Email Address
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
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
