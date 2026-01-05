'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketPlayerSelection from '@/app/components/CricketPlayerSelection';

export default function CricketFatal4WayPlayersPage() {
  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET - FATAL 4-WAY - PLAYER SELECT" />
      <PageWrapper>
        <CricketPlayerSelection variant="fatal-4-way" />
      </PageWrapper>
    </div>
  );
}
