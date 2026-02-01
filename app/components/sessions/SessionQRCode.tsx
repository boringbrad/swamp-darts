'use client';

import { QRCodeSVG } from 'qrcode.react';

interface SessionQRCodeProps {
  sessionId: string;
  roomCode: string;
  hostName: string;
  size?: number;
}

export default function SessionQRCode({ sessionId, roomCode, hostName, size = 256 }: SessionQRCodeProps) {
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3001';

  const qrData = `${baseUrl}/join-session?s=${sessionId}&c=${roomCode}&h=${encodeURIComponent(hostName)}`;

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
        <div className="text-white text-3xl font-bold tracking-widest font-mono">{roomCode}</div>
        <div className="text-gray-400 text-sm mt-1">Room Code</div>
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
