'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import PageWrapper from '@/app/components/PageWrapper';
import CricketGame from '@/app/components/CricketGame';
import { useAppContext } from '@/app/contexts/AppContext';
import { Player, CricketRules } from '@/app/types/game';

export default function CricketTripleThreatGamePage() {
  const router = useRouter();
  const { selectedPlayers, cricketRules } = useAppContext();
  const [players, setPlayers] = useState<Player[]>([]);
  const [rules, setRules] = useState<CricketRules>({ swampRules: true, noPoint: false, point: false });

  useEffect(() => {
    // Get selected players for cricket triple threat
    const cricketData = selectedPlayers.cricket?.['triple-threat'];

    if (!cricketData || !cricketData.players || cricketData.players.length !== 3) {
      // Redirect back to player selection if no players selected
      router.push('/cricket/triple-threat/players');
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
      <Header title="CRICKET - TRIPLE THREAT" />
      <PageWrapper>
        <CricketGame variant="triple-threat" players={players} rules={rules} />
      </PageWrapper>
    </div>
  );
}
