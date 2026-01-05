'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import GolfPlayerSelection from '@/app/components/GolfPlayerSelection';

export default function MatchPlayPlayersPage() {
  return (
    <div className="min-h-screen bg-[#2d5016]">
      <Header title="GOLF - MATCH PLAY - PLAYER SELECT" />

      <PageWrapper>
        <GolfPlayerSelection variant="match-play" />
      </PageWrapper>
    </div>
  );
}
