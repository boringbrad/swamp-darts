'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionContext } from '@/app/contexts/SessionContext';
import { createSession, leaveSession, expireOldSessions } from '@/app/lib/sessions';
import SessionQRCode from '../sessions/SessionQRCode';
import SessionParticipantList from '../sessions/SessionParticipantList';
import RoomCodeInput from '../sessions/RoomCodeInput';
import { useAppContext } from '@/app/contexts/AppContext';
import { cleanupDuplicateParticipants } from '@/app/lib/cleanupDuplicateParticipants';

export default function SessionTab() {
  const router = useRouter();
  const { userProfile } = useAppContext();
  const { sessionId, roomCode, isInSession, isHost, activeParticipants, refreshSession, setSessionId } = useSessionContext();
  const [creating, setCreating] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [expiring, setExpiring] = useState(false);

  // Refresh session on mount only (real-time subscriptions handle updates)
  useEffect(() => {
    refreshSession();
  }, []);

  const handleCreateSession = async () => {
    if (creating) return;

    setCreating(true);
    setError('');

    const result = await createSession();

    if (result.success && result.session) {
      // Update context with new session immediately
      setSessionId(result.session.id);
      // Real-time subscription will handle loading session data
    } else {
      setError(result.error || 'Failed to create session');
    }

    setCreating(false);
  };

  const handleLeaveSession = async () => {
    if (!sessionId || leaving) return;

    const confirmed = confirm(
      isHost
        ? 'Are you sure you want to leave? This will end the session for all participants.'
        : 'Are you sure you want to leave this session?'
    );

    if (!confirmed) return;

    setLeaving(true);
    setError('');

    const result = await leaveSession(sessionId);

    if (result.success) {
      // Immediately clear the session from context
      setSessionId(null);
      // Don't refresh - we just want to clear the session, not find another one
    } else {
      setError(result.error || 'Failed to leave session');
    }

    setLeaving(false);
  };

  const handleJoinByCode = (roomCode: string) => {
    router.push(`/join-session?c=${roomCode}`);
  };

  const handleCleanupDuplicates = async () => {
    if (cleaning) return;

    const confirmed = confirm(
      'This will remove any duplicate participant records from the database. Continue?'
    );

    if (!confirmed) return;

    setCleaning(true);
    setError('');

    const result = await cleanupDuplicateParticipants();

    if (result.success) {
      if (result.removed > 0) {
        alert(`Successfully cleaned up ${result.removed} duplicate participant record(s)`);
      } else {
        alert('No duplicate records found');
      }
      refreshSession();
    } else {
      setError(result.error || 'Failed to cleanup duplicates');
    }

    setCleaning(false);
  };

  const handleExpireOldSessions = async () => {
    if (expiring) return;

    const confirmed = confirm(
      'This will expire all old sessions that have passed their expiration time. Continue?'
    );

    if (!confirmed) return;

    setExpiring(true);
    setError('');

    try {
      await expireOldSessions();
      alert('Successfully expired old sessions');
      // Don't refresh - we just want to expire sessions, not find new ones
    } catch (error) {
      setError('Failed to expire old sessions');
    }

    setExpiring(false);
  };

  if (!userProfile) {
    return (
      <div className="bg-[#333333] rounded-lg p-12 text-center">
        <div className="text-white text-xl font-bold mb-2">Not Logged In</div>
        <div className="text-gray-400 mb-6">
          You need to be logged in to create or join sessions
        </div>
        <button
          onClick={() => router.push('/auth/login')}
          className="px-6 py-3 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors"
        >
          LOG IN
        </button>
      </div>
    );
  }

  if (isInSession && sessionId) {
    // User is in a session - show lobby
    return (
      <div>
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="bg-[#333333] rounded-lg p-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-white text-2xl font-bold mb-2">Active Session</h2>
            <p className="text-gray-400">
              {isHost ? "You're hosting this session" : "You're in a session"}
            </p>
          </div>

          <SessionQRCode
            sessionId={sessionId}
            roomCode={roomCode || ''}
            hostName={userProfile.displayName || userProfile.username}
            size={200}
          />
        </div>

        <div className="bg-[#333333] rounded-lg p-6 mb-6">
          <SessionParticipantList
            participants={activeParticipants}
            maxParticipants={4}
            currentUserId={userProfile.id}
          />
        </div>

        <div className="bg-[#222222] rounded-lg p-6 mb-6">
          <h3 className="text-white font-bold mb-3">How to Use This Session:</h3>
          <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
            <li>Share the QR code or room code with friends</li>
            <li>Once everyone has joined, {isHost ? 'you can' : 'the host can'} start any game from the home screen</li>
            <li>Session members will automatically appear in player selection</li>
            <li>Play multiple games with different player combinations</li>
            <li>Everyone's stats are automatically updated after each game</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          {isHost && (
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 px-4 bg-[#90EE90] text-black font-bold text-lg rounded hover:bg-[#7ACC7A] transition-colors"
            >
              GO TO HOME (Start Games)
            </button>
          )}

          <button
            onClick={handleLeaveSession}
            disabled={leaving}
            className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {leaving ? 'LEAVING...' : 'LEAVE SESSION'}
          </button>
        </div>
      </div>
    );
  }

  // Not in a session - show create/join options
  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="bg-[#333333] rounded-lg p-8 mb-6 text-center">
        <h2 className="text-white text-2xl font-bold mb-4">Local Multiplayer Sessions</h2>
        <p className="text-gray-300 mb-6">
          Create a session to play multiple games with friends. Everyone in the session can
          play together, and stats are synced automatically.
        </p>

        <button
          onClick={handleCreateSession}
          disabled={creating}
          className="w-full py-4 px-4 bg-[#90EE90] text-black font-bold text-lg rounded hover:bg-[#7ACC7A] transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed mb-4"
        >
          {creating ? 'CREATING...' : '+ CREATE SESSION'}
        </button>

        <button
          onClick={() => setShowJoin(!showJoin)}
          className="w-full py-3 px-4 bg-[#444444] text-white font-bold rounded hover:bg-[#555555] transition-colors"
        >
          {showJoin ? 'HIDE JOIN OPTIONS' : 'JOIN EXISTING SESSION'}
        </button>
      </div>

      {showJoin && (
        <div className="bg-[#333333] rounded-lg p-6">
          <h3 className="text-white font-bold mb-4 text-center">Join by Room Code</h3>
          <RoomCodeInput onSubmit={handleJoinByCode} />
          <div className="mt-4 text-center text-gray-400 text-sm">
            Or scan a QR code with your camera app
          </div>
        </div>
      )}

      <div className="mt-6 bg-[#222222] rounded-lg p-6">
        <h3 className="text-white font-bold mb-3">Features:</h3>
        <ul className="text-gray-300 text-sm space-y-2">
          <li>✓ Play any game mode with session members</li>
          <li>✓ Automatic stat syncing for all players</li>
          <li>✓ Support for guest players without accounts</li>
          <li>✓ Play multiple games in one session</li>
          <li>✓ Different players can join each game</li>
        </ul>
      </div>

      {/* Debug/Utility Section */}
      <div className="mt-6 bg-[#2a2a2a] rounded-lg p-4 border border-[#444444]">
        <div className="space-y-2">
          <button
            onClick={handleCleanupDuplicates}
            disabled={cleaning}
            className="w-full py-2 px-4 bg-[#444444] text-gray-300 text-sm font-bold rounded hover:bg-[#555555] transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {cleaning ? 'CLEANING...' : '🔧 Fix Duplicate Participants'}
          </button>
          <button
            onClick={handleExpireOldSessions}
            disabled={expiring}
            className="w-full py-2 px-4 bg-[#444444] text-gray-300 text-sm font-bold rounded hover:bg-[#555555] transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {expiring ? 'EXPIRING...' : '⏰ Expire Old Sessions'}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2 text-center">
          Run these if you see issues with sessions
        </p>
      </div>
    </div>
  );
}
