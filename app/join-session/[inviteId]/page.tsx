'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { STOCK_AVATARS } from '../../lib/avatars';

const supabase = createClient();

type PageState = 'loading' | 'ready' | 'joining' | 'joined' | 'error';

type ErrorType =
  | 'not-logged-in'
  | 'expired'
  | 'already-accepted'
  | 'wrong-user'
  | 'not-found'
  | 'generic';

function getAvatarData(avatarId?: string) {
  return STOCK_AVATARS.find(a => a.id === avatarId) || STOCK_AVATARS[0];
}

export default function JoinSessionPage() {
  const params = useParams();
  const router = useRouter();
  const inviteId = params?.inviteId as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [hostProfile, setHostProfile] = useState<{ displayName?: string; avatar?: string; photoUrl?: string } | null>(null);
  const [inviteRecord, setInviteRecord] = useState<any>(null);

  useEffect(() => {
    if (!inviteId) return;
    loadInvite();
  }, [inviteId]);

  async function loadInvite() {
    setPageState('loading');

    // Check auth first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setErrorType('not-logged-in');
      setPageState('error');
      return;
    }

    // Load the invite
    const { data, error } = await supabase
      .from('local_game_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (error || !data) {
      setErrorType('not-found');
      setPageState('error');
      return;
    }

    // Validate
    if (new Date(data.expires_at) < new Date()) {
      setErrorType('expired');
      setPageState('error');
      return;
    }

    if (data.status === 'accepted') {
      setErrorType('already-accepted');
      setPageState('error');
      return;
    }

    if (data.invited_user_id !== session.user.id) {
      setErrorType('wrong-user');
      setPageState('error');
      return;
    }

    setInviteRecord(data);
    setHostProfile(data.host_profile || {});
    setPageState('ready');
  }

  async function joinSession() {
    setPageState('joining');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !inviteRecord) {
      setErrorType('generic');
      setPageState('error');
      return;
    }

    // Fetch own profile to send back to host
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar, photo_url')
      .eq('id', session.user.id)
      .single();

    const invitedProfile = {
      displayName: profile?.display_name || session.user.email,
      avatar: profile?.avatar,
      photoUrl: profile?.photo_url,
    };

    const { error } = await supabase
      .from('local_game_invites')
      .update({ status: 'accepted', invited_profile: invitedProfile })
      .eq('id', inviteId);

    if (error) {
      console.error('Error accepting invite:', error);
      setErrorType('generic');
      setPageState('error');
      return;
    }

    setPageState('joined');
  }

  const hostAv = getAvatarData(hostProfile?.avatar);

  // ── LOADING ──────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#6b1a8b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── JOINED ───────────────────────────────────────────────
  if (pageState === 'joined') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-7xl mb-6">🎯</p>
          <h1 className="text-3xl font-bold text-white mb-3">You're in!</h1>
          <p className="text-white/60 text-lg mb-2">
            Your stats will be tracked tonight.
          </p>
          <p className="text-white/40 text-base">
            Put your phone away and enjoy the game.
          </p>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────
  if (pageState === 'error') {
    const messages: Record<ErrorType, { title: string; body: string; action?: string; actionLabel?: string }> = {
      'not-logged-in': {
        title: 'Sign in required',
        body: 'You need to be logged in to join a game session.',
        action: `/auth/login?redirect=/join-session/${inviteId}`,
        actionLabel: 'SIGN IN',
      },
      'expired': {
        title: 'Invite expired',
        body: 'This invite has expired. Ask the host to send a new one.',
      },
      'already-accepted': {
        title: 'Already joined',
        body: "You've already joined this game night. You should already be in the player pool.",
      },
      'wrong-user': {
        title: 'Wrong account',
        body: "This invite was sent to a different account. Make sure you're signed in with the right account.",
      },
      'not-found': {
        title: 'Invite not found',
        body: "This invite doesn't exist or has been deleted.",
      },
      'generic': {
        title: 'Something went wrong',
        body: 'There was an error joining the session. Please try again.',
      },
    };

    const msg = messages[errorType!] || messages['generic'];

    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-6">⚠️</p>
          <h1 className="text-2xl font-bold text-white mb-3">{msg.title}</h1>
          <p className="text-white/60 mb-8">{msg.body}</p>
          {msg.action && msg.actionLabel && (
            <button
              onClick={() => router.push(msg.action!)}
              className="px-8 py-3 bg-[#6b1a8b] text-white text-lg font-bold rounded hover:opacity-90 transition-opacity"
            >
              {msg.actionLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── READY ─────────────────────────────────────────────────
  const hostName = hostProfile?.displayName || 'Someone';

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        {/* Host avatar */}
        <div className="flex justify-center mb-6">
          {hostProfile?.photoUrl ? (
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20">
              <img src={hostProfile.photoUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl border-4 border-white/20"
              style={{ backgroundColor: hostAv.color }}
            >
              {hostAv.emoji}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {hostName} wants to add you
        </h1>
        <p className="text-white/60 mb-2">to tonight's games</p>
        <p className="text-white/40 text-sm mb-10">
          Your stats will be tracked on your profile for every game you play tonight.
          You only need to confirm once — then put your phone away.
        </p>

        <button
          onClick={joinSession}
          disabled={pageState === 'joining'}
          className="w-full py-4 bg-[#4CAF50] text-white text-xl font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pageState === 'joining' ? 'JOINING...' : 'JOIN GAME NIGHT'}
        </button>
      </div>
    </div>
  );
}
