import React, { useEffect, useState, useCallback } from 'react';
import { Problem, DashboardStats, AgentLog } from './types';
import { fetchStats, fetchProblems, fetchProblemById, fetchProblemLogs, createProblem, solveProblem } from './api';
import { Header } from './components/Header';
import { MetricsRibbon } from './components/MetricsRibbon';
import { ProblemList } from './components/ProblemList';
import { ProblemDetail } from './components/ProblemDetail';
import { CreateProblemModal } from './components/CreateProblemModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
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

  // Load stats and problems
  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      const [newStats, newProblems] = await Promise.all([fetchStats(), fetchProblems()]);
      setStats(newStats);
      setProblems(newProblems);

      if (newProblems.length > 0) {
        setSelectedProblemId(prev => {
          if (!prev || !newProblems.some(p => p.id === prev)) {
            return newProblems[0].id;
          }
          return prev;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend server';
      console.error('Error fetching data:', err);
      setErrorMessage(msg);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

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
          fetchProblemLogs(selectedProblemId)
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

  // Handle Solve Swarm action (lightweight, non-blocking async)
  const handleSolve = async (problemId: string) => {
    try {
      setIsSolving(true);
      // Optimistic update
      setProblems(prev =>
        prev.map(p => (p.id === problemId ? { ...p, status: 'IN_PROGRESS' } : p))
      );
      if (selectedProblem?.id === problemId) {
        setSelectedProblem(prev => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      }

      await solveProblem(problemId);

      // Refresh full telemetry after solution completes
      await loadData();
      const [updatedProb, updatedLogs] = await Promise.all([
        fetchProblemById(problemId),
        fetchProblemLogs(problemId)
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

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0e11] text-[#181a20] dark:text-[#eaecef] flex flex-col font-sans transition-colors">
      <Header
        onNewProblem={() => setIsModalOpen(true)}
        onRefresh={() => loadData()}
        isRefreshing={isRefreshing}
        showMetrics={showMetrics}
        onToggleMetrics={() => setShowMetrics(prev => !prev)}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6 flex flex-col">
        {/* Connection Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#fff5f5] dark:bg-[#1e2329] border border-[#fed7d7] dark:border-[#f6465d]/40 flex items-center justify-between text-xs text-[#f6465d]">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#f6465d] shrink-0" />
              <span>{errorMessage}. Ensure backend is running on {import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'}.</span>
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
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] rounded-xl text-center shadow-xs dark:shadow-none transition-colors">
                <p className="text-[#707a8a] text-sm mb-4">No problem selected from floor.</p>
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

      {/* Modal */}
      <CreateProblemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
};

export default App;
