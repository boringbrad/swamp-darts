'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import GolfPlayerSelection from '@/app/components/GolfPlayerSelection';

export default function SkinsPlayersPage() {
  return (
    <div className="min-h-screen bg-[#2d5016]">
      <Header title="GOLF - SKINS - PLAYER SELECT" />

      <PageWrapper>
        <GolfPlayerSelection variant="skins" />
      </PageWrapper>
    </div>
  );
}
