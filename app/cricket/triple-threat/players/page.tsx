'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketPlayerSelection from '@/app/components/CricketPlayerSelection';
import { useAppContext } from '@/app/contexts/AppContext';

export default function CricketTripleThreatPlayersPage() {
  const { playMode } = useAppContext();

  const playModeDisplay = playMode === 'practice' ? 'Practice' : playMode === 'casual' ? 'Casual' : 'League';
  const gameInfo = `Cricket - Triple Threat - ${playModeDisplay}`;

  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET - TRIPLE THREAT - PLAYER SELECT" gameInfo={gameInfo} />
      <PageWrapper>
        <CricketPlayerSelection variant="triple-threat" />
      </PageWrapper>
    </div>
  );
}
