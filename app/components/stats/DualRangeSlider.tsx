'use client';

import { useEffect, useRef, useState } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
}

export default function DualRangeSlider({ min, max, minValue, maxValue, onChange }: DualRangeSliderProps) {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const getPercentage = (value: number) => ((value - min) / (max - min)) * 100;

  const handleMouseDown = (handle: 'min' | 'max') => {
    setIsDragging(handle);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const value = Math.round((percentage / 100) * (max - min) + min);

    if (isDragging === 'min') {
      onChange(Math.min(value, maxValue), maxValue);
    } else {
      onChange(minValue, Math.max(value, minValue));
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !trackRef.current || e.touches.length === 0) return;

    const rect = trackRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const percentage = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const value = Math.round((percentage / 100) * (max - min) + min);

    if (isDragging === 'min') {
      onChange(Math.min(value, maxValue), maxValue);
    } else {
      onChange(minValue, Math.max(value, minValue));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, minValue, maxValue]);

  const minPercent = getPercentage(minValue);
  const maxPercent = getPercentage(maxValue);

  return (
    <div className="relative w-full">
      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-2 bg-[#1a1a1a] rounded-full cursor-pointer"
      >
        {/* Active range */}
        <div
          className="absolute h-full bg-[#90EE90] rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-2 border-[#90EE90] cursor-grab ${
            isDragging === 'min' ? 'cursor-grabbing scale-110' : ''
          } transition-transform`}
          style={{ left: `${minPercent}%`, transform: 'translate(-50%, -50%)' }}
          onMouseDown={() => handleMouseDown('min')}
          onTouchStart={() => handleMouseDown('min')}
        >
          {/* Value label above handle */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
            Game {minValue + 1}
          </div>
        </div>

        {/* Max handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-2 border-[#90EE90] cursor-grab ${
            isDragging === 'max' ? 'cursor-grabbing scale-110' : ''
          } transition-transform`}
          style={{ left: `${maxPercent}%`, transform: 'translate(-50%, -50%)' }}
          onMouseDown={() => handleMouseDown('max')}
          onTouchStart={() => handleMouseDown('max')}
        >
          {/* Value label above handle */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
            Game {maxValue + 1}
          </div>
        </div>
      </div>
    </div>
  );
}
