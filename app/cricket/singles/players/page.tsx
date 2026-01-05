'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketPlayerSelection from '@/app/components/CricketPlayerSelection';

export default function CricketSinglesPlayersPage() {
  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET - SINGLES - PLAYER SELECT" />
      <PageWrapper>
        <CricketPlayerSelection variant="singles" />
      </PageWrapper>
    </div>
  );
}
