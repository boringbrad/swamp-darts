'use client';

import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketPlayerSelection from '@/app/components/CricketPlayerSelection';

export default function CricketTagTeamPlayersPage() {
  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET - TAG TEAM - PLAYER SELECT" />
      <PageWrapper>
        <CricketPlayerSelection variant="tag-team" />
      </PageWrapper>
    </div>
  );
}
