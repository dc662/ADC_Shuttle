import React from 'react';
import { User } from '../types';
import { LogOut, UserCheck, RefreshCw } from 'lucide-react';
import { COMPANY_LOGO } from '../services/storageService';

interface HeaderProps {
  user: User | null;
  onRefresh?: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onRefresh,
  onLogout,
  isRefreshing = false,
}) => {
  return (
    <header className="bg-white border-b border-slate-100 px-4 pt-3 pb-3 shrink-0 relative z-20">
      <div className="flex items-center justify-between gap-2">
        {/* Left Action: Live Sheets Sync / Refresh */}
        <div className="w-9 flex items-center justify-start">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition active:scale-95 shadow-xs ${
                isRefreshing ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              title="Sync with Google Sheets"
              id="btn-header-sync"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}
        </div>

        {/* Company Logo */}
        <div className="flex-1 flex justify-center items-center">
          <img
            src={COMPANY_LOGO}
            alt="ADC Transportation"
            className="h-9 max-w-[150px] object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Header Right Actions (Logout) */}
        <div className="flex items-center gap-1.5">
          {user ? (
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition active:scale-95 shadow-xs"
              title="Sign Out"
              id="btn-header-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>

      {/* User Welcome Pill */}
      {user && (
        <div className="mt-2.5 flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold shadow-xs">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate max-w-[190px]">{user.name}</span>
            <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Employee
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
