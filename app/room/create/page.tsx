'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import PageWrapper from '../../components/PageWrapper';
import { createPartyRoom } from '../../lib/partyRooms';

export default function CreatePartyRoomPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    const result = await createPartyRoom();
    if (result.success && result.room) {
      router.push(`/room/${result.room.id}`);
    } else {
      setError(result.error || 'Failed to create room');
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      <Header showBackButton={true} />
      <PageWrapper className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm flex flex-col gap-6 text-center">
            <div>
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wider">Create Party Room</h1>
              <p className="text-gray-400 mt-2 text-sm">
                Up to 4 players · Play multiple games · Room stays open until you close it
              </p>
            </div>

            <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-4 text-left space-y-2">
              <p className="text-gray-300 text-sm flex items-start gap-2">
                <span>✅</span> A room code is generated — share it with friends
              </p>
              <p className="text-gray-300 text-sm flex items-start gap-2">
                <span>✅</span> You pick the game and who plays each round
              </p>
              <p className="text-gray-300 text-sm flex items-start gap-2">
                <span>✅</span> Everyone returns to the lobby between games
              </p>
              <p className="text-gray-300 text-sm flex items-start gap-2">
                <span>✅</span> Chat is available throughout
              </p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-5 bg-[#6b1a8b] hover:bg-[#8b2aab] text-white font-bold text-xl rounded-2xl transition-colors disabled:opacity-50 shadow-lg"
            >
              {creating ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
