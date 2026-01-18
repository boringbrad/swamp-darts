'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketPlayerSelection from '@/app/components/CricketPlayerSelection';
import { useAppContext } from '@/app/contexts/AppContext';

export default function CricketSinglesPlayersPage() {
  const { playMode } = useAppContext();

  const playModeDisplay = playMode === 'practice' ? 'Practice' : playMode === 'casual' ? 'Casual' : 'League';
  const gameInfo = `Cricket - Singles Match - ${playModeDisplay}`;

  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET - SINGLES - PLAYER SELECT" gameInfo={gameInfo} />
      <PageWrapper>
        <CricketPlayerSelection variant="singles" />
      </PageWrapper>
    </div>
  );
}
