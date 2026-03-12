'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import { joinPartyRoom } from '../lib/partyRooms';
import { createClient } from '../lib/supabase/client';

export default function RoomEntryPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) router.push('/auth/login');
    });
  }, []);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) { setError('Enter a 6-character room code'); return; }
    setJoining(true);
    setError('');
    const result = await joinPartyRoom(trimmed);
    if (result.success && result.roomId) {
      router.push(`/room/${result.roomId}`);
    } else {
      setError(result.error || 'Could not join room');
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      <Header showBackButton={true} />
      <PageWrapper className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">

          <div className="text-center">
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">Party Room</h1>
            <p className="text-gray-400 mt-2">Play multiple games with the same group</p>
          </div>

          {/* Create */}
          <button
            onClick={() => router.push('/room/create')}
            className="w-full max-w-sm py-5 bg-[#6b1a8b] hover:bg-[#8b2aab] text-white font-bold text-xl rounded-2xl transition-colors shadow-lg"
          >
            🎯 Create Room
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 w-full max-w-sm">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-sm font-semibold">OR JOIN</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Join by code */}
          <div className="w-full max-w-sm flex flex-col gap-3">
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Room code (e.g. AB3K7P)"
              maxLength={6}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white text-xl font-mono text-center rounded-xl px-4 py-4 outline-none focus:border-[#6b1a8b] tracking-widest uppercase placeholder-gray-600"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={joining || code.trim().length < 6}
              className="w-full py-4 bg-[#2a2a2a] border border-[#6b1a8b] text-[#a855f7] font-bold text-lg rounded-xl hover:bg-[#3a2a4a] transition-colors disabled:opacity-40"
            >
              {joining ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
