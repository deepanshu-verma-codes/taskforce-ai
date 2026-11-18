import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Problem, AgentLog, DailyQuotaStatus, User } from '../types';
import { fetchProblemQuota } from '../api';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Terminal,
  Shield,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCode,
  FileText,
  Zap,
  Database,
  Loader2,
  Trash2,
} from 'lucide-react';
import { FormattedContent } from './FormattedContent';

interface ProblemDetailProps {
  problem: Problem;
  logs: AgentLog[];
  onSolve: (id: string) => void;
  isSolving: boolean;
  onRequestDelete?: () => void;
  currentUser?: User | null;
  onOpenVipModal?: () => void;
}

// Universal, domain-agnostic metric name formatter for any problem type
const getUniversalMetricName = (name: string): string => {
  const trimmed = name.trim();
  if (/code\s*correctness/i.test(trimmed)) return 'Solution Accuracy';
  if (/tech\s*lead\s*confidence/i.test(trimmed)) return 'Lead Confidence';
  if (/edge\s*case\s*coverage/i.test(trimmed)) return 'Scenario Coverage';
  if (/security\s*(&|and)?\s*vulnerability/i.test(trimmed)) return 'Safety & Risk';
  return trimmed;
};

export const ProblemDetail: React.FC<ProblemDetailProps> = ({
  problem,
  logs,
  onSolve,
  isSolving,
  onRequestDelete,
  currentUser,
  onOpenVipModal,
}) => {
  // Step 1: Default to 'problem' (Problem & Context) tab
  const [activeTab, setActiveTab] = useState<'problem' | 'swarm' | 'solution'>('problem');
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);

  // Daily Problem Solve Quota (5 solves/day limit, deepanshu_verma exempt)
  const [quota, setQuota] = useState<DailyQuotaStatus | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      const q = await fetchProblemQuota();
      setQuota(q);
    } catch {
      // Retain
    }
  }, []);

  useEffect(() => {
    loadQuota();
  }, [loadQuota, problem.status]);

  // Automatically switch to 'problem' (Problem & Context) when any problem is selected from left panel
  useEffect(() => {
    setActiveTab('problem');
  }, [problem.id]);

  // Step 3: When swarm completes and results arrive, automatically navigate to 'solution' (Verified Solution)
  const prevSolvingRef = useRef(isSolving);
  useEffect(() => {
    if (
      prevSolvingRef.current &&
      !isSolving &&
      (problem.status === 'RESOLVED' || Boolean(problem.solution_patch))
    ) {
      setActiveTab('solution');
    }
    prevSolvingRef.current = isSolving;
  }, [isSolving, problem.status, problem.solution_patch]);

  const isResolved = problem.status === 'RESOLVED';
  const isInProgress = problem.status === 'IN_PROGRESS' || isSolving;
  const isProgramming = Boolean(
    problem.language &&
    (problem.language.toLowerCase().includes('python') ||
     problem.language.toLowerCase().includes('typescript') ||
     problem.language.toLowerCase().includes('javascript') ||
     problem.language.toLowerCase().includes('software') ||
     problem.language.toLowerCase().includes('code') ||
     problem.language.toLowerCase().includes('programming'))
  );

  // Filter critique events
  const critiqueLogs = logs.filter(
    l => l.event_type === 'CRITIQUE' || l.event_type === 'CORRECTION'
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] rounded-xl overflow-hidden shadow-xs dark:shadow-none transition-colors">
      {/* 1. Header Banner & Action */}
      <div className="p-4 border-b border-[#eaecef] dark:border-[#2b3139] bg-white dark:bg-[#1e2329] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#2b3139] text-[#181a20] dark:text-[#eaecef] border border-[#eaecef] dark:border-[#2b3139]">
              {problem.agent_count} Swarm Agents
            </span>
            {Boolean(problem.has_rag && problem.document_name) && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] border border-[#FCD535]/30 font-semibold flex items-center gap-1">
                <Database className="h-3 w-3" />
                Qdrant RAG: {problem.document_name}
              </span>
            )}
            {isResolved && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0ecb81]/10 text-[#0ecb81] border border-[#0ecb81]/30 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Score: {problem.quality_score}% Verified
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-[#181a20] dark:text-white tracking-tight">{problem.title}</h2>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onRequestDelete && (
            <button
              onClick={onRequestDelete}
              className="flex items-center gap-1.5 px-3 h-10 rounded-md border border-[#eaecef] dark:border-[#2b3139] hover:border-[#f6465d] bg-white dark:bg-[#1e2329] text-[#707a8a] hover:text-[#f6465d] hover:bg-[#f6465d]/10 text-xs font-medium transition-colors cursor-pointer"
              title="Delete this problem"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {!isResolved ? (
            <div className="flex items-center gap-2">
              {/* Daily Problem Solve Quota Pill */}
              {quota?.is_exempt || (currentUser && (currentUser.username.toLowerCase() === 'deepanshu_verma' || currentUser.username.toLowerCase() === 'deepanshu-verma' || currentUser.is_vip === 1)) ? (
                <button
                  type="button"
                  onClick={onOpenVipModal}
                  className="hidden md:flex items-center gap-1.5 px-3 h-10 rounded-md bg-[#FCD535]/15 hover:bg-[#FCD535]/25 text-[#b8860b] dark:text-[#FCD535] border border-[#b8860b] dark:border-[#FCD535]/40 text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  title={
                    currentUser && (currentUser.username.toLowerCase() === 'deepanshu_verma' || currentUser.username.toLowerCase() === 'deepanshu-verma')
                      ? "Exclusive Owner Account: Zero daily problem limits or token constraints (Click to open VIP Admin Console)"
                      : "VIP Unlimited Pass Active (Click to view details)"
                  }
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
                  <span>VIP Unlimited</span>
                </button>
              ) : quota ? (
                <button
                  type="button"
                  onClick={onOpenVipModal}
                  className={`hidden md:flex items-center gap-1.5 px-2.5 h-10 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
                    quota.remaining_today <= 0
                      ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]'
                      : 'bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] border-[#eaecef] dark:border-[#2b3139] text-[#707a8a]'
                  }`}
                  title="Daily limit resets at midnight UTC. Click to enter VIP access code for unlimited solves."
                >
                  <Shield className="h-3.5 w-3.5 text-[#00f0ff]" />
                  <span>
                    Solves: {quota.remaining_today} / {quota.daily_limit} left
                  </span>
                </button>
              ) : null}

              <button
                onClick={() => {
                  onSolve(problem.id);
                  setActiveTab('swarm');
                }}
                disabled={
                  isInProgress ||
                  (quota !== null && !quota.is_exempt && quota.remaining_today <= 0)
                }
                className={`flex items-center gap-2 px-5 h-10 rounded-md font-semibold text-xs tracking-tight transition-colors cursor-pointer shadow-sm ${
                  isInProgress ||
                  (quota !== null && !quota.is_exempt && quota.remaining_today <= 0)
                    ? 'bg-[#eaecef] dark:bg-[#3a3a1f] text-[#707a8a] cursor-not-allowed border border-[#eaecef] dark:border-[#2b3139]'
                    : 'bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] active:bg-[#f0b90b]'
                }`}
                title={
                  quota !== null && !quota.is_exempt && quota.remaining_today <= 0
                    ? 'Daily problem resolution limit reached (5/5). Quota resets at midnight UTC.'
                    : undefined
                }
              >
                {isInProgress ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#b8860b] dark:text-[#FCD535]" />
                    <span>Swarm Resolving...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Deploy Swarm ({problem.agent_count} Agents)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#0ecb81] bg-[#0ecb81]/10 dark:bg-[#2b3139] border border-[#0ecb81]/40 px-3.5 h-10 rounded-md">
              <CheckCircle2 className="h-4 w-4" />
              <span>100% Verified Pass</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily Problem Solve Quota Exhausted Alert Banner */}
      {quota && !quota.is_exempt && quota.remaining_today <= 0 && !isResolved && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-[#fff5f5] dark:bg-[#2b1f24] border border-[#fed7d7] dark:border-[#f6465d]/40 flex items-center justify-between text-xs text-[#f6465d]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Daily problem resolution limit reached (5/5 problems solved). Quota resets at midnight UTC to protect agent compute tokens.
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#707a8a] shrink-0 ml-2">0 solves remaining</span>
        </div>
      )}

      {/* 2. Binance 3-Tab Bar */}
      <div className="flex items-center border-b border-[#eaecef] dark:border-[#2b3139] bg-white dark:bg-[#1e2329] px-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('problem')}
          className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'problem'
              ? 'border-[#b8860b] dark:border-[#FCD535] text-[#b8860b] dark:text-[#FCD535] font-semibold'
              : 'border-transparent text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef]'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          {isProgramming ? 'Problem & Code' : 'Problem & Context'}
        </button>

        <button
          onClick={() => setActiveTab('swarm')}
          className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'swarm'
              ? 'border-[#b8860b] dark:border-[#FCD535] text-[#b8860b] dark:text-[#FCD535] font-semibold'
              : 'border-transparent text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Team Deliverables {problem.agent_runs?.length ? `(${problem.agent_runs.length})` : ''}
          {isInProgress && (
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FCD535] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FCD535]"></span>
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('solution')}
          className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'solution'
              ? 'border-[#b8860b] dark:border-[#FCD535] text-[#b8860b] dark:text-[#FCD535] font-semibold'
              : 'border-transparent text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef]'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isProgramming ? 'Verified Fix' : 'Verified Solution'} {isResolved ? '✓' : ''}
          {isInProgress && (
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ecb81] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0ecb81]"></span>
            </span>
          )}
        </button>
      </div>

      {/* 3. Main Workspace Panel */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8f9fa] dark:bg-[#0b0e11] transition-colors">
        {/* TAB 1: THE PROBLEM */}
        {activeTab === 'problem' && (
          <div className="space-y-4 max-w-4xl">
            {/* Problem Title Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs dark:shadow-none">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] font-bold uppercase tracking-wider">
                  Problem Title
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#12161c] text-[#707a8a] border border-[#eaecef] dark:border-[#2b3139] uppercase">
                  {problem.language || 'general'}
                </span>
              </div>
              <h2 className="text-base font-bold text-[#181a20] dark:text-white leading-snug">
                {problem.title}
              </h2>
            </div>

            {/* Qdrant Vector Storage Card (RAG - ONLY displayed when a document/PDF was uploaded) */}
            {Boolean(problem.has_rag && problem.document_name) && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#FCD535]/10 via-[#3b82f6]/5 to-transparent border border-[#FCD535]/30 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#FCD535] text-[#181a20] shadow-xs shrink-0">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#181a20] dark:text-white">
                        Attached Document Active (Qdrant Vector DB)
                      </h4>
                      <span className="px-1.5 py-0.2 rounded bg-[#0ecb81]/15 text-[#0ecb81] text-[9px] font-mono font-semibold">
                        Synced
                      </span>
                    </div>
                    <p className="text-[11px] text-[#707a8a] mt-0.5">
                      Document source: <span className="font-mono text-[#b8860b] dark:text-[#FCD535] font-semibold">{problem.document_name}</span> • Synced for autonomous agent retrieval
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Description Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs dark:shadow-none">
              <h3 className="text-xs font-bold text-[#707a8a] uppercase tracking-wider mb-2">
                Problem Context & Description
              </h3>
              <p className="text-xs text-[#181a20] dark:text-[#eaecef] leading-relaxed whitespace-pre-wrap">
                {problem.description}
              </p>
            </div>

            {/* Context / Code */}
            {problem.code_snippet && (
              <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs dark:shadow-none">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-[#707a8a] uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
                    {isProgramming ? 'Input Code Snippet' : 'Context, Equations & Specifications'}
                  </h3>
                </div>
                <pre className="bg-[#181a20] dark:bg-[#0b0e11] p-3.5 rounded-lg border border-[#eaecef] dark:border-[#2b3139] text-xs font-mono text-[#eaecef] overflow-x-auto leading-relaxed">
                  <code>{problem.code_snippet}</code>
                </pre>
              </div>
            )}

            {/* Error Logs / Symptoms */}
            {problem.logs && (
              <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs dark:shadow-none">
                <h3 className="text-xs font-bold text-[#f6465d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  {isProgramming ? 'Observed Stack Trace & Error Logs' : 'Observed Symptoms, Telemetry & Data'}
                </h3>
                <pre className="bg-[#fff5f5] dark:bg-[#0b0e11] p-3.5 rounded-lg border border-[#fed7d7] dark:border-[#f6465d]/40 text-xs font-mono text-[#f6465d] overflow-x-auto leading-relaxed">
                  <code>{problem.logs}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SWARM & TEAM DELIVERABLES */}
        {activeTab === 'swarm' && (
          <div className="space-y-4 max-w-4xl">
            {/* Marcus Vance Strategic Overview */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs dark:shadow-none">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#FCD535] text-[#181a20] flex items-center justify-center font-bold text-xs">
                    MV
                  </div>
                  <h3 className="text-xs font-bold text-[#181a20] dark:text-white">
                    Marcus Vance
                  </h3>
                  <span className="text-[10px] text-[#b8860b] dark:text-[#FCD535] font-mono font-medium">
                    {problem.agent_count} Team Members
                  </span>
                </div>
                {isInProgress && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FCD535]/20 text-[#b8860b] dark:text-[#FCD535] border border-[#FCD535]/40 flex items-center gap-1.5 font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin text-[#FCD535]" />
                    Coordinating Swarm...
                  </span>
                )}
              </div>
              {problem.tech_lead_verdict ? (
                <FormattedContent content={problem.tech_lead_verdict} />
              ) : isInProgress ? (
                <div className="p-4 rounded-lg bg-[#fffdf0] dark:bg-[#181a20] border border-[#fef08a] dark:border-[#FCD535]/30 flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[#b8860b] dark:text-[#FCD535] shrink-0" />
                  <p className="text-xs text-[#b8860b] dark:text-[#FCD535]">
                    Marcus Vance is actively decomposing the problem narrative and dispatching diagnostic tasks to the swarm specialists...
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#707a8a] italic">
                  Marcus Vance, Elena Rostova, David Park, Maya Patel, James Thorne, and Sarah Chen will formulate a verified resolution once deployed.
                </p>
              )}
            </div>

            {/* Self-Healing Critique Alert */}
            {critiqueLogs.length > 0 && (
              <div className="p-4 rounded-xl bg-[#fffdf0] dark:bg-[#1e2329] border border-[#fef08a] dark:border-[#FCD535]/40 space-y-2 shadow-xs dark:shadow-none">
                <div className="flex items-center gap-2 text-xs font-bold text-[#b8860b] dark:text-[#FCD535]">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Review & Quality Directives ({critiqueLogs.length})</span>
                </div>
                {critiqueLogs.map((log, i) => (
                  <div key={i} className="text-xs text-[#181a20] dark:text-[#eaecef] pl-4 border-l-2 border-[#FCD535]">
                    <span className="font-semibold text-[#b8860b] dark:text-[#FCD535]">[{log.agent_name}]: </span>
                    {log.message}
                  </div>
                ))}
              </div>
            )}

            {/* Worker Agents (Expandable Cards) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#707a8a] uppercase tracking-wider">
                  Team Deliverables
                </h4>
                {isInProgress && (
                  <span className="text-[10px] font-mono text-[#b8860b] dark:text-[#FCD535] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FCD535] animate-ping" />
                    Specialists Working
                  </span>
                )}
              </div>

              {isInProgress && (!problem.agent_runs || problem.agent_runs.length === 0) ? (
                <div className="p-8 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] text-center space-y-3 shadow-xs">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] animate-pulse">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#181a20] dark:text-white">
                      Autonomous Specialists Investigating
                    </h4>
                    <p className="text-[11px] text-[#707a8a] max-w-md mx-auto">
                      {problem.agent_count >= 5
                        ? 'Elena Rostova (Diagnostics), David Park (Action Protocol), Maya Patel (Quality Validation), James Thorne (Risk & Safety), and Sarah Chen (Systems & Continuity) are collaborating. Results will appear when complete.'
                        : problem.agent_count === 1
                        ? 'Elena Rostova (Diagnostics) is investigating. Results will appear when complete.'
                        : 'Elena Rostova (Diagnostics), David Park (Action Protocol), Maya Patel (Quality Validation), and James Thorne (Risk & Safety) are collaborating. Results will appear when complete.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <span className="w-2 h-2 rounded-full bg-[#FCD535] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCD535] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCD535] animate-bounce" />
                  </div>
                </div>
              ) : (!problem.agent_runs || problem.agent_runs.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#707a8a] bg-white dark:bg-[#1e2329] rounded-xl border border-[#eaecef] dark:border-[#2b3139]">
                  Team members have not been deployed yet. Click 'Deploy Swarm' above to start.
                </div>
              ) : (
                problem.agent_runs.map((run, idx) => {
                  const isExpanded = expandedWorker === run.agent_name;
                  return (
                    <div
                      key={run.id || idx}
                      className="rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] overflow-hidden shadow-xs dark:shadow-none"
                    >
                      <button
                        onClick={() => setExpandedWorker(isExpanded ? null : run.agent_name)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#f8f9fa] dark:hover:bg-[#2b3139]/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Bot className="h-4 w-4 text-[#b8860b] dark:text-[#FCD535]" />
                          <div>
                            <span className="text-xs font-bold text-[#181a20] dark:text-white">{run.agent_name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-[#707a8a]">
                            {run.tokens_used.toLocaleString()} tokens • {(run.latency_ms / 1000).toFixed(1)}s
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-[#707a8a]" /> : <ChevronDown className="h-4 w-4 text-[#707a8a]" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 pt-3 border-t border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#12161c]/60">
                          <FormattedContent content={run.output_content} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: VERIFIED SOLUTION & FIX */}
        {activeTab === 'solution' && (
          <div className="space-y-6 max-w-4xl">
            {/* LangSmith Evaluation Scorecard */}
            {isResolved && problem.evaluations && problem.evaluations.length > 0 && (
              <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs dark:shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-[#b8860b]/15 dark:bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535]">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#181a20] dark:text-white uppercase tracking-wider">
                        Evaluation Scorecard
                      </h4>
                      <span className="text-[11px] text-[#707a8a]">Continuous Automated Boundary & Quality Metrics</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#0ecb81]/15 text-[#0ecb81] text-[11px] font-mono font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All Checks Passed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {problem.evaluations.map((ev, i) => (
                    <div key={i} className="p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecef] dark:border-[#2b3139] flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2.5 mb-1.5">
                        <span
                          className="text-xs font-medium text-[#707a8a] truncate min-w-0 flex-1"
                          title={getUniversalMetricName(ev.metric_name)}
                        >
                          {getUniversalMetricName(ev.metric_name)}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#0ecb81] shrink-0">
                          {ev.score}%
                        </span>
                      </div>
                      <div className="w-full bg-[#eaecef] dark:bg-[#2b3139] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#0ecb81] h-full rounded-full transition-all duration-500" style={{ width: `${ev.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. VERIFIED PRODUCTION RESOLUTION */}
            <div className="p-5 md:p-6 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs dark:shadow-none">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#eaecef] dark:border-[#2b3139]">
                <div className="p-2 rounded-lg bg-[#0ecb81]/15 text-[#0ecb81]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-[#181a20] dark:text-white flex items-center gap-2">
                    <span>Verified Production Resolution</span>
                    {isResolved && (
                      <span className="px-2 py-0.5 rounded bg-[#0ecb81]/15 text-[#0ecb81] text-[10px] font-mono font-bold tracking-wider uppercase">
                        {isProgramming ? 'Verified Fix' : 'Verified Resolution'}
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-2 py-0.5 rounded bg-[#0ecb81]/15 text-[#0ecb81] text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-[#0ecb81]" />
                        {isProgramming ? 'Synthesizing Fix...' : 'Synthesizing Resolution...'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[#707a8a] mt-0.5">
                    {isProgramming ? 'Production-grade code patch with regression immunity' : 'Verified action protocol, synthesized by autonomous specialists'}
                  </p>
                </div>
              </div>

              {problem.solution_patch ? (
                <div className="prose-clean">
                  <FormattedContent content={problem.solution_patch} />
                </div>
              ) : isInProgress ? (
                <div className="p-8 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] text-center space-y-3">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#0ecb81]/15 text-[#0ecb81] animate-pulse">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#181a20] dark:text-white">
                      {isProgramming ? 'Synthesizing Production Code Resolution' : 'Synthesizing Verified Resolution'}
                    </h4>
                    <p className="text-[11px] text-[#707a8a] max-w-md mx-auto">
                      Specialist swarm deliverables are in progress. Marcus Vance will synthesize the verified resolution, boundary safeguards, and compliance checklist once complete.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <span className="w-2 h-2 rounded-full bg-[#0ecb81] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-[#0ecb81] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-[#0ecb81] animate-bounce" />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#707a8a] italic">
                  {isProgramming
                    ? 'No verified patch generated yet. Deploy the swarm to produce the fix.'
                    : 'No verified resolution generated yet. Deploy the swarm to formulate the solution.'}
                </div>
              )}
            </div>

            {/* 2. AUTOMATED VERIFICATION REPORT (FULL WIDTH, CLEAN FORMATTED TABLES) */}
            {isResolved && (
              <div className="p-5 md:p-6 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs dark:shadow-none">
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#eaecef] dark:border-[#2b3139]">
                  <div className="p-2 rounded-lg bg-[#0ecb81]/15 text-[#0ecb81]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-[#181a20] dark:text-white flex items-center gap-2">
                      <span>Automated Verification Report</span>
                      <span className="px-2 py-0.5 rounded bg-[#0ecb81]/15 text-[#0ecb81] text-[10px] font-mono font-bold tracking-wider uppercase">
                        All Passed
                      </span>
                    </h3>
                    <p className="text-xs text-[#707a8a] mt-0.5">
                      Multi-agent boundary testing, regression assertions, and safety hazard validation
                    </p>
                  </div>
                </div>

                {problem.verification_report ? (
                  <div className="prose-clean">
                    <FormattedContent content={problem.verification_report} />
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-[#f0fdf4] dark:bg-[#122119] border border-[#bbf7d0] dark:border-[#0ecb81]/30 text-xs text-[#0ecb81] font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>All boundary tests and invariants passed with zero regressions.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Collapsible Telemetry Logs Drawer */}
      <div className="border-t border-[#eaecef] dark:border-[#2b3139] bg-white dark:bg-[#1e2329] transition-colors">
        <button
          onClick={() => setShowLogsDrawer(!showLogsDrawer)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
            <span>Swarm Event Telemetry ({logs.length} events recorded)</span>
          </div>
          {showLogsDrawer ? <ChevronDown className="h-4 w-4 text-[#707a8a]" /> : <ChevronUp className="h-4 w-4 text-[#707a8a]" />}
        </button>

        {showLogsDrawer && (
          <div className="max-h-48 overflow-y-auto p-4 pt-1 space-y-1 font-mono text-[11px] text-[#181a20] dark:text-[#eaecef] border-t border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#0b0e11]">
            {logs.length === 0 ? (
              <div className="text-[#707a8a] italic py-2">No event logs recorded.</div>
            ) : (
              logs.map((log, index) => {
                const isRag = log.event_type === 'RAG_RETRIEVAL';
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-2 py-0.5 ${
                      isRag
                        ? 'bg-[#FCD535]/15 dark:bg-[#FCD535]/10 px-2 py-1.5 rounded text-[#b8860b] dark:text-[#FCD535] font-semibold my-1 border border-[#FCD535]/30'
                        : ''
                    }`}
                  >
                    <span className="text-[#707a8a] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[#b8860b] dark:text-[#FCD535] shrink-0 flex items-center gap-1">
                      {isRag && <Database className="h-3 w-3 text-[#FCD535] animate-pulse" />}
                      [{log.agent_name}]:
                    </span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
