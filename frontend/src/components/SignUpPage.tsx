import React, { useState } from 'react';
import { UserPlus, User as UserIcon, Lock, AlertCircle, Loader2, ShieldCheck, LogIn, Sun, Moon } from 'lucide-react';
import { registerUser } from '../api';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SignUpPageProps {
  onNavigate: (path: string) => void;
  onSuccess: (user: User) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate, onSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name or display name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await registerUser({
        username: username.trim().toLowerCase(),
        name: name.trim(),
        password,
      });
      onSuccess(user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create account. Username might already be taken.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0e11] text-[#181a20] dark:text-[#eaecef] flex flex-col font-sans transition-colors">
      {/* Top Navigation */}
      <header className="h-16 border-b border-[#eaecef] dark:border-[#2b3139] bg-white dark:bg-[#0b0e11] px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/taskforce.svg"
            alt="Taskforce Logo"
            className="w-8 h-8 rounded-md shadow-sm"
          />
          <span className="text-xl font-extrabold tracking-tight text-[#181a20] dark:text-white flex items-center">
            Taskforce<span className="text-[#FCD535]">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => onNavigate('/signin')}
            className="flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-xs font-semibold border border-[#eaecef] dark:border-[#2b3139] transition-colors cursor-pointer"
          >
            <LogIn className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] rounded-2xl shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-6 pb-4 border-b border-[#eaecef] dark:border-[#2b3139] text-center">
            <div className="w-12 h-12 rounded-xl bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <UserPlus className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-bold text-[#181a20] dark:text-white">Create Workspace Account</h1>
            <p className="text-xs text-[#707a8a] mt-1">
              Your own isolated multi-tenant autonomous problem resolution floor
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-lg bg-[#fff5f5] dark:bg-[#2b1f24] border border-[#fed7d7] dark:border-[#f6465d]/40 flex items-start gap-2.5 text-xs text-[#f6465d]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#181a20] dark:text-[#eaecef] mb-1.5">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alice Vance"
                    className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#12161c] text-xs text-[#181a20] dark:text-white placeholder-[#707a8a] focus:outline-hidden focus:border-[#FCD535] transition-colors"
                  />
                  <UserIcon className="h-3.5 w-3.5 text-[#707a8a] absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181a20] dark:text-[#eaecef] mb-1.5">
                  Unique Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. alice_dev"
                    pattern="^[a-zA-Z0-9_-]+$"
                    title="Letters, numbers, underscores, and hyphens only"
                    className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#12161c] text-xs text-[#181a20] dark:text-white placeholder-[#707a8a] focus:outline-hidden focus:border-[#FCD535] transition-colors"
                  />
                  <span className="text-xs font-mono text-[#707a8a] absolute left-3.5 top-2.5">@</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181a20] dark:text-[#eaecef] mb-1.5">
                  Password <span className="text-[10px] text-[#707a8a] font-normal">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#12161c] text-xs text-[#181a20] dark:text-white placeholder-[#707a8a] focus:outline-hidden focus:border-[#FCD535] transition-colors"
                  />
                  <Lock className="h-3.5 w-3.5 text-[#707a8a] absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Security Invariant Info */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#707a8a]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0ecb81] shrink-0" />
                <span>Isolated Workspace • HttpOnly Session • Zero Cross-Tenant Visibility</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] font-bold text-xs tracking-tight transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#181a20]" />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create Account & Enter Workspace</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="pt-2 text-center text-xs text-[#707a8a]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/signin')}
                className="font-bold text-[#b8860b] dark:text-[#FCD535] hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
