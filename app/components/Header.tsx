'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from '../contexts/AppContext';
import SettingsModal from './SettingsModal';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function Header({ title, showBackButton, onBack }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile, popRoute } = useAppContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Determine if we should show the back button
  const shouldShowBack = showBackButton !== undefined ? showBackButton : pathname !== '/';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      const previousRoute = popRoute();
      if (previousRoute) {
        router.push(previousRoute);
      } else {
        router.back();
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-transparent z-50 flex items-center justify-between px-6">
      {/* Back Button or Spacer */}
      <div className="w-12">
        {shouldShowBack ? (
          <button
            onClick={handleBack}
            className="w-12 h-12 flex items-center justify-center hover:opacity-80 transition-opacity"
            aria-label="Go back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <div className="w-12 h-12" />
        )}
      </div>

      {/* Spacer for center alignment */}
      <div className="flex-1"></div>

      {/* Right Icons */}
      <div className="flex gap-6 opacity-50 pr-8">
        {/* Home Icon */}
        <button
          onClick={() => router.push('/')}
          className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Home"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12H15V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Info Icon */}
        <button
          className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Information"
        >
          <span className="text-white text-sm font-bold">i</span>
        </button>

        {/* Settings Icon */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 25C22.7614 25 25 22.7614 25 20C25 17.2386 22.7614 15 20 15C17.2386 15 15 17.2386 15 20C15 22.7614 17.2386 25 20 25Z" fill="white"/>
            <path d="M33 20C33 19.3 32.9 18.6 32.8 17.9L36.9 14.6C37.3 14.3 37.4 13.7 37.2 13.3L33.4 6.7C33.2 6.3 32.6 6.1 32.2 6.3L27.4 8.5C26.4 7.7 25.3 7.1 24.1 6.6L23.3 1.3C23.2 0.8 22.8 0.5 22.3 0.5H14.7C14.2 0.5 13.8 0.8 13.7 1.3L12.9 6.6C11.7 7.1 10.6 7.7 9.6 8.5L4.8 6.3C4.4 6.1 3.8 6.3 3.6 6.7L-0.2 13.3C-0.4 13.7 -0.3 14.3 0.1 14.6L4.2 17.9C4.1 18.6 4 19.3 4 20C4 20.7 4.1 21.4 4.2 22.1L0.1 25.4C-0.3 25.7 -0.4 26.3 -0.2 26.7L3.6 33.3C3.8 33.7 4.4 33.9 4.8 33.7L9.6 31.5C10.6 32.3 11.7 32.9 12.9 33.4L13.7 38.7C13.8 39.2 14.2 39.5 14.7 39.5H22.3C22.8 39.5 23.2 39.2 23.3 38.7L24.1 33.4C25.3 32.9 26.4 32.3 27.4 31.5L32.2 33.7C32.6 33.9 33.2 33.7 33.4 33.3L37.2 26.7C37.4 26.3 37.3 25.7 36.9 25.4L32.8 22.1C32.9 21.4 33 20.7 33 20Z" fill="white"/>
          </svg>
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
}
