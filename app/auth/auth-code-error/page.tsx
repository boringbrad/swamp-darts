'use client'

import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

export default function AuthCodeErrorPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
      <Header title="SWAMP DARTS" showBackButton={false} />

      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-8 border border-red-500/50">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Authentication Error
          </h1>
          <p className="text-gray-400 text-center mb-6">
            There was a problem with the authentication link
          </p>

          <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
            <p className="font-semibold mb-2">Invalid or Expired Link</p>
            <p className="text-sm">
              The authentication link you used is invalid or has expired. This can happen if:
            </p>
            <ul className="text-sm mt-2 ml-4 list-disc space-y-1">
              <li>The link has already been used</li>
              <li>The link has expired (links expire after 24 hours)</li>
              <li>The link was copied incorrectly</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Request New Password Reset Link
            </button>

            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Resend Verification Email
            </button>

            <button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
