'use client';

import { useEffect } from 'react';
import { updateUserPresence } from '../lib/friends';

/**
 * Hook to automatically update user presence (last_seen_at) while they're active
 * Updates presence on mount and every 2 minutes while the component is mounted
 */
export function useUserPresence() {
  useEffect(() => {
    // Update presence immediately on mount
    updateUserPresence();

    // Update presence every 2 minutes
    const interval = setInterval(() => {
      updateUserPresence();
    }, 2 * 60 * 1000); // 2 minutes

    // Update presence on visibility change (when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateUserPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
