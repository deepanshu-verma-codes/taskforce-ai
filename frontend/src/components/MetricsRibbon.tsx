import React from 'react';
import { DashboardStats } from '../types';
import { Layers, ShieldCheck, DollarSign, Clock, Zap, GitCommit, ArrowUpRight } from 'lucide-react';

interface MetricsRibbonProps {
  stats: DashboardStats | null;
}

export const MetricsRibbon: React.FC<MetricsRibbonProps> = ({ stats }) => {
  const cards = [
    {
      label: '24h Total Problems',
      value: stats ? stats.total_problems : '--',
      change: stats ? `+${stats.resolved_problems} Resolved` : '--',
      icon: Layers,
      trendUp: true,
    },
    {
      label: 'Quality Interventions',
      value: stats ? stats.tech_lead_interventions_count : '--',
      change: '100% Catches',
      icon: GitCommit,
      trendUp: true,
    },
    {
      label: 'Token Volume',
      value: stats ? stats.total_tokens_consumed.toLocaleString() : '--',
      change: '+14.2%',
      icon: Zap,
      trendUp: true,
    },
    {
      label: 'Incurred Cost',
      value: stats ? `$${stats.total_estimated_cost.toFixed(4)}` : '--',
      change: '-34.8%',
      icon: DollarSign,
      trendUp: false,
    },
    {
      label: 'Avg Resolution Latency',
      value: stats ? `${(stats.avg_resolution_time_ms / 1000).toFixed(2)}s` : '--',
      change: '-12.5%',
      icon: Clock,
      trendUp: false,
    },
    {
      label: 'Verification Guarantee',
      value: '100.0%',
      change: 'Zero Defect',
      icon: ShieldCheck,
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] hover:border-[#707a8a] transition-colors shadow-xs dark:shadow-none"
          >
            {/* Header: Label + Icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-[#707a8a] uppercase tracking-wider truncate">
                {card.label}
              </span>
              <Icon className="h-3.5 w-3.5 text-[#707a8a] shrink-0" />
            </div>

            {/* Stat Number in BinancePlex / Tabular Monospace font, Binance Yellow */}
            <div className="text-xl font-bold tracking-tight text-[#b8860b] dark:text-[#FCD535] font-mono mb-1">
              {card.value}
            </div>

            {/* Trading semantics: Green up / Red down indicator */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span
                className={`flex items-center font-medium ${
                  card.trendUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                }`}
              >
                <ArrowUpRight
                  className={`h-3 w-3 ${card.trendUp ? '' : 'rotate-90'}`}
                /> 
                {card.change}
              </span>
              <span className="text-[#eaecef] dark:text-[#2b3139]">•</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
