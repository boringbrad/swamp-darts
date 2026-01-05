'use client';

import Header from '@/app/components/Header';
import GolfGame from '@/app/components/GolfGame';

export default function StrokePlayGamePage() {
  return (
    <div className="min-h-screen bg-[#2d5016]">
      <Header title="GOLF - STROKE PLAY" />
      <GolfGame variant="stroke-play" />
    </div>
  );
}
