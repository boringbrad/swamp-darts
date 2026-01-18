'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import GolfPlayerSelection from '@/app/components/GolfPlayerSelection';
import { useAppContext } from '@/app/contexts/AppContext';

export default function SkinsPlayersPage() {
  const { playMode } = useAppContext();

  const playModeDisplay = playMode === 'practice' ? 'Practice' : playMode === 'casual' ? 'Casual' : 'League';
  const gameInfo = `Golf - Skins - ${playModeDisplay}`;

  return (
    <div className="min-h-screen bg-[#2d5016]">
      <Header title="GOLF - SKINS - PLAYER SELECT" gameInfo={gameInfo} />

      <PageWrapper>
        <GolfPlayerSelection variant="skins" />
      </PageWrapper>
    </div>
  );
}
