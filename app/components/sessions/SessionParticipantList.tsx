'use client';

import { SessionParticipant } from '@/app/lib/sessions';
import Image from 'next/image';

interface SessionParticipantListProps {
  participants: SessionParticipant[];
  maxParticipants: number | null;
  currentUserId?: string;
}

export default function SessionParticipantList({
  participants,
  maxParticipants,
  currentUserId
}: SessionParticipantListProps) {
  const activeParticipants = participants.filter(p => !p.leftAt);
  const participantCount = activeParticipants.length;
  const maxCount = maxParticipants || 99;

  // Calculate empty slots
  const emptySlots = maxParticipants ? Math.max(0, maxParticipants - participantCount) : 0;

  return (
    <div className="w-full">
      <div className="text-white font-bold mb-3">
        Participants ({participantCount}{maxParticipants ? `/${maxParticipants}` : ''})
      </div>

      <div className="space-y-2">
        {activeParticipants.map((participant) => {
          const displayName = participant.displayName || participant.username || participant.guestName || 'Unknown';
          const isCurrentUser = participant.userId === currentUserId;

          return (
            <div
              key={participant.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                isCurrentUser ? 'bg-[#444444]' : 'bg-[#333333]'
              }`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                {participant.photoUrl ? (
                  <Image
                    src={participant.photoUrl}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : participant.avatar ? (
                  <Image
                    src={`/avatars/${participant.avatar}.png`}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : participant.guestAvatar ? (
                  <Image
                    src={`/avatars/${participant.guestAvatar}.png`}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1">
                <div className="text-white font-bold">
                  {displayName}
                  {isCurrentUser && <span className="text-gray-400 ml-2">(You)</span>}
                </div>
                {participant.username && !participant.guestName && (
                  <div className="text-gray-400 text-sm">@{participant.username}</div>
                )}
                {participant.guestName && (
                  <div className="text-gray-400 text-sm">Guest</div>
                )}
              </div>

              {/* Host badge */}
              {participant.isHost && (
                <div className="px-3 py-1 bg-[#90EE90] text-black text-xs font-bold rounded">
                  HOST
                </div>
              )}
            </div>
          );
        })}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-[#222222] border-2 border-dashed border-gray-700"
          >
            <div className="w-12 h-12 rounded-full bg-gray-800 flex-shrink-0"></div>
            <div className="text-gray-600 font-bold">Waiting for player...</div>
          </div>
        ))}
      </div>
    </div>
  );
}
