import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/AuthContext';
import { getMyRoomMembers, getMyRoomCode } from '../roomMembers';

export function useRoomMembersQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['room-members', user?.id],
    queryFn: () => getMyRoomMembers(),
    enabled: !!user,
    staleTime: 30_000, // revalidate after 30s
  });
}

export function useRoomCodeQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['room-code', user?.id],
    queryFn: () => getMyRoomCode(),
    enabled: !!user,
    staleTime: 10 * 60_000, // 10 min — long-lived but not Infinity so auto-gen is picked up
  });
}

export function useInvalidateRoomMembers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['room-members'] });
}
