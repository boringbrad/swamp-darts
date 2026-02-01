'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect old sessions page to Friends page
 * Sessions are now managed through Friends → SESSION tab
 */
export default function SessionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push('/friends');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <div className="text-white text-xl">Redirecting to Friends page...</div>
    </div>
  );
}
