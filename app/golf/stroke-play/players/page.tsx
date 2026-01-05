'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import GolfPlayerSelection from '@/app/components/GolfPlayerSelection';

export default function StrokePlayPlayersPage() {
  return (
    <div className="min-h-screen bg-[#2d5016]">
      <Header title="GOLF - STROKE PLAY - PLAYER SELECT" />

      <PageWrapper>
        <GolfPlayerSelection variant="stroke-play" />
      </PageWrapper>
    </div>
  );
}
