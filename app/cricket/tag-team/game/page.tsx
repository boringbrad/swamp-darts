'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import Dartboard from '@/app/components/Dartboard';

type CricketNumber = 15 | 16 | 17 | 18 | 19 | 20 | 'B';

interface TeamScore {
  name: string;
  players: string[];
  color: 'blue' | 'red';
  marks: Record<CricketNumber, number>;
  points: number;
}

export default function CricketTagTeamGamePage() {
  const cricketNumbers: CricketNumber[] = [20, 19, 18, 17, 16, 15, 'B'];

  const [blueTeam, setBlueTeam] = useState<TeamScore>({
    name: 'THE MAYOR',
    players: ['THE MAYOR', 'PIPER ROSE'],
    color: 'blue',
    marks: { 15: 0, 16: 0, 17: 0, 18: 3, 19: 0, 20: 0, B: 0 },
    points: 14,
  });

  const [redTeam, setRedTeam] = useState<TeamScore>({
    name: 'PONCHO MAN',
    players: ['STOVE', 'PONCHO MAN'],
    color: 'red',
    marks: { 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, B: 0 },
    points: 11,
  });

  const [currentNumber, setCurrentNumber] = useState<CricketNumber>(18);

  const renderMarks = (count: number) => {
    const marks = [];
    for (let i = 0; i < Math.min(count, 3); i++) {
      marks.push(
        <div key={i} className="w-1 h-6 bg-white" style={{ transform: `rotate(${i * 60}deg)` }} />
      );
    }
    return marks;
  };

  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      {/* Compact Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#8b1a1a] z-50 flex items-center justify-between px-6 border-b-2 border-white">
        <button className="flex flex-col gap-1">
          <div className="w-8 h-0.5 bg-white"></div>
          <div className="w-8 h-0.5 bg-white"></div>
          <div className="w-8 h-0.5 bg-white"></div>
        </button>
        <h1 className="text-2xl font-bold text-white">TAG TEAM - SWAMP RULES</h1>
        <div className="flex gap-3">
          <button className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-white text-lg font-bold">i</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center">
            <svg width="30" height="30" viewBox="0 0 40 40" fill="white">
              <circle cx="20" cy="20" r="2"/>
              <circle cx="20" cy="10" r="2"/>
              <circle cx="20" cy="30" r="2"/>
              <circle cx="10" cy="20" r="2"/>
              <circle cx="30" cy="20" r="2"/>
              <circle cx="14" cy="14" r="2"/>
              <circle cx="26" cy="26" r="2"/>
              <circle cx="26" cy="14" r="2"/>
              <circle cx="14" cy="26" r="2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="pt-16 flex h-screen">
        {/* Left Side - Dartboard */}
        <div className="w-1/3 bg-black flex items-center justify-center">
          <Dartboard />
        </div>

        {/* Middle - Current Player Info */}
        <div className="w-1/6 bg-[#8b1a1a] flex flex-col items-center justify-start pt-8 border-l-2 border-r-2 border-white">
          <div className="flex items-center gap-2 mb-4">
            <button className="text-white text-2xl">▲</button>
            <span className="text-white text-sm font-bold">THE MAYOR</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-white text-sm">PIPER ROSE</div>
            <div className="text-white text-sm">PONCHO MAN</div>
          </div>

          {/* Current number being played */}
          <div className="mt-12 flex flex-col items-center">
            <div className="text-white text-6xl font-bold mb-4">{currentNumber}</div>
            <div className="w-16 h-1 bg-white mb-4"></div>
            <div className="text-red-500 text-4xl font-bold">12</div>
          </div>

          <button className="mt-auto mb-8 px-8 py-4 bg-[#9d8b1a] text-white text-xl font-bold rounded">
            NEXT<br/>PLAYER
          </button>
        </div>

        {/* Right Side - Scoreboard */}
        <div className="flex-1 bg-[#333333] p-6">
          {/* Team Headers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#1a7a9d] p-4 rounded flex flex-col items-center">
              <div className="text-white text-4xl font-bold mb-2">{blueTeam.points.toString().padStart(2, '0')}</div>
              <div className="text-white text-sm">{blueTeam.players.join(', ')}</div>
            </div>
            <div className="bg-[#9d1a1a] p-4 rounded flex flex-col items-center">
              <div className="text-white text-4xl font-bold mb-2">{redTeam.points.toString().padStart(2, '0')}</div>
              <div className="text-white text-sm">{redTeam.players.join(', ')}</div>
            </div>
          </div>

          {/* Cricket Numbers Grid */}
          <div className="space-y-2">
            {cricketNumbers.map((num) => (
              <div key={num} className="grid grid-cols-3 gap-2 items-center">
                {/* Blue Team Marks */}
                <div className="bg-[#1a7a9d] h-12 rounded flex items-center justify-center relative">
                  <div className="flex gap-1">
                    {renderMarks(blueTeam.marks[num])}
                  </div>
                  {blueTeam.marks[num] > 3 && (
                    <div className="absolute right-2 text-white font-bold">
                      +{blueTeam.marks[num] - 3}
                    </div>
                  )}
                </div>

                {/* Number */}
                <div className="bg-[#666666] h-12 rounded flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{num}</span>
                </div>

                {/* Red Team Marks */}
                <div className="bg-[#9d1a1a] h-12 rounded flex items-center justify-center relative">
                  <div className="flex gap-1">
                    {renderMarks(redTeam.marks[num])}
                  </div>
                  {redTeam.marks[num] > 3 && (
                    <div className="absolute right-2 text-white font-bold">
                      +{redTeam.marks[num] - 3}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <button className="bg-[#666666] text-white py-3 rounded font-bold hover:bg-[#777777]">
              MISS
            </button>
            <div></div>
            <button className="bg-[#666666] text-white py-3 rounded font-bold hover:bg-[#777777]">
              UNDO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
