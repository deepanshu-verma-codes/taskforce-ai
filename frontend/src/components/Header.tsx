import React from 'react';
import { Plus, RefreshCw, BarChart2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onNewProblem: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  showMetrics: boolean;
  onToggleMetrics: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewProblem,
  onRefresh,
  isRefreshing,
  showMetrics,
  onToggleMetrics,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-[#eaecef] dark:border-[#2b3139] bg-white dark:bg-[#0b0e11] sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between transition-colors">
      <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
        {/* Brand: Taskforce with Binance Yellow Accent */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/taskforce.svg"
              alt="Taskforce Logo"
              className="w-8 h-8 rounded-md shadow-sm hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-[#181a20] dark:text-white flex items-center">
                Taskforce<span className="text-[#FCD535]">.ai</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-sm bg-[#f5f5f5] dark:bg-[#1e2329] text-[#b8860b] dark:text-[#FCD535] border border-[#eaecef] dark:border-[#2b3139] text-[10px] font-mono font-semibold tracking-wider uppercase">
                AUTONOMOUS
              </span>
            </div>
          </div>
        </div>

        {/* Live Telemetry Ticker & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
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

          {/* Toggle Metrics Button */}
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

          {/* Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 h-9 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#181a20] dark:text-[#eaecef] border border-[#eaecef] dark:border-[#2b3139] transition-colors text-xs font-medium cursor-pointer"
            title="Sync Telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#FCD535]' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Signature button-primary: Black text on Binance Yellow */}
          <button
            onClick={onNewProblem}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] font-semibold text-xs tracking-tight transition-colors cursor-pointer active:bg-[#f0b90b] shadow-sm"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Submit Problem</span>
          </button>
        </div>
      </div>
    </header>
  );
};
