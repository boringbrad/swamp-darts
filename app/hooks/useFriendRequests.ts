/**
 * Hook to track friend request count
 * Updates in real-time when friend requests change
 */

import { useEffect, useState } from 'react';
import { getFriendRequests } from '../lib/friends';

export function useFriendRequests() {
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    const requests = await getFriendRequests();
    setRequestCount(requests.length);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();

    // Poll every 30 seconds for new requests
    const interval = setInterval(loadRequests, 30000);

    return () => clearInterval(interval);
  }, []);

  return { requestCount, loading, refresh: loadRequests };
}
