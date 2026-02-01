'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionContext } from '../contexts/SessionContext';

interface SessionLockGuardProps {
  children: React.ReactNode;
}

/**
 * Component that prevents users from accessing game modes when they're in an active session
 * This ensures users can't play solo games while they're supposed to be in a multiplayer session
 */
export default function SessionLockGuard({ children }: SessionLockGuardProps) {
  const router = useRouter();
  const { isInSession, roomCode, isHost } = useSessionContext();

  // Only block NON-HOST participants from accessing games
  // The host can always access games since they control the session
  const shouldBlock = isInSession && !isHost;

  useEffect(() => {
    // If user is a non-host participant in a session, redirect to friends page
    if (shouldBlock && roomCode) {
      router.push('/friends');
    }
  }, [shouldBlock, roomCode, router]);

  // If they're a non-host participant in a session, show lock screen
  if (shouldBlock && roomCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
        <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-8 max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">🔒 Session Active</h1>
          <p className="text-xl mb-4">
            You're currently in session <span className="font-mono bg-black/50 px-3 py-1 rounded">{roomCode}</span>
          </p>
          <p className="text-gray-300 mb-6">
            You cannot start a solo game while in an active session. Please leave the session first or play from the main device.
          </p>
          <button
            onClick={() => router.push('/friends')}
            className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors"
          >
            GO TO SESSION
          </button>
        </div>
      </div>
    );
  }

  // Not in a session, allow access to game
  return <>{children}</>;
}
