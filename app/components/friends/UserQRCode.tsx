'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '@/app/contexts/AppContext';

interface UserQRCodeProps {
  size?: number;
}

export default function UserQRCode({ size = 256 }: UserQRCodeProps) {
  const { userProfile } = useAppContext();

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center p-8 bg-[#333333] rounded-lg">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Create a URL that opens in the app and sends friend request
  // Works with native phone camera apps!
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3001';

  const qrData = `${baseUrl}/add-friend?u=${userProfile.id}&n=${encodeURIComponent(userProfile.display_name || userProfile.username)}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg">
        <QRCodeSVG
          value={qrData}
          size={size}
          level="H"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <div className="text-white font-bold text-lg">{userProfile.display_name}</div>
        <div className="text-gray-400 text-sm">@{userProfile.username}</div>
      </div>

      {/* Debug info - show what's encoded */}
      <details className="w-full max-w-md">
        <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-300">
          Show QR Code Data
        </summary>
        <div className="mt-2 p-3 bg-[#222222] rounded text-xs text-gray-300 break-all font-mono">
          {qrData}
        </div>
      </details>
    </div>
  );
}
