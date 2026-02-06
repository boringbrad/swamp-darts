'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import { useRouter } from 'next/navigation';

export default function X01SetupPage() {
  const router = useRouter();
  const [numPlayers, setNumPlayers] = useState(2);
  const [isTeams, setIsTeams] = useState(false);
  const [startingScore, setStartingScore] = useState(5); // 5 = 501
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);

  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleStart = () => {
    const players = playerNames.slice(0, numPlayers);
    const queryParams = new URLSearchParams({
      players: JSON.stringify(players),
      startingScore: String(startingScore * 100 + 1), // Convert to actual score (101, 201, etc.)
      isTeams: String(isTeams),
    });
    router.push(`/extra/x01/game?${queryParams}`);
  };

  return (
    <div className="min-h-screen bg-[#1a5a5a]">
      <Header title="X01 SETUP" />

      <main className="pt-24 px-6 pb-6 flex items-center justify-center min-h-screen">
        <div className="max-w-2xl w-full bg-[#2d4a4a] rounded-lg p-8 space-y-6">
          {/* Number of Players */}
          <div>
            <h2 className="text-white text-2xl font-bold mb-4">Number of Players</h2>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setNumPlayers(num);
                    if (num !== 4) setIsTeams(false);
                  }}
                  className={`py-4 rounded-lg text-2xl font-bold transition-colors ${
                    numPlayers === num
                      ? 'bg-[#0984e3] text-white'
                      : 'bg-[#444444] text-gray-300 hover:bg-[#555555]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Team Mode */}
          {numPlayers === 4 && (
            <div>
              <h2 className="text-white text-2xl font-bold mb-4">Team Mode</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsTeams(false)}
                  className={`py-4 rounded-lg text-xl font-bold transition-colors ${
                    !isTeams
                      ? 'bg-[#0984e3] text-white'
                      : 'bg-[#444444] text-gray-300 hover:bg-[#555555]'
                  }`}
                >
                  Individual
                </button>
                <button
                  onClick={() => setIsTeams(true)}
                  className={`py-4 rounded-lg text-xl font-bold transition-colors ${
                    isTeams
                      ? 'bg-[#0984e3] text-white'
                      : 'bg-[#444444] text-gray-300 hover:bg-[#555555]'
                  }`}
                >
                  Teams (2v2)
                </button>
              </div>
            </div>
          )}

          {/* Starting Score */}
          <div>
            <h2 className="text-white text-2xl font-bold mb-4">Starting Score</h2>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => (
                <button
                  key={x}
                  onClick={() => setStartingScore(x)}
                  className={`py-4 rounded-lg text-2xl font-bold transition-colors ${
                    startingScore === x
                      ? 'bg-[#0984e3] text-white'
                      : 'bg-[#444444] text-gray-300 hover:bg-[#555555]'
                  }`}
                >
                  {x}01
                </button>
              ))}
            </div>
          </div>

          {/* Player Names */}
          <div>
            <h2 className="text-white text-2xl font-bold mb-4">Player Names</h2>
            <div className="space-y-3">
              {Array.from({ length: numPlayers }).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  value={playerNames[index]}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  placeholder={`Player ${index + 1}`}
                  className="w-full px-4 py-3 rounded-lg bg-[#1a3a3a] text-white text-xl border-2 border-[#0984e3] focus:outline-none focus:border-[#74b9ff]"
                />
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full py-6 bg-[#00d1b2] text-white text-3xl font-bold rounded-lg hover:bg-[#00f5d4] transition-colors"
          >
            START GAME
          </button>
        </div>
      </main>
    </div>
  );
}
