export interface AgentRun {
  id: string;
  agent_name: string;
  agent_role: string;
  status: string;
  iteration: number;
  input_summary?: string;
  output_content?: string;
  lead_feedback?: string;
  tokens_used: number;
  cost: number;
  latency_ms: number;
  created_at: string;
}

export interface AgentLog {
  id: string;
  problem_id: string;
  agent_name: string;
  event_type: 'DISPATCH' | 'THOUGHT' | 'CRITIQUE' | 'CORRECTION' | 'VERIFICATION' | 'COMPLETE' | 'INFO' | 'RAG_RETRIEVAL';
  message: string;
  metadata_json?: string;
  timestamp: string;
}

export interface EvaluationMetric {
  id: string;
  metric_name: string;
  score: number;
  rationale?: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  created_at: string;
  is_vip?: number;
  vip_granted_at?: string;
}

export interface UsernameCheckResult {
  available: boolean;
  username: string;
  message: string;
  suggestions: string[];
}

export interface Problem {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  code_snippet?: string;
  logs?: string;
  language: string;
  agent_count: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'FAILED' | 'COMPLETED';
  document_name?: string;
  has_rag?: number;
  rag_chunks_count?: number;
  tech_lead_verdict?: string;
  solution_patch?: string;
  solution_explanation?: string;
  verification_report?: string;
  quality_score: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost: number;
  duration_ms: number;
  langsmith_run_id?: string;
  created_at: string;
  updated_at: string;
  agent_runs?: AgentRun[];
  evaluations?: EvaluationMetric[];
}

export interface DashboardStats {
  total_problems: number;
  resolved_problems: number;
  in_progress_problems: number;
  total_tokens_consumed: number;
  total_estimated_cost: number;
  avg_resolution_time_ms: number;
  active_worker_agents: number;
  tech_lead_interventions_count: number;
}

export interface DocumentUploadResponse {
  filename: string;
  extracted_text: string;
  char_count: number;
  word_count: number;
  pages_count: number;
  preview_chunks: string[];
}

export interface GameAgentProfile {
  name: string;
  specialization: string;
  tagline: string;
  difficulty_tendency: string;
  avatar_color: string;
  offense: number;
  defense: number;
  foresight: number;
  opening_quote: string;
}

export interface GameMoveRequest {
  board: string[];
  agent_name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  player_symbol: 'X' | 'O';
  last_move?: number | null;
  match_id?: string | null;
}

export interface GameMoveResponse {
  agent_move: number;
  agent_name: string;
  commentary: string;
  tactical_insight: string;
  status: 'in_progress' | 'agent_won' | 'player_won' | 'draw';
  winning_line?: number[] | null;
}

export interface DailyQuotaStatus {
  action: 'game' | 'problem';
  used_today: number;
  daily_limit: number;
  remaining_today: number;
  is_exempt: boolean;
  username?: string | null;
  resets_at: string;
  message: string;
}

export interface GameScoreboard {
  playerWins: number;
  agentWins: number;
  draws: number;
  totalGames: number;
  currentStreak: number;
  bestStreak: number;
}

export interface VipUserItem {
  id: string;
  username: string;
  name: string;
  vip_granted_at?: string;
}

export interface VipStatusResponse {
  is_vip: boolean;
  is_owner: boolean;
  active_code?: string;
  vip_users?: VipUserItem[];
}
