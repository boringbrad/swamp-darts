'use client';

import { useState, useEffect } from 'react';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAppContext } from '../contexts/AppContext';
import { getUniqueCourseNames, loadGolfMatches } from '../lib/golfStats';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
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
  } = useAppContext();
  const [courseNameInput, setCourseNameInput] = useState(golfCourseName);
  const [bannerImageInput, setBannerImageInput] = useState(courseBannerImage);
  const [bannerOpacityInput, setBannerOpacityInput] = useState(courseBannerOpacity);
  const [existingCourses, setExistingCourses] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'golf' | 'cricket'>('system');

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
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* System Tab */}
          {activeTab === 'system' && (
            <div>
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
              <div className="bg-[#333333] rounded-lg p-12 text-center">
                <div className="text-white text-2xl font-bold mb-4">Cricket Settings Coming Soon</div>
                <div className="text-gray-400 text-lg">
                  Cricket-specific settings will be available here
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
