'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketPlayerSelection from '@/app/components/CricketPlayerSelection';
import { useAppContext } from '@/app/contexts/AppContext';

export default function CricketTagTeamPlayersPage() {
  const { playMode } = useAppContext();

  const playModeDisplay = playMode === 'practice' ? 'Practice' : playMode === 'casual' ? 'Casual' : 'League';
  const gameInfo = `Cricket - Tag Team - ${playModeDisplay}`;

  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET - TAG TEAM - PLAYER SELECT" gameInfo={gameInfo} />
      <PageWrapper>
        <CricketPlayerSelection variant="tag-team" />
      </PageWrapper>
    </div>
  );
}
