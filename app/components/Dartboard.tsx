'use client';

import React from 'react';

export default function Dartboard() {
  return (
    <div className="relative w-64 h-64">
      {/* Dartboard SVG */}
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Outer ring */}
        <circle cx="100" cy="100" r="95" fill="#1a1a1a" stroke="#fff" strokeWidth="2"/>

        {/* Number ring background */}
        <circle cx="100" cy="100" r="90" fill="#1a1a1a"/>

        {/* Main dartboard (simplified) */}
        {/* This is a simplified dartboard - we'll add proper segments later */}

        {/* Doubles ring (outer) */}
        <circle cx="100" cy="100" r="85" fill="none" stroke="#2a2a2a" strokeWidth="8"/>

        {/* Main scoring area */}
        <circle cx="100" cy="100" r="70" fill="#2a2a2a"/>

        {/* Trebles ring */}
        <circle cx="100" cy="100" r="55" fill="none" stroke="#1a1a1a" strokeWidth="8"/>

        {/* Inner scoring area */}
        <circle cx="100" cy="100" r="40" fill="#2a2a2a"/>

        {/* Bullseye outer (25) */}
        <circle cx="100" cy="100" r="15" fill="#0f0" stroke="#000" strokeWidth="1"/>

        {/* Bullseye inner (bull) */}
        <circle cx="100" cy="100" r="6" fill="#f00" stroke="#000" strokeWidth="1"/>

        {/* Dartboard segments - simplified representation */}
        {/* Creating 20 segments */}
        {[6, 13, 4, 18, 1, 20, 5, 12, 9, 14, 11, 8, 16, 7, 19, 3, 17, 2, 15, 10].map((num, index) => {
          const angle = (index * 18) - 90; // 18 degrees per segment, starting from top
          const radians = (angle * Math.PI) / 180;
          const x = 100 + 90 * Math.cos(radians);
          const y = 100 + 90 * Math.sin(radians);

          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="10"
              fontWeight="bold"
            >
              {num}
            </text>
          );
        })}

        {/* Radial lines for segments */}
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i * 18) - 90;
          const radians = (angle * Math.PI) / 180;
          const x2 = 100 + 85 * Math.cos(radians);
          const y2 = 100 + 85 * Math.sin(radians);

          return (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={x2}
              y2={y2}
              stroke="#555"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Colored segments (alternating red/green and white/black) */}
        {Array.from({ length: 20 }).map((_, i) => {
          const isRed = i % 2 === 0;
          const angle1 = (i * 18) - 99;
          const angle2 = (i * 18) - 81;
          const radians1 = (angle1 * Math.PI) / 180;
          const radians2 = (angle2 * Math.PI) / 180;

          // Outer segment (doubles)
          const path = `
            M 100 100
            L ${100 + 85 * Math.cos(radians1)} ${100 + 85 * Math.sin(radians1)}
            A 85 85 0 0 1 ${100 + 85 * Math.cos(radians2)} ${100 + 85 * Math.sin(radians2)}
            Z
          `;

          return (
            <path
              key={`seg-${i}`}
              d={path}
              fill={isRed ? '#8b1a1a' : '#1a5a1a'}
              opacity="0.6"
            />
          );
        })}
      </svg>
    </div>
  );
}
