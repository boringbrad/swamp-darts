import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/AuthContext';
import { getFriends, getFriendRequests, getSentFriendRequests } from '../friends';
import { getMyJoinedRooms } from '../roomMembers';

export function useFriendsQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: () => getFriends(),
    enabled: !!user,
    staleTime: 2 * 60_000, // 2 min
  });
}

export function useFriendRequestsQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: () => getFriendRequests(),
    enabled: !!user,
    staleTime: 60_000, // 1 min
  });
}

export function useSentFriendRequestsQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['friend-requests-sent', user?.id],
    queryFn: () => getSentFriendRequests(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useJoinedRoomsQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['joined-rooms', user?.id],
    queryFn: () => getMyJoinedRooms(),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useInvalidateFriends() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['friends'] });
    queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    queryClient.invalidateQueries({ queryKey: ['friend-requests-sent'] });
  };
}

export function useInvalidateJoinedRooms() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['joined-rooms'] });
}
