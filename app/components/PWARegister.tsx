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

          // Listen for a new SW waiting to activate
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available!');
                setWaitingWorker(newWorker);
                setShowUpdatePrompt(true);
              }
            });
          });

          // Check for a new version once on page load (no polling interval —
          // avoids surfacing update prompts in the middle of active games)
          registration.update();
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  const handleUpdate = () => {
    setShowUpdatePrompt(false);
    if (waitingWorker) {
      // Tell the waiting SW to activate, then reload once — { once: true }
      // prevents stale listeners from firing on future controllerchange events
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
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
