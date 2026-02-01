'use client';

import { useState } from 'react';

interface RoomCodeInputProps {
  onSubmit: (roomCode: string) => void;
  loading?: boolean;
  error?: string;
}

export default function RoomCodeInput({ onSubmit, loading, error }: RoomCodeInputProps) {
  const [code, setCode] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-uppercase and limit to 6 characters
    const value = e.target.value.toUpperCase().replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, '');
    setCode(value.slice(0, 6));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6 && !loading) {
      onSubmit(code);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex flex-col gap-3">
        <label className="text-white font-bold text-sm">Enter Room Code</label>
        <input
          type="text"
          value={code}
          onChange={handleChange}
          placeholder="H7K9M2"
          maxLength={6}
          className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest bg-[#333333] text-white rounded-lg border-2 border-gray-600 focus:border-[#90EE90] focus:outline-none uppercase"
          disabled={loading}
        />
        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
        )}
        <button
          type="submit"
          disabled={code.length !== 6 || loading}
          className="w-full py-3 px-4 bg-[#90EE90] text-black font-bold rounded hover:bg-[#7ACC7A] transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'JOINING...' : 'JOIN SESSION'}
        </button>
      </div>
    </form>
  );
}
