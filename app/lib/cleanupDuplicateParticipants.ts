import { createClient } from './supabase/client';

/**
 * Cleanup utility to remove duplicate participant records
 * Run this once to fix existing duplicates in the database
 */
export async function cleanupDuplicateParticipants(): Promise<{
  success: boolean;
  removed: number;
  error?: string;
}> {
  try {
    const supabase = createClient();

    // Get all participant records grouped by session_id and user_id
    const { data: allParticipants, error: fetchError } = await supabase
      .from('session_participants')
      .select('*')
      .not('user_id', 'is', null)
      .order('joined_at', { ascending: true });

    if (fetchError) {
      return { success: false, removed: 0, error: fetchError.message };
    }

    if (!allParticipants) {
      return { success: true, removed: 0 };
    }

    // Find duplicates
    const seen = new Map<string, string>(); // key: session_id:user_id, value: first participant id
    const duplicateIds: string[] = [];

    for (const participant of allParticipants) {
      const key = `${participant.session_id}:${participant.user_id}`;

      if (seen.has(key)) {
        // This is a duplicate - mark for deletion
        duplicateIds.push(participant.id);
      } else {
        // This is the first occurrence - keep it
        seen.set(key, participant.id);
      }
    }

    if (duplicateIds.length === 0) {
      return { success: true, removed: 0 };
    }

    // Delete duplicates
    const { error: deleteError } = await supabase
      .from('session_participants')
      .delete()
      .in('id', duplicateIds);

    if (deleteError) {
      return { success: false, removed: 0, error: deleteError.message };
    }

    console.log(`Cleaned up ${duplicateIds.length} duplicate participant records`);
    return { success: true, removed: duplicateIds.length };
  } catch (error: any) {
    return {
      success: false,
      removed: 0,
      error: error?.message || 'Failed to cleanup duplicates'
    };
  }
}
