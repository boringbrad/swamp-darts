'use client';

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const setOn = () => setOffline(false);
    const setOff = () => setOffline(true);
    window.addEventListener('online', setOn);
    window.addEventListener('offline', setOff);
    return () => {
      window.removeEventListener('online', setOn);
      window.removeEventListener('offline', setOff);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] bg-gray-800 border border-gray-600 text-gray-300 text-xs font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none">
      Offline — stats will sync when reconnected
    </div>
  );
}
