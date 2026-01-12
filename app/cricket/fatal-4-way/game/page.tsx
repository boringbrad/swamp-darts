'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketGame from '@/app/components/CricketGame';
import { useAppContext } from '@/app/contexts/AppContext';
import { Player, CricketRules } from '@/app/types/game';

export default function CricketFatal4WayGamePage() {
  const router = useRouter();
  const { selectedPlayers, cricketRules } = useAppContext();
  const [players, setPlayers] = useState<Player[]>([]);
  const [rules, setRules] = useState<CricketRules>({ swampRules: true, noPoint: false, point: false });

  useEffect(() => {
    // Get selected players for cricket fatal 4-way
    const cricketData = selectedPlayers.cricket?.['fatal-4-way'];

    if (!cricketData || !cricketData.players || cricketData.players.length !== 4) {
      // Redirect back to player selection if no players selected
      router.push('/cricket/fatal-4-way/players');
      return;
    }

    setPlayers(cricketData.players);

    // Get cricket rules
    if (cricketRules) {
      setRules(cricketRules);
    }
  }, [selectedPlayers, cricketRules, router]);

  if (players.length === 0) {
    return null; // Loading or redirecting
  }

  return (
    <div className="min-h-screen bg-[#8b1a1a]">
      <Header title="CRICKET - FATAL 4-WAY" />
      <PageWrapper>
        <CricketGame variant="fatal-4-way" players={players} rules={rules} />
      </PageWrapper>
    </div>
  );
}
