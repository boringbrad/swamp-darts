'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import { useAppContext } from '../contexts/AppContext';
import { sendFriendRequest } from '../lib/friends';

function AddFriendContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile } = useAppContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_friends' | 'self'>('loading');
  const [message, setMessage] = useState('');
  const friendUserId = searchParams.get('u');
  const friendName = searchParams.get('n');

  useEffect(() => {
    const sendRequest = async () => {
      // Check if user is logged in
      if (!userProfile) {
        setStatus('error');
        setMessage('Please log in to add friends');
        return;
      }

      // Check if trying to add self
      if (friendUserId === userProfile.id) {
        setStatus('self');
        setMessage("You can't add yourself as a friend!");
        return;
      }

      // Validate friend user ID
      if (!friendUserId) {
        setStatus('error');
        setMessage('Invalid friend code');
        return;
      }

      // Send friend request
      const result = await sendFriendRequest(friendUserId);

      if (result.success) {
        setStatus('success');
        setMessage(`Friend request sent to ${friendName || 'user'}!`);
      } else {
        if (result.error?.includes('already exists') || result.error?.includes('duplicate')) {
          setStatus('already_friends');
          setMessage(`You've already sent a request to ${friendName || 'this user'}`);
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to send friend request');
        }
      }
    };

    if (userProfile !== undefined) {
      sendRequest();
    }
  }, [friendUserId, friendName, userProfile]);

  const handleGoToFriends = () => {
    router.push('/friends');
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
                <div className="text-gray-400">Sending friend request</div>
              </div>
            )}

            {status === 'success' && (
              <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">✓</div>
                <div className="text-white text-2xl font-bold mb-2">Success!</div>
                <div className="text-gray-300 mb-6">{message}</div>
                <div className="flex gap-3">
                  <button
                    onClick={handleGoToFriends}
                    className="flex-1 py-3 px-4 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
                  >
                    VIEW FRIENDS
                  </button>
                  <button
                    onClick={handleGoHome}
                    className="flex-1 py-3 px-4 bg-[#333333] text-white font-bold rounded hover:bg-[#444444] transition-colors"
                  >
                    GO HOME
                  </button>
                </div>
              </div>
            )}

            {status === 'already_friends' && (
              <div className="bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">ℹ️</div>
                <div className="text-white text-2xl font-bold mb-2">Already Requested</div>
                <div className="text-gray-300 mb-6">{message}</div>
                <div className="flex gap-3">
                  <button
                    onClick={handleGoToFriends}
                    className="flex-1 py-3 px-4 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
                  >
                    VIEW FRIENDS
                  </button>
                  <button
                    onClick={handleGoHome}
                    className="flex-1 py-3 px-4 bg-[#333333] text-white font-bold rounded hover:bg-[#444444] transition-colors"
                  >
                    GO HOME
                  </button>
                </div>
              </div>
            )}

            {status === 'self' && (
              <div className="bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">😅</div>
                <div className="text-white text-2xl font-bold mb-2">Nice Try!</div>
                <div className="text-gray-300 mb-6">{message}</div>
                <button
                  onClick={handleGoHome}
                  className="w-full py-3 px-4 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
                >
                  GO HOME
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">✕</div>
                <div className="text-white text-2xl font-bold mb-2">Error</div>
                <div className="text-gray-300 mb-6">{message}</div>
                <div className="flex gap-3">
                  {!userProfile && (
                    <button
                      onClick={() => router.push('/auth/login')}
                      className="flex-1 py-3 px-4 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
                    >
                      LOG IN
                    </button>
                  )}
                  <button
                    onClick={handleGoHome}
                    className="flex-1 py-3 px-4 bg-[#333333] text-white font-bold rounded hover:bg-[#444444] transition-colors"
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

export default function AddFriendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <AddFriendContent />
    </Suspense>
  );
}
