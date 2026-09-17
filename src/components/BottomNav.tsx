import React from 'react';
import { Bus, Clock, HelpCircle, User } from 'lucide-react';

export type TabType = 'booking' | 'trips' | 'support' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  upcomingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  upcomingCount = 0,
}) => {
  return (
    <nav className="sticky bottom-0 w-full bg-white/98 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 safe-bottom shrink-0 z-40 shadow-[0_-4px_15px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around">
        {/* 1. Reserve Seat Tab */}
        <button
          onClick={() => onSelectTab('booking')}
          id="nav-tab-reserve"
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 ${
            activeTab === 'booking'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'booking' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <Bus className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Reserve</span>
        </button>

        {/* 2. My Trips Tab */}
        <button
          onClick={() => onSelectTab('trips')}
          id="nav-tab-trips"
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 relative ${
            activeTab === 'trips'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg relative ${activeTab === 'trips' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <Clock className="w-5 h-5" />
            {upcomingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-white">
                {upcomingCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">My Trips</span>
        </button>

        {/* 3. Support & Emergency Dispatch */}
        <button
          onClick={() => onSelectTab('support')}
          id="nav-tab-support"
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 ${
            activeTab === 'support'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'support' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <HelpCircle className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Support</span>
        </button>

        {/* 4. Employee Profile Tab */}
        <button
          onClick={() => onSelectTab('profile')}
          id="nav-tab-profile"
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 ${
            activeTab === 'profile'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <User className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
};
