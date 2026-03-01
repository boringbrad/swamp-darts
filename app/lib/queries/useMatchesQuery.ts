import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/contexts/AuthContext';
import { createClient } from '../supabase/client';

const supabase = createClient();

export function useGolfMatchesQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['golf-matches', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('golf_matches')
        .select('*')
        .or(`user_id.eq.${user!.id},participant_user_ids.cs.{${user!.id}}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m: any) => m.match_data);
    },
    enabled: !!user,
    staleTime: 5 * 60_000, // 5 min — invalidated immediately after each game save
  });
}

export function useCricketMatchesQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['cricket-matches', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cricket_matches')
        .select('*')
        .or(`user_id.eq.${user!.id},participant_user_ids.cs.{${user!.id}}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m: any) => m.match_data);
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useInvalidateMatches() {
  const queryClient = useQueryClient();
  return {
    invalidateGolf: () => queryClient.invalidateQueries({ queryKey: ['golf-matches'] }),
    invalidateCricket: () => queryClient.invalidateQueries({ queryKey: ['cricket-matches'] }),
  };
}
