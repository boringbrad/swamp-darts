'use client';

import Header from '@/app/components/Header';
import GolfGame from '@/app/components/GolfGame';

export default function MatchPlayGamePage() {
  return (
    <div className="min-h-screen bg-[#2d5016]">
      <Header title="GOLF - MATCH PLAY" />
      <GolfGame variant="match-play" />
    </div>
  );
}
