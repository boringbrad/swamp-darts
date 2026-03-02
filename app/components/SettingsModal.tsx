'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAppContext } from '../contexts/AppContext';
import { getUniqueCourseNames, loadGolfMatches } from '../lib/golfStats';
import { RoyalRumbleGameState } from '../types/royalRumble';
import { createClient } from '../lib/supabase/client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pathname?: string;
}

export default function SettingsModal({ isOpen, onClose, pathname = '' }: SettingsModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const { deleteLocalPlayer, getGuestPlayers, refreshPlayers } = usePlayerContext();
  const {
    golfCourseName,
    setGolfCourseName,
    courseBannerImage,
    setCourseBannerImage,
    courseBannerOpacity,
    setCourseBannerOpacity,
    cameraEnabled,
    setCameraEnabled,
    showCourseRecord,
    setShowCourseRecord,
    showCourseName,
    setShowCourseName,
    playMode,
    setPlayMode,
    cricketRules,
    setCricketRules,
    userProfile,
    x01StartingScore,
    setX01StartingScore,
    x01DoubleIn,
    setX01DoubleIn,
    x01DoubleOut,
    setX01DoubleOut,
    x01AverageMode,
    setX01AverageMode,
  } = useAppContext();
  const [courseNameInput, setCourseNameInput] = useState(golfCourseName);
  const [bannerImageInput, setBannerImageInput] = useState(courseBannerImage);
  const [bannerOpacityInput, setBannerOpacityInput] = useState(courseBannerOpacity);
  const [existingCourses, setExistingCourses] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'golf' | 'cricket' | 'x01' | 'royal-rumble'>('system');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check if we're in Royal Rumble game
  const isRoyalRumbleGame = pathname.includes('/extra/royal-rumble/game');

  // Royal Rumble state
  const [royalRumbleGameState, setRoyalRumbleGameState] = useState<RoyalRumbleGameState | null>(null);

  // Load Royal Rumble game state when modal opens
  useEffect(() => {
    if (isOpen && isRoyalRumbleGame) {
      // Listen for custom event from game page with current game state
      const handleGameStateUpdate = (event: CustomEvent<RoyalRumbleGameState>) => {
        setRoyalRumbleGameState(event.detail);
      };

      window.addEventListener('royalRumbleGameState' as any, handleGameStateUpdate as any);

      // Request initial game state
      window.dispatchEvent(new CustomEvent('requestRoyalRumbleGameState'));

      return () => {
        window.removeEventListener('royalRumbleGameState' as any, handleGameStateUpdate as any);
      };
    }
  }, [isOpen, isRoyalRumbleGame]);

  // Load existing course names when modal opens
  useEffect(() => {
    if (isOpen) {
      const matches = loadGolfMatches();
      const coursesFromMatches = getUniqueCourseNames(matches);

      // Always include SWAMPY MEADOWS and current course
      const coursesSet = new Set(coursesFromMatches);
      coursesSet.add('SWAMPY MEADOWS');
      if (golfCourseName) {
        coursesSet.add(golfCourseName);
      }

      const courses = Array.from(coursesSet).sort();
      setExistingCourses(courses);

      // Reset course name input to current course
      setCourseNameInput(golfCourseName);
      setShowCustomInput(false);
    }
  }, [isOpen, golfCourseName]);

  const handleRemoveAllGuests = () => {
    const guestPlayers = getGuestPlayers();
    if (guestPlayers.length === 0) {
      alert('No guest players to remove');
      return;
    }

    if (confirm(`Are you sure you want to remove all ${guestPlayers.length} guest player(s) and their stats?`)) {
      // Get guest player IDs
      const guestPlayerIds = guestPlayers.map(p => p.id);

      // Delete each guest player from player list
      guestPlayers.forEach(player => {
        deleteLocalPlayer(player.id);
      });

      // Remove guest players from golf match stats
      const golfMatches = JSON.parse(localStorage.getItem('golfMatches') || '[]');
      const filteredGolfMatches = golfMatches.filter((match: any) => {
        // Keep match only if NO guest players are in it
        return !match.players.some((p: any) => guestPlayerIds.includes(p.playerId));
      });
      localStorage.setItem('golfMatches', JSON.stringify(filteredGolfMatches));

      // Remove guest players from cricket match stats
      const cricketMatches = JSON.parse(localStorage.getItem('cricketMatches') || '[]');
      const filteredCricketMatches = cricketMatches.filter((match: any) => {
        // Keep match only if NO guest players are in it
        return !match.players.some((p: any) => guestPlayerIds.includes(p.playerId));
      });
      localStorage.setItem('cricketMatches', JSON.stringify(filteredCricketMatches));

      refreshPlayers();
      alert('All guest players and their stats have been removed');
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      setIsLoggingOut(true);

      try {
        console.log('Starting logout...');

        // Leave any active game session first (with 3 second timeout)
        const { leaveActiveSession } = await import('../lib/sessions');
        const leaveSessionPromise = leaveActiveSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Leave session timeout')), 3000)
        );

        try {
          await Promise.race([leaveSessionPromise, timeoutPromise]);
          console.log('Left active session');
        } catch (error) {
          console.warn('Failed to leave session (timeout or error), continuing with logout:', error);
        }

        // Sign out from Supabase and wait for it
        await supabase.auth.signOut();
        console.log('Signed out from Supabase');

        // Longer delay to ensure session cookies are fully cleared
        // This prevents race conditions with the middleware
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Redirecting to welcome page');
        // Redirect to welcome page
        window.location.href = '/welcome';
      } catch (error) {
        console.error('Error during logout:', error);
        // Even if there's an error, wait a bit then redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = '/welcome';
      }
    }
  };

  const handleSaveCourseName = () => {
    if (courseNameInput.trim()) {
      const newCourseName = courseNameInput.trim().toUpperCase();
      setGolfCourseName(newCourseName);
      setShowCustomInput(false);
      setCourseNameInput(newCourseName);
      alert('Course name saved!');
    } else {
      alert('Course name cannot be empty');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setBannerImageInput(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    setBannerImageInput('');
  };

  const handleSaveBannerSettings = () => {
    setCourseBannerImage(bannerImageInput);
    setCourseBannerOpacity(bannerOpacityInput);
    alert('Banner settings saved!');
  };

  // Royal Rumble handlers
  const handleTogglePause = () => {
    window.dispatchEvent(new CustomEvent('royalRumbleTogglePause'));
  };

  const handleExitRoyalRumble = () => {
    if (confirm('Are you sure you want to exit the game? Progress will be lost.')) {
      router.push('/extra/royal-rumble/setup');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#2a2a2a] rounded-lg p-8 w-full max-w-2xl mx-4 shadow-2xl">
        {/* Close X button - top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-400 transition-colors w-10 h-10 flex items-center justify-center"
        >
          ×
        </button>

        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          SETTINGS
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-[#666666]">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'system'
                ? 'text-white border-b-4 border-[#90EE90]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            SYSTEM
          </button>
          <button
            onClick={() => setActiveTab('golf')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'golf'
                ? 'text-white border-b-4 border-[#90EE90]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            GOLF
          </button>
          <button
            onClick={() => setActiveTab('cricket')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'cricket'
                ? 'text-white border-b-4 border-[#90EE90]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            CRICKET
          </button>
          <button
            onClick={() => setActiveTab('x01')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'x01'
                ? 'text-white border-b-4 border-[#90EE90]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            X01
          </button>
          {isRoyalRumbleGame && (
            <button
              onClick={() => setActiveTab('royal-rumble')}
              className={`px-6 py-3 font-bold transition-colors ${
                activeTab === 'royal-rumble'
                  ? 'text-white border-b-4 border-[#90EE90]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ROYAL RUMBLE
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* System Tab */}
          {activeTab === 'system' && (
            <div>
              {/* Play Mode Setting */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">PLAY MODE</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPlayMode('practice')}
                    className={`flex-1 px-6 py-3 font-bold rounded transition-colors ${
                      playMode === 'practice'
                        ? 'bg-[#2d5016] text-white'
                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                    }`}
                  >
                    PRACTICE
                  </button>
                  <button
                    onClick={() => setPlayMode('casual')}
                    className={`flex-1 px-6 py-3 font-bold rounded transition-colors ${
                      playMode === 'casual'
                        ? 'bg-[#2d5016] text-white'
                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                    }`}
                  >
                    CASUAL
                  </button>
                  <button
                    onClick={() => setPlayMode('league')}
                    className={`flex-1 px-6 py-3 font-bold rounded transition-colors ${
                      playMode === 'league'
                        ? 'bg-[#2d5016] text-white'
                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                    }`}
                  >
                    LEAGUE
                  </button>
                </div>
              </div>

              {/* Show Camera Setting */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">CAMERA</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showCamera"
                    checked={cameraEnabled}
                    onChange={(e) => setCameraEnabled(e.target.checked)}
                    className="w-6 h-6 cursor-pointer"
                  />
                  <label htmlFor="showCamera" className="text-white text-lg cursor-pointer">
                    Show Camera in Games
                  </label>
                </div>
              </div>

              {/* Logout Section - Only show if user is logged in */}
              {userProfile && userProfile.id !== 'default-user' && (
                <div className="mb-6 pt-6 border-t-2 border-[#666666]">
                  <h3 className="text-xl font-bold text-white mb-4">ACCOUNT</h3>
                  <div className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded">
                    <div>
                      <div className="text-white font-bold">{userProfile.displayName}</div>
                      <div className="text-gray-400 text-sm">{(userProfile as any).email || 'Logged in'}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? 'LOGGING OUT...' : 'LOG OUT'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Golf Tab */}
          {activeTab === 'golf' && (
            <div>
              {/* Golf Course Name Section */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">GOLF COURSE NAME</h3>

          {!showCustomInput ? (
            <>
              {/* Dropdown for existing courses */}
              <div className="flex gap-3 mb-3">
                <select
                  value={courseNameInput}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setShowCustomInput(true);
                      setCourseNameInput('');
                    } else {
                      setCourseNameInput(e.target.value);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] text-white text-xl rounded border-2 border-[#666666] focus:border-[#90EE90] focus:outline-none"
                >
                  {existingCourses.map(course => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                  <option value="__custom__">+ Add New Course</option>
                </select>
                <button
                  onClick={handleSaveCourseName}
                  className="px-6 py-3 bg-[#2d5016] text-white text-xl font-bold rounded hover:bg-[#3a6b1d] transition-colors"
                >
                  SAVE
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Custom input */}
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={courseNameInput}
                  onChange={(e) => setCourseNameInput(e.target.value)}
                  placeholder="Enter new course name..."
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] text-white text-xl rounded border-2 border-[#666666] focus:border-[#90EE90] focus:outline-none"
                  maxLength={30}
                  autoFocus
                />
                <button
                  onClick={handleSaveCourseName}
                  className="px-6 py-3 bg-[#2d5016] text-white text-xl font-bold rounded hover:bg-[#3a6b1d] transition-colors"
                >
                  SAVE
                </button>
              </div>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCourseNameInput(golfCourseName);
                }}
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                ← Back to existing courses
              </button>
            </>
          )}

                <p className="text-gray-400 text-sm mt-2">Current: {golfCourseName}</p>
              </div>

              {/* Course Banner Settings Section */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">COURSE BANNER</h3>

                {/* Banner Image Upload */}
                <div className="mb-4">
                  <label className="text-white text-sm font-bold mb-2 block">Banner Image</label>

                  {/* Show current banner preview if exists */}
                  {bannerImageInput && (
                    <div className="mb-3 relative">
                      <img
                        src={bannerImageInput}
                        alt="Banner preview"
                        className="w-full h-32 object-cover rounded border-2 border-[#666666]"
                      />
                      <button
                        onClick={handleRemoveBanner}
                        className="absolute top-2 right-2 px-3 py-1 bg-[#9d1a1a] text-white text-xs font-bold rounded hover:bg-[#b51f1f] transition-colors"
                      >
                        REMOVE
                      </button>
                    </div>
                  )}

                  {/* File upload button */}
                  <label className="w-full px-4 py-3 bg-[#1a1a1a] text-white text-lg rounded border-2 border-[#666666] hover:border-[#90EE90] transition-colors cursor-pointer flex items-center justify-center">
                    <span>{bannerImageInput ? 'Change Banner Image' : 'Upload Banner Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-gray-400 text-xs mt-1">
                    {bannerImageInput ? 'Click to replace the current banner' : 'Upload an image or leave empty for default golf banner'}
                  </p>
                </div>

                {/* Banner Opacity Slider */}
                <div className="mb-4">
                  <label className="text-white text-sm font-bold mb-2 block">
                    Banner Opacity: {bannerOpacityInput}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bannerOpacityInput}
                    onChange={(e) => setBannerOpacityInput(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#90EE90]"
                  />
                  <div className="flex justify-between text-gray-400 text-xs mt-1">
                    <span>Transparent</span>
                    <span>Opaque</span>
                  </div>
                </div>

                {/* Save Banner Settings Button */}
                <button
                  onClick={handleSaveBannerSettings}
                  className="w-full px-6 py-3 bg-[#2d5016] text-white text-xl font-bold rounded hover:bg-[#3a6b1d] transition-colors"
                >
                  SAVE BANNER SETTINGS
                </button>
              </div>

              {/* Display Options Section */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">BANNER DISPLAY OPTIONS</h3>

                {/* Course Name Toggle */}
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="showCourseName"
                    checked={showCourseName}
                    onChange={(e) => setShowCourseName(e.target.checked)}
                    className="w-6 h-6 cursor-pointer"
                  />
                  <label htmlFor="showCourseName" className="text-white text-lg cursor-pointer">
                    Display Course Name on Banner
                  </label>
                </div>

                {/* Course Record Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showCourseRecord"
                    checked={showCourseRecord}
                    onChange={(e) => setShowCourseRecord(e.target.checked)}
                    className="w-6 h-6 cursor-pointer"
                  />
                  <label htmlFor="showCourseRecord" className="text-white text-lg cursor-pointer">
                    Display Course Record on Banner
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Cricket Tab */}
          {activeTab === 'cricket' && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">GAME MECHANICS</h3>
              <div className="space-y-4">
                {/* K.O. Cricket Toggle */}
                <div className="bg-[#333333] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      id="enableKO"
                      checked={cricketRules.enableKO !== false}
                      onChange={(e) => setCricketRules({ enableKO: e.target.checked })}
                      className="w-6 h-6 cursor-pointer"
                    />
                    <label htmlFor="enableKO" className="text-white text-lg font-bold cursor-pointer">
                      K.O. Cricket
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm pl-9">
                    When disabled, removes hit numbers from players and disables the skip turn mechanic. Players cannot skip opponents.
                  </p>
                </div>

                {/* PIN Toggle */}
                <div className="bg-[#333333] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      id="enablePIN"
                      checked={cricketRules.enablePIN !== false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // If enabling PIN, disable Ladder
                          setCricketRules({ enablePIN: true, enableLadder: false });
                        } else {
                          setCricketRules({ enablePIN: false });
                        }
                      }}
                      className="w-6 h-6 cursor-pointer"
                    />
                    <label htmlFor="enablePIN" className="text-white text-lg font-bold cursor-pointer">
                      PIN
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm pl-9">
                    When disabled, removes the PIN mechanic. The game is won when a player completes their board (closes all 9 targets).
                  </p>
                </div>

                {/* Ladder Match Toggle */}
                <div className="bg-[#333333] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      id="enableLadder"
                      checked={cricketRules.enableLadder === true}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // If enabling Ladder, disable PIN
                          setCricketRules({ enableLadder: true, enablePIN: false });
                        } else {
                          setCricketRules({ enableLadder: false });
                        }
                      }}
                      className="w-6 h-6 cursor-pointer"
                    />
                    <label htmlFor="enableLadder" className="text-white text-lg font-bold cursor-pointer">
                      Ladder Match
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm pl-9">
                    Two-phase game: First, get 2 marks on all 9 targets. Then clear them in order: D → T → B → 15 → 16 → 17 → 18 → 19 → 20. Mutually exclusive with PIN.
                  </p>
                </div>

                {/* 3 Darts/3 Marks Toggle */}
                <div className="bg-[#333333] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      id="enable3Darts3Marks"
                      checked={cricketRules.enable3Darts3Marks !== false}
                      onChange={(e) => setCricketRules({ enable3Darts3Marks: e.target.checked })}
                      className="w-6 h-6 cursor-pointer"
                    />
                    <label htmlFor="enable3Darts3Marks" className="text-white text-lg font-bold cursor-pointer">
                      3 Darts / 3 Marks
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm pl-9">
                    When disabled, players do not get their darts back if they score with all 3 darts. Bonus turns are disabled.
                  </p>
                </div>

                {/* Auto-Advance Turn Toggle */}
                <div className="bg-[#333333] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      id="autoAdvanceTurn"
                      checked={cricketRules.autoAdvanceTurn === true}
                      onChange={(e) => setCricketRules({ autoAdvanceTurn: e.target.checked })}
                      className="w-6 h-6 cursor-pointer"
                    />
                    <label htmlFor="autoAdvanceTurn" className="text-white text-lg font-bold cursor-pointer">
                      Auto-Advance Turn
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm pl-9">
                    After at least 1 dart is thrown, automatically fills remaining darts as MISS and advances to the next player after 7 seconds of inactivity. Local games only.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-900/30 rounded-lg border border-yellow-600/50">
                <p className="text-yellow-200 text-sm">
                  <strong>Note:</strong> These settings apply to all Cricket variants. Changes will take effect for new games.
                </p>
              </div>
            </div>
          )}

          {/* X01 Tab */}
          {activeTab === 'x01' && (
            <div>
              {/* Starting Score */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">STARTING SCORE</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[101, 201, 301, 401, 501, 601, 701, 801, 901].map((score) => (
                    <button
                      key={score}
                      onClick={() => setX01StartingScore(score)}
                      className={`py-3 rounded-lg text-xl font-bold transition-colors ${
                        x01StartingScore === score
                          ? 'bg-[#00d1b2] text-white'
                          : 'bg-[#333333] text-gray-300 hover:bg-[#444444]'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* Finish Rules */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">RULES</h3>
                <div className="space-y-4">
                  <div className="bg-[#333333] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        id="x01DoubleIn"
                        checked={x01DoubleIn}
                        onChange={(e) => setX01DoubleIn(e.target.checked)}
                        className="w-6 h-6 cursor-pointer"
                      />
                      <label htmlFor="x01DoubleIn" className="text-white text-lg font-bold cursor-pointer">
                        Double In
                      </label>
                    </div>
                    <p className="text-gray-400 text-sm pl-9">
                      Player must hit a double to start counting score. Darts before the opening double don't count.
                    </p>
                  </div>

                  <div className="bg-[#333333] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        id="x01DoubleOut"
                        checked={x01DoubleOut}
                        onChange={(e) => setX01DoubleOut(e.target.checked)}
                        className="w-6 h-6 cursor-pointer"
                      />
                      <label htmlFor="x01DoubleOut" className="text-white text-lg font-bold cursor-pointer">
                        Double Out
                      </label>
                    </div>
                    <p className="text-gray-400 text-sm pl-9">
                      Player must finish on a double (or bullseye). Hitting the exact score without a double is a bust.
                    </p>
                  </div>
                </div>
              </div>

              {/* Average Mode */}
              <div className="bg-[#333333] rounded-lg p-4">
                <p className="text-white text-lg font-bold mb-3">Average Display</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setX01AverageMode('per-turn')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-colors ${x01AverageMode === 'per-turn' ? 'bg-[#00d1b2] text-white' : 'bg-[#444444] text-gray-300 hover:bg-[#555555]'}`}
                  >
                    Per Turn
                  </button>
                  <button
                    onClick={() => setX01AverageMode('per-dart')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-colors ${x01AverageMode === 'per-dart' ? 'bg-[#00d1b2] text-white' : 'bg-[#444444] text-gray-300 hover:bg-[#555555]'}`}
                  >
                    Per Dart
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  {x01AverageMode === 'per-turn' ? 'Shows average score per 3-dart turn.' : 'Shows average score per individual dart (turn avg ÷ 3).'}
                </p>
              </div>

              <div className="p-4 bg-[#1a3a3a] rounded-lg border border-[#00d1b2]/30">
                <p className="text-[#00d1b2] text-sm">
                  <strong>Current:</strong> {x01StartingScore} — {x01DoubleIn ? 'Double In' : 'Straight In'} / {x01DoubleOut ? 'Double Out' : 'Straight Out'}
                </p>
              </div>
            </div>
          )}

          {/* Royal Rumble Tab */}
          {activeTab === 'royal-rumble' && (
            <div>
              {/* Pause/Resume */}
              <div className="mb-6">
                <button
                  onClick={handleTogglePause}
                  className={`w-full py-4 text-2xl font-bold rounded transition-colors ${
                    royalRumbleGameState?.isPaused
                      ? 'bg-[#4CAF50] text-white hover:bg-[#45a049]'
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
                >
                  {royalRumbleGameState?.isPaused ? 'RESUME GAME' : 'PAUSE GAME'}
                </button>
                {royalRumbleGameState?.isPaused && (
                  <div className="text-center text-yellow-400 text-lg mt-2">
                    Game is paused. Timers are stopped.
                  </div>
                )}
              </div>

              {/* Player List */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-3">PLAYER STATUS</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {royalRumbleGameState?.players.map((player) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white text-lg font-bold">{player.playerName}</span>
                        <span className="text-gray-400 text-sm">#{player.entryNumber}</span>
                        <span className="text-gray-400 text-sm">KO #{player.koNumber}</span>
                      </div>
                      <div>
                        {player.status === 'active' && (
                          <span className="text-green-400 font-bold text-sm">ACTIVE ({player.hitsReceived}/10)</span>
                        )}
                        {player.status === 'not-entered' && (
                          <span className="text-yellow-400 font-bold text-sm">WAITING</span>
                        )}
                        {player.status === 'eliminated' && (
                          <span className="text-red-400 font-bold text-sm">OUT</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exit Game */}
              <button
                onClick={handleExitRoyalRumble}
                className="w-full py-4 bg-red-600 text-white text-xl font-bold rounded hover:bg-red-700 transition-colors"
              >
                EXIT GAME
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
