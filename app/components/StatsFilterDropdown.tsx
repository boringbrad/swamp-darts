'use client';

import { useState, useRef, useEffect } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

interface StatsFilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function StatsFilterDropdown({
  label,
  options,
  value,
  onChange,
  className = '',
}: StatsFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label */}
      <label className="block text-white text-sm font-bold mb-2">
        {label}
      </label>

      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-[#333333] text-white text-left rounded flex items-center justify-between hover:bg-[#444444] transition-colors"
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border-2 border-[#444444] rounded shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full px-4 py-2 text-left hover:bg-[#444444] transition-colors ${
                value === option.value
                  ? 'bg-[#6b1a8b] text-white font-bold'
                  : 'text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
