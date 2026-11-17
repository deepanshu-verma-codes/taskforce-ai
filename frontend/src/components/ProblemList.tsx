import React, { useState } from 'react';
import { Problem } from '../types';
import { Bot, CheckCircle2, Clock, Search, AlertCircle, ChevronRight, Database } from 'lucide-react';

interface ProblemListProps {
  problems: Problem[];
  selectedProblemId: string | null;
  onSelectProblem: (id: string) => void;
}

export const ProblemList: React.FC<ProblemListProps> = ({
  problems,
  selectedProblemId,
  onSelectProblem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');

  const filtered = problems.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterTab === 'PENDING') return matchesSearch && p.status !== 'RESOLVED';
    if (filterTab === 'RESOLVED') return matchesSearch && p.status === 'RESOLVED';
    return matchesSearch;
  });

  const resolvedCount = problems.filter(p => p.status === 'RESOLVED').length;
  const pendingCount = problems.length - resolvedCount;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] rounded-xl overflow-hidden shadow-xs dark:shadow-none transition-colors">
      {/* Search & Header */}
      <div className="p-3.5 border-b border-[#eaecef] dark:border-[#2b3139] bg-white dark:bg-[#1e2329] space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#707a8a]" />
          <input
            type="text"
            placeholder="Search problems or domains..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#f5f5f5] dark:bg-[#0b0e11] border border-[#eaecef] dark:border-[#2b3139] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#181a20] dark:text-[#eaecef] placeholder-[#707a8a] focus:outline-none focus:border-[#FCD535] transition-colors"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
              filterTab === 'ALL'
                ? 'bg-[#f0f2f5] dark:bg-[#2b3139] text-[#b8860b] dark:text-[#FCD535] font-semibold'
                : 'text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef] hover:bg-[#f5f5f5] dark:hover:bg-[#2b3139]/50'
            }`}
          >
            All Problems ({problems.length})
          </button>
          <button
            onClick={() => setFilterTab('PENDING')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
              filterTab === 'PENDING'
                ? 'bg-[#f0f2f5] dark:bg-[#2b3139] text-[#f6465d] font-semibold'
                : 'text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef] hover:bg-[#f5f5f5] dark:hover:bg-[#2b3139]/50'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab('RESOLVED')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
              filterTab === 'RESOLVED'
                ? 'bg-[#f0f2f5] dark:bg-[#2b3139] text-[#0ecb81] font-semibold'
                : 'text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef] hover:bg-[#f5f5f5] dark:hover:bg-[#2b3139]/50'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Problem Rows (Markets Table style) - Constrained to 10 items before scrolling */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#eaecef] dark:divide-[#2b3139] max-h-[580px]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#707a8a]">
            No problems matching criteria.
          </div>
        ) : (
          filtered.map(problem => {
            const isSelected = problem.id === selectedProblemId;
            const isResolved = problem.status === 'RESOLVED';
            const isInProgress = problem.status === 'IN_PROGRESS';

            return (
              <div
                key={problem.id}
                onClick={() => onSelectProblem(problem.id)}
                className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#f5f5f5] dark:bg-[#2b3139] border-l-2 border-[#FCD535]'
                    : 'hover:bg-[#f8f9fa] dark:hover:bg-[#2b3139]/40 border-l-2 border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4
                      className={`text-xs font-semibold truncate ${
                        isSelected
                          ? 'text-[#181a20] dark:text-white'
                          : 'text-[#181a20] dark:text-[#eaecef]'
                      }`}
                    >
                      {problem.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-[#707a8a]">
                    <span className="flex items-center gap-1">
                      <Bot className="h-3 w-3 text-[#707a8a]" />
                      {problem.agent_count} Agents
                    </span>
                    {Boolean(problem.has_rag && problem.document_name) && (
                      <span className="flex items-center gap-1 text-[#b8860b] dark:text-[#FCD535]">
                        <Database className="h-3 w-3" />
                        Qdrant RAG ({problem.document_name})
                      </span>
                    )}
                    {problem.total_cost > 0 && (
                      <span className="text-[#0ecb81]">
                        ${problem.total_cost.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Semantic Status */}
                <div className="shrink-0 flex items-center gap-1.5 font-mono text-xs">
                  {isResolved && (
                    <span className="text-[#0ecb81] flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      100%
                    </span>
                  )}
                  {isInProgress && (
                    <span className="text-[#b8860b] dark:text-[#FCD535] flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      Running
                    </span>
                  )}
                  {problem.status === 'PENDING' && (
                    <span className="text-[#f6465d] flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Queued
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-[#707a8a]" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer indicator when more than 10 items */}
      {filtered.length > 10 && (
        <div className="px-3 py-1.5 border-t border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#0b0e11] text-[10px] font-mono text-[#707a8a] flex items-center justify-between shrink-0">
          <span>{filtered.length} total problems (10 visible)</span>
          <span className="text-[#b8860b] dark:text-[#FCD535]">Scroll list for more ↓</span>
        </div>
      )}
    </div>
  );
};
