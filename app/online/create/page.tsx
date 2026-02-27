'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import PageWrapper from '../../components/PageWrapper';
import { useAppContext } from '../../contexts/AppContext';
import { createOnlineSession, OnlineGameSettings } from '../../lib/sessions';

type GameType = 'cricket' | 'x01' | 'golf';

const GAME_TYPES: { type: GameType; label: string; emoji: string; color: string }[] = [
  { type: 'cricket', label: 'Cricket', emoji: '🦗', color: '#8b1a1a' },
  { type: 'x01',     label: 'X01',     emoji: '🎯', color: '#1a3a5a' },
  { type: 'golf',    label: 'Golf',    emoji: '⛳', color: '#1a5a1a' },
];

const GOLF_VARIANTS = [
  { variant: 'stroke-play', label: 'Stroke Play' },
  { variant: 'match-play',  label: 'Match Play' },
  { variant: 'skins',       label: 'Skins' },
];

const X01_SCORES = [301, 501, 701];

export default function CreateLobbyPage() {
  const router = useRouter();
  const { userProfile } = useAppContext();

  const [gameType, setGameType] = useState<GameType>('cricket');
  const [golfVariant, setGolfVariant] = useState('stroke-play');
  const [x01Score, setX01Score] = useState(501);
  const [x01DoubleIn, setX01DoubleIn] = useState(false);
  const [x01DoubleOut, setX01DoubleOut] = useState(true);
  const [swampRules, setSwampRules] = useState(true);
  const [tieBreakerEnabled, setTieBreakerEnabled] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!userProfile || userProfile.id === 'default-user') {
      router.push('/auth/login');
      return;
    }

    setCreating(true);
    setError('');

    const settings: OnlineGameSettings = {
      gameType,
      variant: gameType === 'cricket' ? 'singles' : gameType === 'golf' ? golfVariant : 'default',
      ...(gameType === 'cricket' && { swampRules }),
      ...(gameType === 'x01' && { x01StartingScore: x01Score, x01DoubleIn, x01DoubleOut }),
      ...(gameType === 'golf' && { tieBreakerEnabled }),
    };

    const result = await createOnlineSession(settings);
    if (result.success && result.session) {
      router.push(`/online/${result.session.id}`);
    } else {
      setError(result.error || 'Failed to create lobby');
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header showBackButton={true} />
      <PageWrapper>
        <div className="min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center px-4 sm:px-6 py-6">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-1 text-center">Create Lobby</h1>
          <p className="text-gray-400 text-sm mb-8 text-center">Pick your game — your opponent will see these settings before joining.</p>

          {/* Game type */}
          <div className="mb-6">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Game</p>
            <div className="grid grid-cols-3 gap-3">
              {GAME_TYPES.map(g => (
                <button
                  key={g.type}
                  onClick={() => setGameType(g.type)}
                  className={`py-4 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                    gameType === g.type
                      ? 'border-[#6b1a8b] bg-[#2a1a3a]'
                      : 'border-[#3a3a3a] bg-[#2a2a2a] hover:border-[#5a5a5a]'
                  }`}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span className="text-white text-sm font-bold">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cricket settings */}
          {gameType === 'cricket' && (
            <div className="mb-6 bg-[#2a2a2a] rounded-xl p-4 border border-[#3a3a3a]">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Variant: Singles (1v1)</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={swampRules}
                  onChange={e => setSwampRules(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <div>
                  <p className="text-white font-bold">Swamp Rules</p>
                  <p className="text-gray-500 text-xs">Standard cricket with Swamp scoring rules</p>
                </div>
              </label>
            </div>
          )}

          {/* x01 settings */}
          {gameType === 'x01' && (
            <div className="mb-6 bg-[#2a2a2a] rounded-xl p-4 border border-[#3a3a3a] space-y-4">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Starting Score</p>
                <div className="flex gap-3">
                  {X01_SCORES.map(score => (
                    <button
                      key={score}
                      onClick={() => setX01Score(score)}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                        x01Score === score
                          ? 'bg-[#6b1a8b] text-white'
                          : 'bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={x01DoubleIn}
                  onChange={e => setX01DoubleIn(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="text-white font-bold">Double In</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={x01DoubleOut}
                  onChange={e => setX01DoubleOut(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="text-white font-bold">Double Out</span>
              </label>
            </div>
          )}

          {/* Golf settings */}
          {gameType === 'golf' && (
            <div className="mb-6 bg-[#2a2a2a] rounded-xl p-4 border border-[#3a3a3a] space-y-4">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Variant</p>
                <div className="space-y-2">
                  {GOLF_VARIANTS.map(v => (
                    <label key={v.variant} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="golfVariant"
                        checked={golfVariant === v.variant}
                        onChange={() => setGolfVariant(v.variant)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="text-white font-bold">{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tieBreakerEnabled}
                  onChange={e => setTieBreakerEnabled(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="text-white font-bold">Tie Breaker</span>
              </label>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-4 bg-[#6b1a8b] text-white font-black text-lg rounded-xl uppercase tracking-wider hover:bg-[#8b2aab] transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Lobby'}
          </button>
        </div>
        </div>
      </PageWrapper>
    </div>
  );
}
