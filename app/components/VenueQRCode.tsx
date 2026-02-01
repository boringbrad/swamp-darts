'use client';

import { QRCodeSVG } from 'qrcode.react';

interface VenueQRCodeProps {
  roomCode: string;
  venueName?: string;
  size?: number;
}

/**
 * QR Code component for venue joining
 * Generates a QR code that links to /join-venue?code={roomCode}
 * Works with native phone camera apps
 */
export default function VenueQRCode({ roomCode, venueName, size = 256 }: VenueQRCodeProps) {
  // Generate URL for QR code
  // Use current domain or fallback to production URL
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://swampdarts.com';

  const joinUrl = `${baseUrl}/join-venue?code=${roomCode}${venueName ? `&name=${encodeURIComponent(venueName)}` : ''}`;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <QRCodeSVG
          value={joinUrl}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>

      {/* Room Code Display */}
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-1">Room Code</p>
        <p className="text-white font-mono text-3xl font-bold tracking-widest">{roomCode}</p>
      </div>

      {/* Instructions */}
      <div className="text-center max-w-sm">
        <p className="text-gray-400 text-sm">
          Scan this QR code with your phone's camera or enter the room code to join this venue
        </p>
      </div>
    </div>
  );
}
