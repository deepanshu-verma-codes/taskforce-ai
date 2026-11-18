import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  User as UserIcon,
  Lock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  LogIn,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { registerUser, checkUsernameAvailability, AuthError } from '../api';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SignUpPageProps {
  onNavigate: (path: string) => void;
  onSuccess: (user: User) => void;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate, onSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameFeedback, setUsernameFeedback] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced real-time username availability check & Gmail-style suggestions
  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameFeedback(null);
      setSuggestions([]);
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('invalid');
      setUsernameFeedback('Username must be at least 3 characters.');
      setSuggestions([]);
      return;
    }

    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(clean)) {
      setUsernameStatus('invalid');
      setUsernameFeedback('Letters, numbers, underscores, and hyphens only.');
      setSuggestions([]);
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(clean, name.trim());
        if (result.available) {
          setUsernameStatus('available');
          setUsernameFeedback('Username is available');
          setSuggestions([]);
        } else {
          setUsernameStatus('taken');
          setUsernameFeedback(result.message || 'That username is taken. Try another.');
          setSuggestions(result.suggestions || []);
        }
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, name]);

  const handleSelectSuggestion = (suggested: string) => {
    setUsername(suggested);
    setUsernameStatus('available');
    setUsernameFeedback('Username is available');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name or display name.');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('That username is taken. Please choose another username or pick from the available suggestions.');
      return;
    }
    if (usernameStatus === 'invalid') {
      setError(usernameFeedback || 'Please enter a valid username.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to proceed.');
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
      const authErr = err as AuthError;
      const message = authErr.message || 'Failed to create account.';
      setError(message);
      if (authErr.suggestions && authErr.suggestions.length > 0) {
        setUsernameStatus('taken');
        setUsernameFeedback(message);
        setSuggestions(authErr.suggestions);
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
                    className={`w-full px-3.5 py-2.5 pl-9 pr-9 rounded-lg border bg-[#f8f9fa] dark:bg-[#12161c] text-xs text-[#181a20] dark:text-white placeholder-[#707a8a] focus:outline-hidden transition-colors ${
                      usernameStatus === 'taken' || usernameStatus === 'invalid'
                        ? 'border-[#f6465d] focus:border-[#f6465d]'
                        : usernameStatus === 'available'
                        ? 'border-[#0ecb81] focus:border-[#0ecb81]'
                        : 'border-[#eaecef] dark:border-[#2b3139] focus:border-[#FCD535]'
                    }`}
                  />
                  <span className="text-xs font-mono text-[#707a8a] absolute left-3.5 top-2.5">@</span>
                  <div className="absolute right-3 top-2.5">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#FCD535]" />
                    )}
                    {usernameStatus === 'available' && (
                      <CheckCircle2 className="h-4 w-4 text-[#0ecb81]" />
                    )}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                      <AlertCircle className="h-4 w-4 text-[#f6465d]" />
                    )}
                  </div>
                </div>

                {/* Real-Time Feedback */}
                {usernameFeedback && (
                  <div
                    className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${
                      usernameStatus === 'available'
                        ? 'text-[#0ecb81]'
                        : usernameStatus === 'taken' || usernameStatus === 'invalid'
                        ? 'text-[#f6465d]'
                        : 'text-[#707a8a]'
                    }`}
                  >
                    <span>{usernameFeedback}</span>
                  </div>
                )}

                {/* Gmail-Style Available Suggestions Box */}
                {suggestions.length > 0 && (
                  <div className="mt-2.5 p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecef] dark:border-[#2b3139] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#707a8a] font-medium">
                        <Sparkles className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
                        <span>Available:</span>
                      </div>
                      <span className="text-[10px] text-[#707a8a]">Click to choose</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map(sug => {
                        const isSelected = username.trim().toLowerCase() === sug.toLowerCase();
                        return (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleSelectSuggestion(sug)}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#FCD535] text-[#181a20] border-[#f0b90b] font-bold shadow-xs'
                                : 'bg-white dark:bg-[#1e2329] border-[#eaecef] dark:border-[#2b3139] text-[#181a20] dark:text-[#eaecef] hover:border-[#FCD535] hover:text-[#b8860b] dark:hover:text-[#FCD535]'
                            }`}
                          >
                            {sug}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181a20] dark:text-[#eaecef] mb-1.5">
                  Password <span className="text-[10px] text-[#707a8a] font-normal">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pl-9 pr-10 rounded-lg border border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#12161c] text-xs text-[#181a20] dark:text-white placeholder-[#707a8a] focus:outline-hidden focus:border-[#FCD535] transition-colors"
                  />
                  <Lock className="h-3.5 w-3.5 text-[#707a8a] absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-[#707a8a] hover:text-[#181a20] dark:hover:text-white transition-colors cursor-pointer p-0.5 focus:outline-hidden"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Terms of Service & Privacy Policy Consent Checkbox */}
              <label className="flex items-start gap-2.5 pt-1 select-none cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#12161c] text-[#FCD535] focus:ring-[#FCD535]/50 focus:ring-offset-0 cursor-pointer accent-[#FCD535]"
                />
                <span className="text-xs text-[#707a8a] leading-relaxed">
                  I agree to the{' '}
                  <span className="text-[#181a20] dark:text-[#eaecef] font-medium group-hover:underline">
                    Terms of Service
                  </span>{' '}
                  and acknowledge the{' '}
                  <span className="text-[#181a20] dark:text-[#eaecef] font-medium group-hover:underline">
                    Privacy Policy
                  </span>.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || usernameStatus === 'checking' || !agreedToTerms}
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
