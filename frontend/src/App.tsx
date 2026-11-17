import React, { useEffect, useState, useCallback } from 'react';
import { Problem, DashboardStats, AgentLog, User } from './types';
import {
  fetchStats,
  fetchProblems,
  fetchProblemById,
  fetchProblemLogs,
  createProblem,
  solveProblem,
  deleteProblem,
  fetchCurrentUser,
  logoutUser,
  resetAllProblems,
} from './api';
import { Header } from './components/Header';
import { MetricsRibbon } from './components/MetricsRibbon';
import { ProblemList } from './components/ProblemList';
import { ProblemDetail } from './components/ProblemDetail';
import { CreateProblemModal } from './components/CreateProblemModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { SignInPage } from './components/SignInPage';
import { SignUpPage } from './components/SignUpPage';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  // Client-side routing state (/signin, /signup, /)
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');

  const navigate = useCallback((to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState(null, '', to);
      setPathname(to);
    }
  }, []);

  // Listen to browser navigation (Back / Forward buttons)
  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [problemToDelete, setProblemToDelete] = useState<Problem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load stats and problems for authenticated user
  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      const [newStats, newProblems] = await Promise.all([fetchStats(), fetchProblems()]);
      setStats(newStats);
      setProblems(Array.isArray(newProblems) ? newProblems : []);

      if (Array.isArray(newProblems) && newProblems.length > 0) {
        setSelectedProblemId(prev => {
          if (!prev || !newProblems.some(p => p.id === prev)) {
            return newProblems[0].id;
          }
          return prev;
        });
      } else {
        setSelectedProblemId(null);
        setSelectedProblem(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend server';
      console.error('Error fetching data:', err);
      setProblems([]);
      setErrorMessage(msg);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Check auth session on initial load and route accordingly
  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      try {
        setIsAuthChecking(true);
        const user = await fetchCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
          if (user) {
            await loadData();
            // If logged-in user landed on /signin or /signup, redirect to dashboard /
            const currentPath = window.location.pathname;
            if (currentPath === '/signin' || currentPath === '/signup' || currentPath === '/sign') {
              navigate('/');
            }
          } else {
            // Unauthenticated: if attempting to view root dashboard, redirect to /signin
            const currentPath = window.location.pathname;
            if (currentPath === '/') {
              navigate('/signin');
            }
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        if (isMounted) {
          navigate('/signin');
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };
    initSession();
    return () => {
      isMounted = false;
    };
  }, [loadData, navigate]);

  // Load selected problem details & logs
  useEffect(() => {
    if (!selectedProblemId) {
      setSelectedProblem(null);
      setLogs([]);
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const [prob, probLogs] = await Promise.all([
          fetchProblemById(selectedProblemId),
          fetchProblemLogs(selectedProblemId),
        ]);
        if (isMounted) {
          setSelectedProblem(prob);
          setLogs(probLogs);
        }
      } catch (err) {
        console.error('Error fetching problem details:', err);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedProblemId]);

  // Handle Solve Swarm action
  const handleSolve = async (problemId: string) => {
    try {
      setIsSolving(true);
      setProblems(prev =>
        prev.map(p => (p.id === problemId ? { ...p, status: 'IN_PROGRESS' } : p))
      );
      if (selectedProblem?.id === problemId) {
        setSelectedProblem(prev => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      }

      await solveProblem(problemId);

      await loadData();
      const [updatedProb, updatedLogs] = await Promise.all([
        fetchProblemById(problemId),
        fetchProblemLogs(problemId),
      ]);
      setSelectedProblem(updatedProb);
      setLogs(updatedLogs);
    } catch (err) {
      console.error('Error solving problem with swarm:', err);
    } finally {
      setIsSolving(false);
    }
  };

  // Handle Create Problem
  const handleCreate = async (data: {
    title: string;
    description: string;
    code_snippet?: string;
    logs?: string;
    language: string;
    agent_count: number;
    document_name?: string;
    document_text?: string;
  }) => {
    const newProblem = await createProblem(data);
    await loadData();
    setSelectedProblemId(newProblem.id);
  };

  // Handle Reset All Problems to PENDING (persists permanently to backend database)
  const handleResetAllToPending = async () => {
    try {
      setIsRefreshing(true);
      // Optimistic update
      setProblems(prev =>
        prev.map(p => ({
          ...p,
          status: 'PENDING',
          solution_patch: undefined,
          solution_explanation: undefined,
          verification_report: undefined,
          tech_lead_verdict: undefined,
          quality_score: 0,
          agent_runs: [],
          evaluations: [],
        }))
      );
      setSelectedProblem(prev =>
        prev
          ? {
              ...prev,
              status: 'PENDING',
              solution_patch: undefined,
              solution_explanation: undefined,
              verification_report: undefined,
              tech_lead_verdict: undefined,
              quality_score: 0,
              agent_runs: [],
              evaluations: [],
            }
          : null
      );
      setLogs([]);

      // Persist to backend database
      await resetAllProblems();
      await loadData();
      if (selectedProblemId) {
        const [updatedProb, updatedLogs] = await Promise.all([
          fetchProblemById(selectedProblemId).catch(() => null),
          fetchProblemLogs(selectedProblemId).catch(() => []),
        ]);
        if (updatedProb) setSelectedProblem(updatedProb);
        setLogs(updatedLogs);
      }
    } catch (err) {
      console.error('Failed to reset all problems:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Confirm Delete Problem from Modal
  const handleConfirmDelete = async () => {
    if (!problemToDelete) return;
    try {
      setIsDeleting(true);
      await deleteProblem(problemToDelete.id);
      setProblems(prev => prev.filter(p => p.id !== problemToDelete.id));
      if (selectedProblemId === problemToDelete.id) {
        const remaining = problems.filter(p => p.id !== problemToDelete.id);
        if (remaining.length > 0) {
          setSelectedProblemId(remaining[0].id);
        } else {
          setSelectedProblemId(null);
          setSelectedProblem(null);
        }
      }
      setProblemToDelete(null);
    } catch (err) {
      console.error('Failed to delete problem:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setProblems([]);
    setSelectedProblem(null);
    setSelectedProblemId(null);
    setLogs([]);
    setStats(null);
    navigate('/signin');
  };

  // Handle Successful Sign In / Sign Up
  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadData();
    navigate('/');
  };

  // 1. Initial Session Loading Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0e11] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/taskforce.svg"
            alt="Taskforce Logo"
            className="w-10 h-10 rounded-lg shadow-sm animate-pulse"
          />
          <div className="flex items-center gap-2 text-xs font-semibold text-[#707a8a]">
            <Loader2 className="h-4 w-4 animate-spin text-[#FCD535]" />
            <span>Loading workspace session...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Route: /signup
  if (pathname === '/signup') {
    if (currentUser) {
      navigate('/');
      return null;
    }
    return <SignUpPage onNavigate={navigate} onSuccess={handleAuthSuccess} />;
  }

  // 3. Route: /signin or /sign
  if (pathname === '/signin' || pathname === '/sign') {
    if (currentUser) {
      navigate('/');
      return null;
    }
    return <SignInPage onNavigate={navigate} onSuccess={handleAuthSuccess} />;
  }

  // 4. Fallback for unauthenticated access on protected routes: Redirect to /signin
  if (!currentUser) {
    navigate('/signin');
    return <SignInPage onNavigate={navigate} onSuccess={handleAuthSuccess} />;
  }

  // 5. Protected Dashboard Route (/)
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0e11] text-[#181a20] dark:text-[#eaecef] flex flex-col font-sans transition-colors">
      <Header
        onNewProblem={() => setIsModalOpen(true)}
        onRefresh={() => loadData()}
        isRefreshing={isRefreshing}
        showMetrics={showMetrics}
        onToggleMetrics={() => setShowMetrics(prev => !prev)}
        currentUser={currentUser}
        onOpenAuth={() => navigate('/signin')}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6 flex flex-col">
        {/* Connection Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#fff5f5] dark:bg-[#1e2329] border border-[#fed7d7] dark:border-[#f6465d]/40 flex items-center justify-between text-xs text-[#f6465d]">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#f6465d] shrink-0" />
              <span>{errorMessage}. Ensure backend is running.</span>
            </div>
            <button
              onClick={() => loadData()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#f6465d]/20 hover:bg-[#f6465d]/30 text-white font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* Observability Metrics Ribbon (Optional / Toggleable) */}
        {showMetrics && <MetricsRibbon stats={stats} />}

        {/* Multi-Problem Swarm Grid - Synchronized height to prevent whole-page scrolling */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[690px] mb-8 items-start">
          {/* Problem List (Left Column) */}
          <div className="lg:col-span-4 h-full lg:h-[690px] flex flex-col">
            <ProblemList
              problems={problems}
              selectedProblemId={selectedProblemId}
              onSelectProblem={id => setSelectedProblemId(id)}
              onResetAllToPending={handleResetAllToPending}
              onRequestDelete={prob => setProblemToDelete(prob)}
            />
          </div>

          {/* Selected Problem Command Center (Right Column) */}
          <div className="lg:col-span-8 h-full lg:h-[690px] flex flex-col">
            {selectedProblem ? (
              <ProblemDetail
                problem={selectedProblem}
                logs={logs}
                onSolve={handleSolve}
                isSolving={isSolving}
                onRequestDelete={() => selectedProblem && setProblemToDelete(selectedProblem)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] rounded-xl text-center shadow-xs dark:shadow-none transition-colors">
                <p className="text-[#707a8a] text-sm mb-4">No problem selected from your workspace floor.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 rounded-md bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  Create Your First Problem
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Problem Modal */}
      <CreateProblemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Interactive Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!problemToDelete}
        problemTitle={problemToDelete?.title || ''}
        onClose={() => {
          if (!isDeleting) setProblemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default App;
