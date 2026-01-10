'use client';

import React from 'react';
import Link from 'next/link';

interface GameModeCardProps {
  title: string;
  href: string;
  color: 'cricket' | 'golf' | 'extra' | 'tbd' | 'gray';
  size?: 'large' | 'small';
  disabled?: boolean;
  subtitle?: string;
}

const colorClasses = {
  cricket: 'bg-[#8b1a1a]',
  golf: 'bg-[#2d5016]',
  extra: 'bg-[#1a5a5a]',
  tbd: 'bg-[#9d8b1a]',
  gray: 'bg-[#666666]',
};

export default function GameModeCard({ title, href, color, size = 'large', disabled = false, subtitle }: GameModeCardProps) {
  const bgColor = colorClasses[color];

  const sizeClasses = size === 'large'
    ? 'min-h-[200px] flex-1 min-w-[300px]'
    : 'h-24 flex-1';

  const content = (
    <div className="flex flex-col items-center justify-center gap-2">
      <span className="text-white text-4xl md:text-5xl font-bold tracking-wider">
        {title}
      </span>
      {subtitle && (
        <span className="text-white text-xl opacity-70">
          {subtitle}
        </span>
      )}
    </div>
  );

  if (disabled) {
    return (
      <div
        className={`${bgColor} ${sizeClasses} rounded-lg flex items-center justify-center opacity-50 cursor-not-allowed shadow-lg`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${bgColor} ${sizeClasses} rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-lg`}
    >
      {content}
    </Link>
  );
}
