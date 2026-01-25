'use client';

import { useState, useEffect } from 'react';

/**
 * Component that displays an overlay on mobile devices in landscape orientation
 * Prompts users to rotate their device to portrait mode
 */
export default function MobileOrientationLock() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Only apply to mobile devices (max-width: 1023px)
      const isMobile = window.innerWidth < 1024;
      const isCurrentlyLandscape = window.innerWidth > window.innerHeight;

      setIsLandscape(isMobile && isCurrentlyLandscape);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscape) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-8">
      <div className="text-white text-center">
        {/* Rotation Icon */}
        <div className="mb-8">
          <svg
            className="w-24 h-24 mx-auto animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold mb-4">ROTATE YOUR DEVICE</h1>
        <p className="text-xl text-gray-300">
          Please rotate your device to portrait mode to use this app.
        </p>
      </div>
    </div>
  );
}
