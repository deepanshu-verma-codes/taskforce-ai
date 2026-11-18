import React from 'react';
import { Plus, RefreshCw, BarChart2, Sun, Moon, LogOut, LogIn, Gamepad2, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types';

interface HeaderProps {
  onNewProblem: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  showMetrics: boolean;
  onToggleMetrics: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  currentPath?: string;
  onNavigate?: (to: string) => void;
  onOpenVipModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewProblem,
  onRefresh,
  isRefreshing,
  showMetrics,
  onToggleMetrics,
  currentUser,
  onOpenAuth,
  onLogout,
  currentPath = '/',
  onNavigate,
  onOpenVipModal,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-[#eaecef] dark:border-[#2b3139] bg-white dark:bg-[#0b0e11] sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between transition-colors">
      <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
        {/* Brand: Taskforce with Binance Yellow Accent & Navigation Tabs */}
        <div className="flex items-center gap-3 md:gap-5">
          <div
            onClick={() => onNavigate?.('/')}
            className="flex items-center gap-2.5 cursor-pointer"
            title="Taskforce Home"
          >
            <img
              src="/taskforce.svg"
              alt="Taskforce Logo"
              className="w-8 h-8 rounded-md shadow-sm hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-[#181a20] dark:text-white flex items-center">
                Taskforce<span className="text-[#FCD535]">.ai</span>
              </span>
            </div>
          </div>

          {/* Navigation Links: Problem Floor & Tic-Tac-Toe Arena */}
          <nav className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-[#eaecef] dark:border-[#2b3139]">
            <button
              onClick={() => onNavigate?.('/')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                currentPath === '/'
                  ? 'bg-[#f5f5f5] dark:bg-[#1e2329] text-[#181a20] dark:text-white border border-[#eaecef] dark:border-[#2b3139]'
                  : 'text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef]'
              }`}
            >
              <span>Problem Floor</span>
            </button>

            <button
              onClick={() => onNavigate?.('/game')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                currentPath === '/game'
                  ? 'bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] border border-[#b8860b] dark:border-[#FCD535]/40 shadow-xs'
                  : 'text-[#707a8a] hover:text-[#b8860b] dark:hover:text-[#FCD535]'
              }`}
              title="Play Tic-Tac-Toe with an AI Agent and try to win"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>Tic-Tac-Toe Arena</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#FCD535]/20 text-[#b8860b] dark:text-[#FCD535] font-bold">
                NEW
              </span>
            </button>
          </nav>
        </div>

        {/* Live Telemetry Ticker & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Arena Toggle Button */}
          <button
            onClick={() => onNavigate?.(currentPath === '/game' ? '/' : '/game')}
            className={`sm:hidden flex items-center justify-center w-9 h-9 rounded-md border text-xs transition-colors cursor-pointer ${
              currentPath === '/game'
                ? 'bg-[#FCD535]/15 border-[#b8860b] dark:border-[#FCD535] text-[#b8860b] dark:text-[#FCD535]'
                : 'bg-[#f5f5f5] dark:bg-[#1e2329] border-[#eaecef] dark:border-[#2b3139] text-[#707a8a]'
            }`}
            title="Toggle Tic-Tac-Toe Arena"
          >
            <Gamepad2 className="h-4 w-4" />
          </button>

          {/* Theme Switcher Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#181a20] dark:text-[#eaecef] border border-[#eaecef] dark:border-[#2b3139] transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-[#FCD535]" />
            ) : (
              <Moon className="h-4 w-4 text-[#181a20]" />
            )}
          </button>

          {/* Toggle Metrics Button (only on floor /) */}
          {currentPath === '/' && (
            <button
              onClick={onToggleMetrics}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                showMetrics
                  ? 'bg-[#f5f5f5] dark:bg-[#1e2329] border-[#b8860b] dark:border-[#FCD535] text-[#b8860b] dark:text-[#FCD535]'
                  : 'bg-[#f5f5f5] dark:bg-[#1e2329] border-[#eaecef] dark:border-[#2b3139] text-[#181a20] dark:text-[#eaecef] hover:border-[#707a8a]'
              }`}
              title="Toggle Live Ticker & Stats"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{showMetrics ? 'Hide Stats' : 'Stats'}</span>
            </button>
          )}

          {/* Sync Button (only on floor /) */}
          {currentPath === '/' && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#181a20] dark:text-[#eaecef] border border-[#eaecef] dark:border-[#2b3139] transition-colors text-xs font-medium cursor-pointer"
              title="Sync Telemetry"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#FCD535]' : ''}`}
              />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}

          {/* Add Problem Button (next to Sync) */}
          {currentPath === '/' && (
            <button
              onClick={onNewProblem}
              className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] font-semibold text-xs tracking-tight transition-colors cursor-pointer active:bg-[#f0b90b] shadow-sm"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span> Add Problem</span>
            </button>
          )}

          {/* VIP Unlimited Pass Trigger Button */}
          {currentUser && onOpenVipModal && (
            <button
              onClick={onOpenVipModal}
              className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-[#FCD535]/15 hover:bg-[#FCD535]/25 text-[#b8860b] dark:text-[#FCD535] border border-[#b8860b]/40 dark:border-[#FCD535]/40 text-xs font-bold transition-all cursor-pointer shadow-xs"
              title={
                currentUser.username.toLowerCase() === 'deepanshu_verma' ||
                currentUser.username.toLowerCase() === 'deepanshu-verma'
                  ? 'VIP Owner Console (Manage VIP Code & User Grants)'
                  : currentUser.is_vip
                  ? 'VIP Unlimited Active (View Status)'
                  : 'Redeem VIP Access Code for Unlimited Usage'
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden md:inline">
                {currentUser.username.toLowerCase() === 'deepanshu_verma' ||
                currentUser.username.toLowerCase() === 'deepanshu-verma'
                  ? 'VIP Admin'
                  : currentUser.is_vip
                  ? 'VIP Active'
                  : 'Redeem VIP'}
              </span>
            </button>
          )}

          {/* User Authentication Status & Profile Badge */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#eaecef] dark:border-[#2b3139]">
              <div
                className="flex items-center gap-1.5 px-2.5 h-9 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] text-xs"
                title={`Logged in as ${currentUser.name} (UUID: ${currentUser.id})`}
              >
                <div className="w-5 h-5 rounded-full bg-[#FCD535]/20 text-[#b8860b] dark:text-[#FCD535] flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left hidden sm:flex">
                  <span className="font-semibold text-[#181a20] dark:text-white leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-[#707a8a] leading-tight font-mono">
                    @{currentUser.username}
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center justify-center w-9 h-9 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#fff5f5] dark:hover:bg-[#2b1f24] text-[#707a8a] hover:text-[#f6465d] border border-[#eaecef] dark:border-[#2b3139] hover:border-[#f6465d]/40 transition-colors cursor-pointer"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#181a20] dark:text-[#eaecef] border border-[#FCD535]/50 text-xs font-semibold transition-colors cursor-pointer"
              title="Sign in or register to access your isolated problem floor"
            >
              <LogIn className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

