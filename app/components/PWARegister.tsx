'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Check for updates every 60 seconds
          const updateInterval = setInterval(() => {
            registration.update();
          }, 60000);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('New service worker available!');
                setWaitingWorker(newWorker);
                setShowUpdatePrompt(true);
              }
            });
          });

          // Check immediately on load
          registration.update();

          return () => clearInterval(updateInterval);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Listen for SW_UPDATED messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('Service worker updated to version:', event.data.version);
          setShowUpdatePrompt(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Tell the waiting service worker to activate
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      // Listen for the controlling service worker to change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page to load the new version
        window.location.reload();
      });
    } else {
      // Just reload if no waiting worker
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-[#2a2a2a] border-2 border-[#6b1a8b] rounded-lg p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg mb-1">Update Available! 🎯</h3>
          <p className="text-gray-300 text-sm mb-3">
            A new version of Swamp Darts is ready. Reload to get the latest features and fixes.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-[#6b1a8b] text-white font-bold rounded hover:opacity-90 transition-opacity text-sm"
            >
              Update Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-[#444444] text-white font-bold rounded hover:bg-[#555555] transition-colors text-sm"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
