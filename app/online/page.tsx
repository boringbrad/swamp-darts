'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import PageWrapper from '../components/PageWrapper';
import { useAppContext } from '../contexts/AppContext';
import { getOpenOnlineLobbies, joinSession, GameSession, OnlineGameSettings } from '../lib/sessions';
import { getAvatarById } from '../lib/avatars';
import { createClient } from '../lib/supabase/client';

type LobbyEntry = GameSession & {
  hostDisplayName: string;
  hostAvatar: string;
  hostPhotoUrl: string | null;
  currentParticipants: number;
};

function AvatarBubble({ avatar, photoUrl, name, size = 48 }: {
  avatar: string;
  photoUrl?: string | null;
  name: string;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const av = getAvatarById(avatar) || getAvatarById('avatar-1')!;
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold"
      style={{ width: size, height: size, backgroundColor: av.color + '33', border: `2px solid ${av.color}` }}
    >
      {av.emoji || name[0]?.toUpperCase()}
    </div>
  );
}

function gameLabel(settings: OnlineGameSettings | null): string {
  if (!settings) return 'Game';
  const typeMap: Record<string, string> = { cricket: 'Cricket', x01: 'X01', golf: 'Golf' };
  const variantMap: Record<string, string> = {
    singles: 'Singles',
    'stroke-play': 'Stroke Play',
    'match-play': 'Match Play',
    skins: 'Skins',
    default: '',
  };
  const typeName = typeMap[settings.gameType] || settings.gameType;
  const variantName = variantMap[settings.variant] || settings.variant;
  if (settings.gameType === 'x01') {
    return `${settings.x01StartingScore || 501} ${typeName}`;
  }
  return variantName ? `${typeName} · ${variantName}` : typeName;
}

export default function OnlineLobbyPage() {
  const router = useRouter();
  const { userProfile } = useAppContext();
  const [lobbies, setLobbies] = useState<LobbyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const supabase = createClient();

  const loadLobbies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOpenOnlineLobbies();
      setLobbies(data);
    } catch (err) {
      console.error('[OnlineLobby] loadLobbies error:', err);
      setLobbies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      // Check auth via Supabase directly — don't rely on userProfile which may be null while loading
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/auth/login');
        return;
      }
      setAuthUserId(session.user.id);
      loadLobbies();

      // Realtime: refresh whenever any game_session changes
      channel = supabase
        .channel('online-lobbies-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
          loadLobbies();
        })
        .subscribe();
    };

    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const handleJoin = async (lobby: LobbyEntry) => {
    setJoiningId(lobby.id);
    const result = await joinSession(lobby.roomCode);
    if (result.success && result.sessionId) {
      router.push(`/online/${result.sessionId}`);
    } else {
      alert(result.error || 'Failed to join lobby');
      setJoiningId(null);
      loadLobbies();
    }
  };

  // Prefer the full userProfile id (has display name etc), fall back to raw auth id
  const myId = (userProfile && userProfile.id !== 'default-user') ? userProfile.id : authUserId;

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      <Header showBackButton={true} />
      <PageWrapper className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Title + Create button */}
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">Play Online</h1>
            <p className="text-gray-400 text-sm mt-1">Challenge friends anywhere</p>
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-3 mt-5 w-full">
              <button
                onClick={() => router.push('/room')}
                className="flex flex-col items-center gap-2 py-5 bg-[#6b1a8b] hover:bg-[#8b2aab] text-white font-bold rounded-2xl transition-colors shadow-lg"
              >
                <span className="text-3xl">🏠</span>
                <span className="text-base uppercase tracking-wide">Party Room</span>
                <span className="text-xs text-purple-300 font-normal">Up to 4 · multiple games</span>
              </button>
              <button
                onClick={() => router.push('/online/create')}
                className="flex flex-col items-center gap-2 py-5 bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#4a4a4a] text-white font-bold rounded-2xl transition-colors"
              >
                <span className="text-3xl">⚡</span>
                <span className="text-base uppercase tracking-wide">Quick Match</span>
                <span className="text-xs text-gray-400 font-normal">1v1 · single game</span>
              </button>
            </div>
          </div>

          {/* Lobby list */}
          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading lobbies...</div>
          ) : lobbies.length === 0 ? (
            <div className="text-center py-16 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-white font-bold text-lg mb-1">No open lobbies</p>
              <p className="text-gray-400 text-sm mb-5">Create one and wait for a friend to join.</p>
              <button
                onClick={() => router.push('/online/create')}
                className="px-6 py-2 bg-[#6b1a8b] text-white font-bold rounded-lg hover:bg-[#8b2aab] transition-colors"
              >
                Create Lobby
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lobbies.map(lobby => {
                const isMyLobby = lobby.hostUserId === myId;
                const isJoining = joiningId === lobby.id;
                return (
                  <div
                    key={lobby.id}
                    className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-4 flex items-center gap-4"
                  >
                    <AvatarBubble
                      avatar={lobby.hostAvatar}
                      photoUrl={lobby.hostPhotoUrl}
                      name={lobby.hostDisplayName}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{lobby.hostDisplayName}</p>
                      <p className="text-[#a855f7] text-sm font-semibold">{gameLabel(lobby.gameSettings)}</p>
                      {lobby.gameSettings?.gameType === 'cricket' && lobby.gameSettings.swampRules && (
                        <p className="text-gray-500 text-xs">Swamp Rules</p>
                      )}
                      {lobby.gameSettings?.gameType === 'x01' && (
                        <p className="text-gray-500 text-xs">
                          {lobby.gameSettings.x01DoubleOut ? 'Double Out' : 'Straight Out'}
                          {lobby.gameSettings.x01DoubleIn ? ' · Double In' : ''}
                        </p>
                      )}
                    </div>
                    {isMyLobby ? (
                      <button
                        onClick={() => router.push(`/online/${lobby.id}`)}
                        className="px-4 py-2 bg-[#3a3a3a] text-gray-300 font-bold rounded-lg text-sm border border-[#4a4a4a] hover:bg-[#4a4a4a] transition-colors"
                      >
                        View
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoin(lobby)}
                        disabled={isJoining}
                        className="px-4 py-2 bg-[#6b1a8b] text-white font-bold rounded-lg text-sm hover:bg-[#8b2aab] transition-colors disabled:opacity-50"
                      >
                        {isJoining ? 'Joining...' : 'Join'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Refresh hint */}
          <p className="text-gray-600 text-xs text-center mt-6">Lobbies update in real-time</p>
        </div>
        </div>
      </PageWrapper>
    </div>
  );
}
