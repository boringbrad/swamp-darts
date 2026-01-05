'use client';

import Header from '../components/Header';

export default function FriendsPage() {
  const friends = [
    { id: '1', name: 'PIPER ROSE', status: 'online' },
    { id: '2', name: 'STOVE', status: 'offline' },
    { id: '3', name: 'PONCHO MAN', status: 'online' },
    { id: '4', name: 'JASON', status: 'offline' },
  ];

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header title="FRIENDS" />

      <main className="pt-24 px-6 pb-6">
        <div className="max-w-4xl mx-auto bg-[#333333] rounded-lg p-8">
          {/* Add Friend Section */}
          <div className="mb-8">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search for friends..."
                className="flex-1 bg-[#1a1a1a] text-white px-6 py-4 rounded-lg text-lg outline-none focus:ring-2 focus:ring-white"
              />
              <button className="px-8 py-4 bg-[#2d5016] text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
                ADD FRIEND
              </button>
            </div>
          </div>

          {/* Friends List */}
          <div className="space-y-4">
            <h3 className="text-white text-2xl font-bold mb-4">YOUR FRIENDS</h3>
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="bg-[#1a1a1a] rounded-lg p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#666666] flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {friend.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-white text-xl font-bold">{friend.name}</div>
                    <div className={`text-sm ${friend.status === 'online' ? 'text-green-400' : 'text-gray-400'}`}>
                      {friend.status === 'online' ? '● Online' : '○ Offline'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="px-6 py-2 bg-[#666666] text-white font-bold rounded hover:bg-[#777777] transition-colors">
                    VIEW STATS
                  </button>
                  <button className="px-6 py-2 bg-[#8b1a1a] text-white font-bold rounded hover:opacity-90 transition-opacity">
                    CHALLENGE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
