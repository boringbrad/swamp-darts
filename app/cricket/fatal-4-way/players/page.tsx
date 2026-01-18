'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketPlayerSelection from '@/app/components/CricketPlayerSelection';
import { useAppContext } from '@/app/contexts/AppContext';

export default function CricketFatal4WayPlayersPage() {
  const { playMode } = useAppContext();

  const playModeDisplay = playMode === 'practice' ? 'Practice' : playMode === 'casual' ? 'Casual' : 'League';
  const gameInfo = `Cricket - Fatal 4 Way - ${playModeDisplay}`;

  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET - FATAL 4-WAY - PLAYER SELECT" gameInfo={gameInfo} />
      <PageWrapper>
        <CricketPlayerSelection variant="fatal-4-way" />
      </PageWrapper>
    </div>
  );
}
