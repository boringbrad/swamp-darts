'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import { useAppContext } from '../contexts/AppContext';
import { joinSession, validateRoomCode } from '../lib/sessions';

function JoinSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile } = useAppContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'need_guest_info'>('loading');
  const [message, setMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestAvatar, setGuestAvatar] = useState('avatar-1');

  const sessionId = searchParams.get('s');
  const roomCode = searchParams.get('c');
  const hostName = searchParams.get('h');

  useEffect(() => {
    const attemptJoin = async () => {
      // Wait for user profile to load
      if (userProfile === undefined) return;

      if (!roomCode) {
        setStatus('error');
        setMessage('Invalid session link');
        return;
      }

      // Validate room code
      const validation = await validateRoomCode(roomCode);
      if (!validation.valid) {
        setStatus('error');
        setMessage(validation.error || 'Session not available');
        return;
      }

      // If authenticated, join directly
      if (userProfile) {
        const result = await joinSession(roomCode);

        if (result.success) {
          setStatus('success');
          setMessage(`Joined ${hostName ? `${hostName}'s` : 'the'} session!`);
          // Redirect to friends page where session is managed
          setTimeout(() => {
            router.push('/friends');
          }, 1500);
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to join session');
        }
      } else {
        // Not authenticated - need guest info
        setStatus('need_guest_info');
      }
    };

    attemptJoin();
  }, [roomCode, hostName, userProfile, router]);

  const handleGuestJoin = async () => {
    if (!guestName.trim() || !roomCode) return;

    setStatus('loading');
    setMessage('Joining session...');

    const result = await joinSession(roomCode, {
      name: guestName.trim(),
      avatar: guestAvatar
    });

    if (result.success) {
      setStatus('success');
      setMessage(`Joined ${hostName ? `${hostName}'s` : 'the'} session!`);
      setTimeout(() => {
        router.push('/friends');
      }, 1500);
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to join session');
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header />

      <PageWrapper>
        <div className="h-32"></div>
        <main className="px-6 pb-6 flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full">
            {status === 'loading' && (
              <div className="bg-[#333333] rounded-lg p-12 text-center">
                <div className="text-white text-xl font-bold mb-4">Processing...</div>
                <div className="text-gray-400">{message || 'Joining session'}</div>
              </div>
            )}

            {status === 'success' && (
              <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">✓</div>
                <div className="text-white text-2xl font-bold mb-2">Success!</div>
                <div className="text-gray-300 mb-6">{message}</div>
                <div className="text-gray-400 text-sm">Redirecting to session...</div>
              </div>
            )}

            {status === 'need_guest_info' && (
              <div className="bg-[#333333] rounded-lg p-8">
                <div className="text-white text-2xl font-bold mb-2 text-center">Join as Guest</div>
                <div className="text-gray-400 text-sm mb-6 text-center">
                  Joining {hostName ? `${hostName}'s` : 'a'} session
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-bold mb-2 text-sm">Your Name</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-4 py-3 bg-[#222222] text-white rounded border-2 border-gray-600 focus:border-[#90EE90] focus:outline-none"
                      maxLength={20}
                    />
                  </div>

                  <div>
                    <label className="block text-white font-bold mb-2 text-sm">Choose Avatar</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6', 'avatar-7', 'avatar-8'].map((avatar) => (
                        <button
                          key={avatar}
                          onClick={() => setGuestAvatar(avatar)}
                          className={`aspect-square rounded-lg border-2 overflow-hidden ${
                            guestAvatar === avatar ? 'border-[#90EE90]' : 'border-gray-600'
                          }`}
                        >
                          <img src={`/avatars/${avatar}.png`} alt={avatar} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGuestJoin}
                    disabled={!guestName.trim()}
                    className="w-full py-3 px-4 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    JOIN SESSION
                  </button>

                  <button
                    onClick={() => router.push('/auth/login')}
                    className="w-full py-3 px-4 bg-[#333333] text-white font-bold rounded hover:bg-[#444444] transition-colors"
                  >
                    LOG IN INSTEAD
                  </button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">✕</div>
                <div className="text-white text-2xl font-bold mb-2">Error</div>
                <div className="text-gray-300 mb-6">{message}</div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleGoHome}
                    className="w-full py-3 px-4 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
                  >
                    GO HOME
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </PageWrapper>
    </div>
  );
}

export default function JoinSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <JoinSessionContent />
    </Suspense>
  );
}
