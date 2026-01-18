'use client';

import { useState, useRef, useEffect } from 'react';

interface PhotoEditorProps {
  isOpen: boolean;
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onCancel: () => void;
}

export default function PhotoEditor({ isOpen, imageUrl, onSave, onCancel }: PhotoEditorProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image when modal opens
  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        // Center the image initially
        setPosition({ x: 0, y: 0 });
        setScale(1);
        drawCanvas();
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  // Redraw canvas when scale or position changes
  useEffect(() => {
    if (imageRef.current) {
      drawCanvas();
    }
  }, [scale, position]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (circular avatar size)
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Calculate scaled dimensions
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Draw image with current position and scale
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.drawImage(
      img,
      -scaledWidth / 2 + position.x,
      -scaledHeight / 2 + position.y,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a circular mask
    const finalCanvas = document.createElement('canvas');
    const size = 400;
    finalCanvas.width = size;
    finalCanvas.height = size;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    // Draw circle clipping path
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw the edited image
    ctx.drawImage(canvas, 0, 0);

    // Convert to base64 with compression
    const editedImageUrl = finalCanvas.toDataURL('image/jpeg', 0.7);
    onSave(editedImageUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90">
      <div className="bg-[#2a2a2a] rounded-lg p-8 max-w-2xl w-full mx-4">
        <h2 className="text-white text-2xl font-bold mb-6 text-center">EDIT PHOTO</h2>

        <div className="mb-6">
          <p className="text-white text-center mb-4 opacity-75">
            Drag to reposition • Use slider to zoom
          </p>

          {/* Canvas Preview (Circular) */}
          <div className="flex justify-center mb-6">
            <div className="relative w-[400px] h-[400px] rounded-full overflow-hidden border-4 border-white/20">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="cursor-move w-full h-full"
                style={{ touchAction: 'none' }}
              />
            </div>
          </div>

          {/* Scale Slider */}
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">ZOOM</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-white text-xs mt-1 opacity-50">
              <span>50%</span>
              <span>{Math.round(scale * 100)}%</span>
              <span>300%</span>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              className="px-4 py-2 bg-[#666666] text-white text-sm font-bold rounded hover:bg-[#777777] transition-colors"
            >
              RESET
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-[#666666] text-white text-xl font-bold rounded hover:bg-[#777777] transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-[#4CAF50] text-white text-xl font-bold rounded hover:bg-[#45a049] transition-colors"
          >
            SAVE
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #2d5016;
          cursor: pointer;
          border-radius: 50%;
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #2d5016;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </div>
  );
}
