'use client'

import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'

export default function WelcomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex flex-col">
      <Header title="SWAMP DARTS" showBackButton={false} />

      <div className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12 mt-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Welcome to Swamp Darts
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8">
            Your Ultimate Darts Scoring & Stats Companion
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Cricket Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
            <h3 className="text-2xl font-bold text-green-400 mb-3">🎯 Cricket</h3>
            <p className="text-gray-300 mb-4">
              Play Singles, Tag Team, or 4-Way matches with custom rules and detailed stats tracking.
            </p>
          </div>

          {/* Golf Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30">
            <h3 className="text-2xl font-bold text-blue-400 mb-3">⛳ Golf</h3>
            <p className="text-gray-300 mb-4">
              Stroke Play and Match Play modes with course records, ghost players, and comprehensive scoring.
            </p>
          </div>

          {/* Party Games Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
            <h3 className="text-2xl font-bold text-purple-400 mb-3">🎊 Party Games</h3>
            <p className="text-gray-300 mb-4">
              Royal Rumble and more exciting game modes for groups of up to 20 players!
            </p>
          </div>

          {/* Stats Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-yellow-500/30">
            <h3 className="text-2xl font-bold text-yellow-400 mb-3">📊 Stats & Analytics</h3>
            <p className="text-gray-300 mb-4">
              Track your performance, averages, streaks, and compete with friends across venues.
            </p>
          </div>
        </div>

        {/* Account Types Section */}
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-lg p-8 mb-12 border border-green-500/50">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Choose Your Experience
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Player Account */}
            <div className="bg-gray-700/50 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-green-400 mb-4">
                🎯 Player Account
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Track your personal stats and progress</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Play with guests at home</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Scan QR codes to join sessions at venues</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Cloud sync across all your devices</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Connect with friends and follow their stats</span>
                </li>
              </ul>
              <p className="text-sm text-gray-400 mt-4 italic">
                Perfect for individual players who want to track their game at home or on the go!
              </p>
            </div>

            {/* Venue Account */}
            <div className="bg-gray-700/50 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-blue-400 mb-4">
                🏢 Venue Account
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>All Player account features</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>Generate QR codes for player check-ins</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>Host sessions for multiple players</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>Track all games played at your location</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">✓</span>
                  <span>Keep a guest logbook with stats</span>
                </li>
              </ul>
              <p className="text-sm text-gray-400 mt-4 italic">
                Ideal for bars, clubs, and home venues that host regular dart games!
              </p>
              <p className="text-xs text-blue-300 mt-2">
                Note: Venue features require approval after signup
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => router.push('/auth/signup')}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors shadow-lg"
          >
            Create Account
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors shadow-lg"
          >
            Login
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>All accounts start as Player accounts by default.</p>
          <p>Request venue access after creating your account if needed.</p>
        </div>
        </div>
      </div>
    </div>
  )
}
