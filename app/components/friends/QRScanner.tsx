'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  const scannerId = 'qr-scanner-reader';

  const startScanning = async () => {
    // Prevent starting if already scanning or stopping
    if (isScanning || isStoppingRef.current || scannerRef.current) {
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Successfully scanned
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Scanning in progress, errors are normal
          // Only log actual errors
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err: any) {
      console.error('Failed to start scanning:', err);
      setHasPermission(false);
      scannerRef.current = null;
      if (onError) {
        onError(err.message || 'Failed to access camera');
      }
    }
  };

  const stopScanning = async () => {
    // Prevent multiple simultaneous stop calls
    if (isStoppingRef.current || !scannerRef.current) {
      return;
    }

    isStoppingRef.current = true;
    setIsScanning(false);

    try {
      const scanner = scannerRef.current;
      if (scanner && scanner.getState() === 2) { // 2 = SCANNING state
        await scanner.stop();
      }
      if (scanner) {
        scanner.clear();
      }
    } catch (err) {
      // Silently handle stop errors - they're usually harmless
      console.log('Scanner stop/clear:', err);
    } finally {
      scannerRef.current = null;
      isStoppingRef.current = false;
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;

        // Use setTimeout to allow async cleanup without blocking unmount
        setTimeout(() => {
          try {
            if (scanner.getState() === 2) {
              scanner.stop().catch(() => {});
            }
            scanner.clear();
          } catch (err) {
            // Ignore cleanup errors
          }
        }, 0);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {!isScanning && hasPermission === null && (
        <button
          onClick={startScanning}
          className="px-6 py-3 bg-[#90EE90] text-black font-bold rounded-lg hover:bg-[#7ACC7A] transition-colors"
        >
          START CAMERA
        </button>
      )}

      {hasPermission === false && (
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-center">
          <div className="text-red-400 font-bold mb-2">Camera Access Denied</div>
          <div className="text-gray-400 text-sm">
            Please enable camera permissions to scan QR codes
          </div>
        </div>
      )}

      <div id={scannerId} className="w-full max-w-md rounded-lg overflow-hidden"></div>

      {isScanning && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-white text-center">
            Position the QR code within the frame
          </div>
          <button
            onClick={stopScanning}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
          >
            STOP SCANNING
          </button>
        </div>
      )}
    </div>
  );
}
