'use client';

import { useEffect, useState } from 'react';
import { loadGolfMatches, getUniqueCourseNames, getUniquePlayers } from '@/app/lib/golfStats';
import { loadCricketMatches, getUniquePlayers as getCricketPlayers } from '@/app/lib/cricketStats';
import StatsFilterDropdown, { FilterOption } from '../StatsFilterDropdown';

interface StatsFiltersProps {
  gameType: 'golf' | 'cricket';
  onGameTypeChange: (gameType: 'golf' | 'cricket') => void;
  playerFilter: string;
  onPlayerFilterChange: (playerId: string) => void;
  courseFilter?: string;
  onCourseFilterChange?: (courseName: string) => void;
  playModeFilter?: string;
  onPlayModeFilterChange?: (playMode: string) => void;
  hidePlayerFilter?: boolean;
}

const GAME_TYPE_OPTIONS: FilterOption[] = [
  { value: 'golf', label: 'Golf' },
  { value: 'cricket', label: 'Cricket' },
];

const PLAY_MODE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Modes' },
  { value: 'practice', label: 'Practice' },
  { value: 'casual', label: 'Casual' },
  { value: 'league', label: 'League' },
];

export default function StatsFilters({
  gameType,
  onGameTypeChange,
  playerFilter,
  onPlayerFilterChange,
  courseFilter,
  onCourseFilterChange,
  playModeFilter,
  onPlayModeFilterChange,
  hidePlayerFilter = false,
}: StatsFiltersProps) {
  const [playerOptions, setPlayerOptions] = useState<FilterOption[]>([
    { value: 'all', label: 'All Players' },
  ]);
  const [courseOptions, setCourseOptions] = useState<FilterOption[]>([
    { value: 'all', label: 'All Courses' },
  ]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for stats refresh events (when players are deleted)
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('statsRefresh', handleRefresh);
    return () => window.removeEventListener('statsRefresh', handleRefresh);
  }, []);

  useEffect(() => {
    // Load player and course options based on game type
    if (gameType === 'golf') {
      const matches = loadGolfMatches();

      // Get unique players
      const players = getUniquePlayers(matches);
      const playerOpts: FilterOption[] = [
        { value: 'all', label: 'All Players' },
        ...players.map(p => ({ value: p.id, label: p.name })),
      ];
      setPlayerOptions(playerOpts);

      // Get unique courses
      const courses = getUniqueCourseNames(matches);
      const courseOpts: FilterOption[] = [
        { value: 'all', label: 'All Courses' },
        ...courses.map(c => ({ value: c, label: c })),
      ];
      setCourseOptions(courseOpts);
    } else if (gameType === 'cricket') {
      const matches = loadCricketMatches();

      // Get unique players
      const players = getCricketPlayers(matches);
      const playerOpts: FilterOption[] = [
        { value: 'all', label: 'All Players' },
        ...players.map(p => ({ value: p.id, label: p.name })),
      ];
      setPlayerOptions(playerOpts);
    }
  }, [gameType, refreshTrigger]);

  return (
    <div className="bg-[#333333] rounded-lg p-6 mb-8">
      <div className="grid grid-cols-4 gap-4">
        {/* Game Type Selector */}
        <StatsFilterDropdown
          label="GAME TYPE"
          options={GAME_TYPE_OPTIONS}
          value={gameType}
          onChange={(value) => onGameTypeChange(value as 'golf' | 'cricket')}
        />

        {/* Play Mode Filter */}
        {onPlayModeFilterChange && (
          <StatsFilterDropdown
            label="MODE"
            options={PLAY_MODE_OPTIONS}
            value={playModeFilter || 'all'}
            onChange={onPlayModeFilterChange}
          />
        )}

        {/* Player Filter - Hidden for regular player accounts */}
        {!hidePlayerFilter && (
          <StatsFilterDropdown
            label="PLAYER"
            options={playerOptions}
            value={playerFilter}
            onChange={onPlayerFilterChange}
          />
        )}

        {/* Course Filter (Golf only) */}
        {gameType === 'golf' && onCourseFilterChange && (
          <StatsFilterDropdown
            label="COURSE"
            options={courseOptions}
            value={courseFilter || 'all'}
            onChange={onCourseFilterChange}
          />
        )}
      </div>
    </div>
  );
}
