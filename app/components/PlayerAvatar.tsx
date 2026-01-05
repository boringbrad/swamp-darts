'use client';

import React from 'react';
import { STOCK_AVATARS } from '../lib/avatars';

export type PlayerColor = 'red' | 'blue' | 'purple' | 'green' | null;

interface PlayerAvatarProps {
  name: string;
  selected?: boolean;
  onClick?: () => void;
  teamColor?: PlayerColor;
  avatar?: string;
}

// Player color mappings
const PLAYER_COLORS: Record<Exclude<PlayerColor, null>, string> = {
  red: '#9d1a1a',
  blue: '#1a7a9d',
  purple: '#6b1a8b',
  green: '#2d5016', // Swamp green
};

export default function PlayerAvatar({ name, selected = false, onClick, teamColor, avatar }: PlayerAvatarProps) {
  const borderStyle = teamColor ? { borderColor: PLAYER_COLORS[teamColor] } : {};
  const avatarData = STOCK_AVATARS.find(a => a.id === avatar) || STOCK_AVATARS[0];

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 transition-opacity ${selected ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
    >
      <div className="relative">
        <div
          className="w-24 h-24 rounded-full border-4 flex items-center justify-center text-4xl"
          style={{ backgroundColor: avatarData.color, ...borderStyle }}
        >
          {avatarData.emoji}
        </div>
        {selected && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <span className="text-white text-xs font-bold" style={{ textShadow: '0 0 4px black' }}>REMOVE</span>
          </div>
        )}
      </div>
      <span className="text-white text-sm font-bold max-w-24 truncate">{name}</span>
    </button>
  );
}
