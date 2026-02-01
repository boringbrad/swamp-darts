'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import { joinVenue, getVenueByRoomCode } from '../lib/venue';
import { createClient } from '../lib/supabase/client';

function JoinVenueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [venueInfo, setVenueInfo] = useState<{ venueName: string; roomCode: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // Get room code from URL params if available
  useEffect(() => {
    const code = searchParams.get('code');
    const name = searchParams.get('name');

    if (code) {
      setRoomCode(code.toUpperCase());
      // Auto-lookup venue info
      lookupVenue(code);
    }
  }, [searchParams]);

  const lookupVenue = async (code: string) => {
    try {
      const venue = await getVenueByRoomCode(code);
      if (venue) {
        setVenueInfo({ venueName: venue.venueName, roomCode: venue.roomCode });
        setError('');
      } else {
        setVenueInfo(null);
        setError('Venue not found');
      }
    } catch (err) {
      console.error('Error looking up venue:', err);
      setVenueInfo(null);
      setError('Failed to find venue');
    }
  };

  const handleRoomCodeChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setRoomCode(formatted);
    setError('');

    // Auto-lookup when 6 characters entered
    if (formatted.length === 6) {
      lookupVenue(formatted);
    } else {
      setVenueInfo(null);
    }
  };

  const handleJoinVenue = async () => {
    if (!roomCode || roomCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    if (!isAuthenticated) {
      setError('You must be logged in to join a venue');
      router.push(`/auth/login?redirect=/join-venue?code=${roomCode}`);
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const result = await joinVenue(roomCode);

      if (result.success && result.venueId) {
        // Successfully joined - redirect to home
        alert(`Successfully joined ${venueInfo?.venueName || 'venue'}!`);
        router.push('/');
      } else {
        setError(result.error || 'Failed to join venue');
      }
    } catch (err: any) {
      console.error('Error joining venue:', err);
      setError(err.message || 'Failed to join venue');
    } finally {
      setIsJoining(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header showBackButton={true} />

      <PageWrapper>
        <div className="h-20 lg:hidden"></div>

        <main className="px-4 sm:px-6 py-8 flex items-center justify-center min-h-[calc(100vh-160px)]">
          <div className="w-full max-w-md">
            <div className="bg-[#2a2a2a] rounded-lg p-8 shadow-2xl">
              <h1 className="text-3xl font-bold text-white mb-2 text-center">Join Venue</h1>
              <p className="text-gray-400 text-sm mb-6 text-center">
                Enter the 6-character room code to join a venue
              </p>

              {/* Room Code Input */}
              <div className="mb-6">
                <label className="block text-white text-sm font-bold mb-2">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => handleRoomCodeChange(e.target.value)}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-gray-700 rounded text-white text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-gray-400 text-xs mt-2 text-center">
                  {roomCode.length}/6 characters
                </p>
              </div>

              {/* Venue Info Display */}
              {venueInfo && (
                <div className="mb-6 bg-green-900/30 border border-green-600/50 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-400 font-bold">Venue Found!</span>
                  </div>
                  <p className="text-white font-bold text-lg">{venueInfo.venueName}</p>
                  <p className="text-gray-400 text-sm">Room Code: {venueInfo.roomCode}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-900/30 border border-red-600/50 rounded p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-400">{error}</span>
                  </div>
                </div>
              )}

              {/* Not Authenticated Warning */}
              {!isAuthenticated && (
                <div className="mb-6 bg-yellow-900/30 border border-yellow-600/50 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400 font-bold">Login Required</span>
                  </div>
                  <p className="text-yellow-200 text-sm">
                    You need to be logged in to join a venue. You'll be redirected to login when you click Join.
                  </p>
                </div>
              )}

              {/* Join Button */}
              <button
                onClick={handleJoinVenue}
                disabled={isJoining || !roomCode || roomCode.length !== 6 || !venueInfo}
                className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-bold rounded transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join Venue'}
              </button>

              {/* Help Text */}
              <p className="text-gray-400 text-xs mt-4 text-center">
                Don't have a room code? Ask the venue owner to share it with you.
              </p>
            </div>
          </div>
        </main>
      </PageWrapper>
    </div>
  );
}

export default function JoinVenuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <JoinVenueContent />
    </Suspense>
  );
}
