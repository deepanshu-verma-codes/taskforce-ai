import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Swords,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Flame,
  Bot,
  BrainCircuit,
  Award,
} from 'lucide-react';
import { GameAgentProfile, GameScoreboard, DailyQuotaStatus } from '../types';
import { fetchGameAgents, playGameMove, fetchGameQuota } from '../api';

interface TicTacToeGameProps {
  onBackToFloor: () => void;
  currentUser?: { name: string; username: string } | null;
  onOpenVipModal?: () => void;
}

const DEFAULT_AGENTS: GameAgentProfile[] = [
  {
    name: 'Marcus Vance',
    specialization: 'Team Lead & Meta-Supervisor',
    tagline: 'Mastermind tactician. Anticipates your moves before you place them.',
    difficulty_tendency: 'hard',
    avatar_color: '#FCD535',
    offense: 94,
    defense: 96,
    foresight: 98,
    opening_quote: "Let's see how your tactical reasoning holds under pressure.",
  },
  {
    name: 'Elena Rostova',
    specialization: 'Diagnostic Specialist',
    tagline: 'Isolates board topologies and uncovers hidden structural weaknesses.',
    difficulty_tendency: 'medium',
    avatar_color: '#00f0ff',
    offense: 88,
    defense: 90,
    foresight: 95,
    opening_quote: 'Scanning the grid for topological anomalies. Your move, Operator.',
  },
  {
    name: 'David Park',
    specialization: 'Software Craftsman & Solutions',
    tagline: 'Pragmatic, surgical moves designed with zero margin of error.',
    difficulty_tendency: 'medium',
    avatar_color: '#10b981',
    offense: 92,
    defense: 86,
    foresight: 89,
    opening_quote: "Clean execution and minimal blast radius. Let's solve this board.",
  },
  {
    name: 'Maya Patel',
    specialization: 'Quality & Boundary Validator',
    tagline: 'Edge-case specialist. Tests every corner and boundary condition.',
    difficulty_tendency: 'medium',
    avatar_color: '#a855f7',
    offense: 86,
    defense: 95,
    foresight: 91,
    opening_quote: 'Have you stress-tested your corners? Boundary check incoming.',
  },
  {
    name: 'James Thorne',
    specialization: 'Security & Risk Auditor',
    tagline: 'Zero-trust defensive fortress. Blocks lines before threats materialize.',
    difficulty_tendency: 'hard',
    avatar_color: '#ef4444',
    offense: 82,
    defense: 99,
    foresight: 90,
    opening_quote: 'Perimeter locked down. No unauthorized 3-in-a-row permitted.',
  },
  {
    name: 'Sarah Chen',
    specialization: 'Systems & Integration Architect',
    tagline: 'Macro-strategic architect. Controls board balance and long-term paths.',
    difficulty_tendency: 'medium',
    avatar_color: '#3b82f6',
    offense: 89,
    defense: 92,
    foresight: 96,
    opening_quote: 'Every placement must support long-term systemic stability.',
  },
];

// Helper to play synthesized Web Audio sound without external assets
function playTone(freq: number, type: OscillatorType = 'sine', duration = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // AudioContext not available or blocked
  }
}

// Client-side quick check for immediate winning condition
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: string[]): { winner: string | null; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

export const TicTacToeGame: React.FC<TicTacToeGameProps> = ({ onBackToFloor, currentUser, onOpenVipModal }) => {
  // Agents list
  const [agents, setAgents] = useState<GameAgentProfile[]>(DEFAULT_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<GameAgentProfile>(DEFAULT_AGENTS[0]);

  // Quota & Match ID State (5 games/day limit, deepanshu_verma exempt)
  const [quota, setQuota] = useState<DailyQuotaStatus | null>(null);
  const [matchId, setMatchId] = useState<string>(() => Math.random().toString(36).substring(2, 12));

  // Game Settings
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O'>('X');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Board State
  const [board, setBoard] = useState<string[]>(Array(9).fill(''));
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [gameStatus, setGameStatus] = useState<'idle' | 'in_progress' | 'player_won' | 'agent_won' | 'draw'>('idle');
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  // Agent Dialogue & Commentary
  const [commentary, setCommentary] = useState<string>(DEFAULT_AGENTS[0].opening_quote);
  const [tacticalInsight, setTacticalInsight] = useState<string>('Match initiated. Make your first move.');
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  // Confetti particles state
  const [confettiActive, setConfettiActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Scoreboard state with localStorage persistence
  const [scoreboard, setScoreboard] = useState<GameScoreboard>(() => {
    try {
      const saved = localStorage.getItem('taskforce_ttt_score');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      playerWins: 0,
      agentWins: 0,
      draws: 0,
      totalGames: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
  });

  const saveScoreboard = useCallback((updated: GameScoreboard) => {
    setScoreboard(updated);
    try {
      localStorage.setItem('taskforce_ttt_score', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }, []);

  // Fetch quota
  const loadQuota = useCallback(async () => {
    try {
      const q = await fetchGameQuota();
      setQuota(q);
    } catch {
      // Retain previous or default
    }
  }, []);

  useEffect(() => {
    loadQuota();
  }, [loadQuota]);

  // Fetch agents from backend on mount
  useEffect(() => {
    let isMounted = true;
    fetchGameAgents()
      .then(fetched => {
        if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
          setAgents(fetched);
          setSelectedAgent(prev => fetched.find(a => a.name === prev.name) || fetched[0]);
        }
      })
      .catch(() => {
        // Retain default agents
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Confetti Animation when Player Wins
  useEffect(() => {
    if (!confettiActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FCD535', '#f0b90b', '#00f0ff', '#10b981', '#ffffff', '#e02424'];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      rotation: number;
      vRot: number;
    }> = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.4 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
      });
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // Gravity
        p.rotation += p.vRot;
        p.alpha -= 0.008;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (alive) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        setConfettiActive(false);
      }
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [confettiActive]);

  // Reset / Rematch
  const handleStartNewMatch = useCallback(
    async (newAgent?: GameAgentProfile, newSymbol?: 'X' | 'O') => {
      const activeAgent = newAgent || selectedAgent;
      const activeSymbol = newSymbol || playerSymbol;
      const newMatchId = Math.random().toString(36).substring(2, 12);
      setMatchId(newMatchId);

      const emptyBoard = Array(9).fill('');
      setBoard(emptyBoard);
      setWinningLine(null);
      setConfettiActive(false);
      setCommentary(activeAgent.opening_quote);
      setTacticalInsight('Match initialized. Place your move on any open tile.');

      if (activeSymbol === 'O') {
        // Agent plays first as 'X'
        setIsAgentThinking(true);
        setGameStatus('in_progress');
        try {
          const res = await playGameMove({
            board: emptyBoard,
            agent_name: activeAgent.name,
            difficulty,
            player_symbol: 'O',
            match_id: newMatchId,
          });
          const nextBoard = [...emptyBoard];
          nextBoard[res.agent_move] = 'X';
          setBoard(nextBoard);
          setCommentary(res.commentary);
          setTacticalInsight(res.tactical_insight);
          if (soundEnabled) playTone(330, 'sine', 0.15);
          loadQuota();
        } catch (err) {
          console.error('Agent move failed:', err);
          // Fallback opening
          const nextBoard = [...emptyBoard];
          nextBoard[4] = 'X';
          setBoard(nextBoard);
          setCommentary('Central corridor secured. Your move, Operator.');
          loadQuota();
        } finally {
          setIsAgentThinking(false);
        }
      } else {
        setGameStatus('idle');
      }
    },
    [difficulty, loadQuota, playerSymbol, selectedAgent, soundEnabled]
  );

  // Switch agent
  const handleSelectAgent = (agent: GameAgentProfile) => {
    setSelectedAgent(agent);
    handleStartNewMatch(agent);
  };

  // Player clicks a tile
  const handleCellClick = async (index: number) => {
    if (
      board[index] !== '' ||
      isAgentThinking ||
      gameStatus === 'player_won' ||
      gameStatus === 'agent_won' ||
      gameStatus === 'draw'
    ) {
      return;
    }

    if (quota && !quota.is_exempt && quota.remaining_today <= 0) {
      setTacticalInsight(
        `Daily limit reached (${quota.daily_limit}/${quota.daily_limit} games played). Quota resets at midnight UTC.`
      );
      return;
    }

    if (soundEnabled) playTone(480, 'sine', 0.1);

    // 1. Optimistic player move
    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    setBoard(newBoard);
    setGameStatus('in_progress');

    // 2. Client-side check if player won immediately
    const check = checkWinner(newBoard);
    if (check.winner === playerSymbol) {
      setWinningLine(check.line);
      setGameStatus('player_won');
      setConfettiActive(true);
      setCommentary(
        `Outstanding execution! You broke through my defense. A well-earned victory, Operator!`
      );
      setTacticalInsight(`Player formed 3-in-a-row on cells [${check.line?.join(', ')}].`);

      if (soundEnabled) {
        setTimeout(() => playTone(523, 'triangle', 0.12), 0);
        setTimeout(() => playTone(659, 'triangle', 0.14), 100);
        setTimeout(() => playTone(784, 'triangle', 0.25), 220);
      }

      saveScoreboard({
        ...scoreboard,
        playerWins: scoreboard.playerWins + 1,
        totalGames: scoreboard.totalGames + 1,
        currentStreak: scoreboard.currentStreak + 1,
        bestStreak: Math.max(scoreboard.bestStreak, scoreboard.currentStreak + 1),
      });
      return;
    }

    // 3. Client-side check if board is full (Draw)
    if (newBoard.every(cell => cell !== '')) {
      setGameStatus('draw');
      setCommentary('Stalemate verified. A true peer-to-peer equilibrium on the grid.');
      setTacticalInsight('All 9 cells occupied with zero 3-in-a-row lines. Draw.');
      if (soundEnabled) playTone(280, 'sine', 0.2);

      saveScoreboard({
        ...scoreboard,
        draws: scoreboard.draws + 1,
        totalGames: scoreboard.totalGames + 1,
        currentStreak: 0,
      });
      return;
    }

    // 4. Send move to Agent via Backend API
    setIsAgentThinking(true);
    try {
      const res = await playGameMove({
        board: newBoard,
        agent_name: selectedAgent.name,
        difficulty,
        player_symbol: playerSymbol,
        last_move: index,
        match_id: matchId,
      });

      const updatedBoard = [...newBoard];
      const aiSymbol = playerSymbol === 'X' ? 'O' : 'X';
      updatedBoard[res.agent_move] = aiSymbol;
      setBoard(updatedBoard);

      setCommentary(res.commentary);
      setTacticalInsight(res.tactical_insight);
      loadQuota();

      if (soundEnabled) playTone(350, 'sine', 0.12);

      if (res.status === 'agent_won') {
        setGameStatus('agent_won');
        setWinningLine(res.winning_line || null);
        if (soundEnabled) playTone(220, 'sawtooth', 0.3);

        saveScoreboard({
          ...scoreboard,
          agentWins: scoreboard.agentWins + 1,
          totalGames: scoreboard.totalGames + 1,
          currentStreak: 0,
        });
      } else if (res.status === 'draw') {
        setGameStatus('draw');
        if (soundEnabled) playTone(280, 'sine', 0.2);

        saveScoreboard({
          ...scoreboard,
          draws: scoreboard.draws + 1,
          totalGames: scoreboard.totalGames + 1,
          currentStreak: 0,
        });
      }
    } catch (err: unknown) {
      console.error('Failed to get agent move:', err);
      const msg = err instanceof Error ? err.message : 'Daily game limit reached or move failed';
      setTacticalInsight(msg);
      loadQuota();
      // If quota blocked, revert optimistic move
      const revertedBoard = [...board];
      setBoard(revertedBoard);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleResetScoreboard = () => {
    const resetData: GameScoreboard = {
      playerWins: 0,
      agentWins: 0,
      draws: 0,
      totalGames: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
    saveScoreboard(resetData);
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6 flex flex-col font-sans transition-colors">
      {/* Confetti Overlay Canvas */}
      {confettiActive && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-50 w-full h-full"
        />
      )}

      {/* Top Breadcrumb & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#eaecef] dark:border-[#2b3139]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToFloor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#181a20] dark:text-[#eaecef] border border-[#eaecef] dark:border-[#2b3139] text-xs font-medium cursor-pointer transition-colors"
            title="Return to Problem Resolution Floor"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Problem Floor</span>
          </button>
          <div className="h-4 w-px bg-[#eaecef] dark:bg-[#2b3139]" />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#b8860b] dark:text-[#FCD535] bg-[#FCD535]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <Gamepad2 className="h-3.5 w-3.5" />
              Autonomous Arena
            </span>
            <span className="text-xs text-[#707a8a] hidden md:inline">
              Tic-Tac-Toe vs Swarm Specialists
            </span>
          </div>
        </div>

        {/* Global Sound, Quota & Reset Options */}
        <div className="flex items-center gap-2">
          {/* VIP Unlimited Badge vs Daily Quota Badge */}
          {quota?.is_exempt || (currentUser && (currentUser.username.toLowerCase() === 'deepanshu_verma' || currentUser.username.toLowerCase() === 'deepanshu-verma')) ? (
            <button
              type="button"
              onClick={onOpenVipModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FCD535]/15 hover:bg-[#FCD535]/25 text-[#b8860b] dark:text-[#FCD535] border border-[#b8860b] dark:border-[#FCD535]/40 text-xs font-bold shadow-xs cursor-pointer transition-colors"
              title={
                currentUser && (currentUser.username.toLowerCase() === 'deepanshu_verma' || currentUser.username.toLowerCase() === 'deepanshu-verma')
                  ? "Exclusive Owner Account: Zero daily game limits or token constraints (Click to open VIP Admin Console)"
                  : "VIP Unlimited Games Active (Click to view details)"
              }
            >
              <Sparkles className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
              <span>VIP Unlimited Games</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenVipModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
                quota && quota.remaining_today <= 0
                  ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]'
                  : 'bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] border-[#eaecef] dark:border-[#2b3139] text-[#707a8a]'
              }`}
              title="Daily game limit (5 games/day) resets at midnight UTC. Click to enter VIP access code for unlimited games."
            >
              <Shield className="h-3.5 w-3.5 text-[#00f0ff]" />
              <span>
                Daily Games: {quota ? quota.remaining_today : 5} / {quota ? quota.daily_limit : 5} left
              </span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#707a8a] hover:text-[#181a20] dark:hover:text-white border border-[#eaecef] dark:border-[#2b3139] text-xs font-medium cursor-pointer transition-colors"
            title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-[#10b981]" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          <button
            onClick={() => handleStartNewMatch()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] font-semibold text-xs cursor-pointer shadow-sm transition-colors"
            title="Restart Match (R)"
          >
            <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>New Match</span>
          </button>
        </div>
      </div>

      {/* Hero / Arena Overview */}
      <div className="mb-6 p-4 md:p-5 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#181a20] dark:text-white flex items-center gap-2">
              Tic-Tac-Toe Arena <span className="text-[#FCD535]">.ai</span>
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
              Live Interactive
            </span>
          </div>
          <p className="text-xs text-[#707a8a] max-w-2xl">
            Challenge one of our 6 autonomous AI specialists. In{' '}
            <strong className="text-[#181a20] dark:text-[#eaecef]">Tactical mode</strong>, the agent
            deploys strategic moves while providing legitimate openings for you to engineer a fork,
            break their perimeter, and{' '}
            <span className="text-[#b8860b] dark:text-[#FCD535] font-semibold underline decoration-[#FCD535]/50">
              try to win!
            </span>
          </p>
        </div>

        {/* Live Scoreboard Summary Cards */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-[#f5f5f5] dark:bg-[#14181f] border border-[#eaecef] dark:border-[#2b3139] flex flex-col items-center min-w-[70px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#10b981]">
              {currentUser?.name ? currentUser.name.split(' ')[0] : 'Player'}
            </span>
            <span className="text-lg font-bold text-[#181a20] dark:text-white">
              {scoreboard.playerWins}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-[#f5f5f5] dark:bg-[#14181f] border border-[#eaecef] dark:border-[#2b3139] flex flex-col items-center min-w-[70px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#ef4444]">
              Agent
            </span>
            <span className="text-lg font-bold text-[#181a20] dark:text-white">
              {scoreboard.agentWins}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-[#f5f5f5] dark:bg-[#14181f] border border-[#eaecef] dark:border-[#2b3139] flex flex-col items-center min-w-[70px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707a8a]">
              Draws
            </span>
            <span className="text-lg font-bold text-[#181a20] dark:text-white">
              {scoreboard.draws}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-[#FCD535]/10 border border-[#FCD535]/30 flex flex-col items-center min-w-[80px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#b8860b] dark:text-[#FCD535] flex items-center gap-1">
              <Flame className="h-3 w-3 fill-current text-[#FCD535]" />
              Streak
            </span>
            <span className="text-lg font-bold text-[#b8860b] dark:text-[#FCD535]">
              {scoreboard.currentStreak}x
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Arena & Board, Right = Opponent Selection & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================================================================== */}
        {/* LEFT COLUMN: 3x3 Grid & Live Tactical Dialogue (7 cols)             */}
        {/* ==================================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Active Opponent Banner */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base shadow-sm shrink-0 border"
                style={{
                  backgroundColor: `${selectedAgent.avatar_color}20`,
                  color: selectedAgent.avatar_color,
                  borderColor: `${selectedAgent.avatar_color}50`,
                }}
              >
                {selectedAgent.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#181a20] dark:text-white">
                    {selectedAgent.name}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#f5f5f5] dark:bg-[#2b3139] text-[#707a8a]">
                    {selectedAgent.specialization}
                  </span>
                </div>
                <p className="text-xs text-[#707a8a] line-clamp-1">{selectedAgent.tagline}</p>
              </div>
            </div>

            {/* Game Status Indicator Pill */}
            <div className="shrink-0">
              {isAgentThinking ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 text-xs font-semibold animate-pulse">
                  <Bot className="h-3.5 w-3.5 animate-spin" />
                  <span>Calculating...</span>
                </div>
              ) : gameStatus === 'player_won' ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 text-xs font-bold animate-bounce">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>You Won!</span>
                </div>
              ) : gameStatus === 'agent_won' ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/40 text-xs font-bold">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Agent Won</span>
                </div>
              ) : gameStatus === 'draw' ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#707a8a]/15 text-[#707a8a] border border-[#707a8a]/40 text-xs font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Stalemate</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] border border-[#FCD535]/40 text-xs font-semibold">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Your Turn</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive 3x3 Tic-Tac-Toe Grid */}
          <div className="p-6 md:p-8 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs flex flex-col items-center justify-center relative overflow-hidden">
            {/* Daily Quota Exhausted Alert Banner */}
            {quota && !quota.is_exempt && quota.remaining_today <= 0 && (
              <div className="w-full max-w-md mb-4 p-3.5 rounded-lg bg-[#fff5f5] dark:bg-[#2b1f24] border border-[#fed7d7] dark:border-[#f6465d]/40 flex items-center justify-between text-xs text-[#f6465d]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Daily game limit reached (5/5 games). Quota resets at midnight UTC to protect agent compute tokens.</span>
                </div>
                <span className="font-mono text-[10px] text-[#707a8a] shrink-0 ml-2">0 left</span>
              </div>
            )}

            {/* Victory / Defeat Overlay Banner */}
            {gameStatus !== 'idle' && gameStatus !== 'in_progress' && (
              <div
                className={`w-full max-w-md mb-4 p-3 rounded-lg border text-center transition-all ${
                  gameStatus === 'player_won'
                    ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]'
                    : gameStatus === 'agent_won'
                    ? 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#ef4444]'
                    : 'bg-[#f5f5f5] dark:bg-[#2b3139] border-[#eaecef] dark:border-[#3b414d] text-[#707a8a]'
                }`}
              >
                <div className="text-sm font-bold flex items-center justify-center gap-1.5">
                  {gameStatus === 'player_won' && (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Defensive Perimeter Breached! Victory Achieved!</span>
                    </>
                  )}
                  {gameStatus === 'agent_won' && (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>{selectedAgent.name} Closed the 3-in-a-Row Vector!</span>
                    </>
                  )}
                  {gameStatus === 'draw' && (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Complete Deadlock! Mutual Deterrence Verified.</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* The 3x3 Tile Matrix */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 w-full max-w-[360px] aspect-square">
              {board.map((cellValue, idx) => {
                const isWinningCell = winningLine?.includes(idx);
                const isOccupied = cellValue !== '';

                return (
                  <button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    onMouseEnter={() => setHoveredCell(idx)}
                    onMouseLeave={() => setHoveredCell(null)}
                    disabled={
                      isOccupied ||
                      isAgentThinking ||
                      gameStatus === 'player_won' ||
                      gameStatus === 'agent_won' ||
                      gameStatus === 'draw' ||
                      (quota !== null && !quota.is_exempt && quota.remaining_today <= 0)
                    }
                    className={`aspect-square rounded-xl flex items-center justify-center text-4xl md:text-5xl font-black transition-all cursor-pointer select-none relative group ${
                      isWinningCell
                        ? 'bg-[#10b981]/20 border-2 border-[#10b981] shadow-lg shadow-[#10b981]/20 scale-[1.03]'
                        : isOccupied
                        ? 'bg-[#f8f9fa] dark:bg-[#14181f] border border-[#eaecef] dark:border-[#2b3139]'
                        : 'bg-[#ffffff] dark:bg-[#252b35] hover:bg-[#f5f5f5] dark:hover:bg-[#2b3139] border-2 border-[#eaecef] dark:border-[#2b3139] hover:border-[#FCD535]/60 hover:scale-[1.02] shadow-xs'
                    }`}
                  >
                    {/* Render Symbol */}
                    {cellValue === 'X' ? (
                      <span className="text-[#b8860b] dark:text-[#FCD535] drop-shadow-xs animate-in zoom-in-75 duration-150">
                        X
                      </span>
                    ) : cellValue === 'O' ? (
                      <span className="text-[#00f0ff] drop-shadow-xs animate-in zoom-in-75 duration-150">
                        O
                      </span>
                    ) : (
                      // Ghost hover preview
                      hoveredCell === idx &&
                      !isAgentThinking &&
                      (gameStatus === 'idle' || gameStatus === 'in_progress') && (
                        <span className="text-[#b8860b]/30 dark:text-[#FCD535]/30">
                          {playerSymbol}
                        </span>
                      )
                    )}

                    {/* Cell Coordinate Pill (Subtle technical aesthetic) */}
                    <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-[#707a8a]/40 group-hover:text-[#707a8a]/80">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Match Action Bar */}
            <div className="flex items-center justify-between w-full max-w-[360px] mt-6 pt-4 border-t border-[#eaecef] dark:border-[#2b3139]">
              <span className="text-xs text-[#707a8a]">
                Playing as:{' '}
                <strong
                  className={
                    playerSymbol === 'X' ? 'text-[#b8860b] dark:text-[#FCD535]' : 'text-[#00f0ff]'
                  }
                >
                  {playerSymbol}
                </strong>{' '}
                ({playerSymbol === 'X' ? 'You start' : 'Agent starts'})
              </span>
              <button
                onClick={() => handleStartNewMatch()}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#b8860b] dark:text-[#FCD535] hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Rematch</span>
              </button>
            </div>
          </div>

          {/* Live Agent Persona Dialogue & Tactical Insight */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs">
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                style={{
                  backgroundColor: `${selectedAgent.avatar_color}20`,
                  color: selectedAgent.avatar_color,
                }}
              >
                {selectedAgent.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#181a20] dark:text-white">
                    {selectedAgent.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#707a8a]">Persona Radio</span>
                </div>
                {/* Speech bubble */}
                <div className="p-3 rounded-lg bg-[#f5f5f5] dark:bg-[#14181f] border border-[#eaecef] dark:border-[#2b3139] text-xs text-[#181a20] dark:text-[#eaecef] leading-relaxed relative">
                  "{commentary}"
                </div>
                {/* Tactical Insight Badge */}
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#707a8a]">
                  <BrainCircuit className="h-3.5 w-3.5 text-[#00f0ff] shrink-0" />
                  <span>{tacticalInsight}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: Opponent Selection, Game Controls & Stats (5 cols)   */}
        {/* ==================================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Difficulty & Symbol Match Setup */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#707a8a] mb-3 flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
              Match Rules & Tuning
            </h3>

            {/* Difficulty Selector */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#181a20] dark:text-[#eaecef] mb-1.5">
                Tactical Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'medium', label: 'Tactical', desc: 'Try to Win!' },
                    { id: 'hard', label: 'Grandmaster', desc: 'Unbeatable' },
                    { id: 'easy', label: 'Casual', desc: 'Relaxed' },
                  ] as const
                ).map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setDifficulty(mode.id);
                      handleStartNewMatch();
                    }}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      difficulty === mode.id
                        ? 'bg-[#FCD535]/15 border-[#b8860b] dark:border-[#FCD535] text-[#181a20] dark:text-white'
                        : 'bg-[#f5f5f5] dark:bg-[#14181f] border-[#eaecef] dark:border-[#2b3139] text-[#707a8a] hover:border-[#707a8a]'
                    }`}
                  >
                    <div className="text-xs font-bold">{mode.label}</div>
                    <div className="text-[10px] text-[#707a8a]">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Symbol Chooser */}
            <div>
              <label className="block text-xs font-semibold text-[#181a20] dark:text-[#eaecef] mb-1.5">
                Play As
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setPlayerSymbol('X');
                    handleStartNewMatch(undefined, 'X');
                  }}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    playerSymbol === 'X'
                      ? 'bg-[#FCD535]/15 border-[#b8860b] dark:border-[#FCD535] text-[#181a20] dark:text-white'
                      : 'bg-[#f5f5f5] dark:bg-[#14181f] border-[#eaecef] dark:border-[#2b3139] text-[#707a8a]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-[#b8860b] dark:text-[#FCD535]">
                      X
                    </span>
                    <span className="text-xs font-semibold">You Start First</span>
                  </div>
                  {playerSymbol === 'X' && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setPlayerSymbol('O');
                    handleStartNewMatch(undefined, 'O');
                  }}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    playerSymbol === 'O'
                      ? 'bg-[#00f0ff]/15 border-[#00f0ff] text-[#181a20] dark:text-white'
                      : 'bg-[#f5f5f5] dark:bg-[#14181f] border-[#eaecef] dark:border-[#2b3139] text-[#707a8a]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-[#00f0ff]">O</span>
                    <span className="text-xs font-semibold">Agent Starts</span>
                  </div>
                  {playerSymbol === 'O' && <CheckCircle2 className="h-3.5 w-3.5 text-[#00f0ff]" />}
                </button>
              </div>
            </div>
          </div>

          {/* Opponent Agent Roster Selection */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#707a8a] flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-[#00f0ff]" />
                Select Agent Opponent
              </h3>
              <span className="text-[10px] text-[#707a8a]">6 Autonomous Specialists</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
              {agents.map(agent => {
                const isSelected = selectedAgent.name === agent.name;

                return (
                  <button
                    key={agent.name}
                    onClick={() => handleSelectAgent(agent)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#f5f5f5] dark:bg-[#252b35] border-[#b8860b] dark:border-[#FCD535] shadow-xs'
                        : 'bg-white dark:bg-[#14181f] border-[#eaecef] dark:border-[#2b3139] hover:border-[#707a8a]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                        style={{
                          backgroundColor: `${agent.avatar_color}25`,
                          color: agent.avatar_color,
                        }}
                      >
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#181a20] dark:text-white">
                            {agent.name}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FCD535]/20 text-[#b8860b] dark:text-[#FCD535]">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#707a8a] line-clamp-1">
                          {agent.specialization}
                        </span>
                      </div>
                    </div>

                    {/* Tactical Rating Radar Pill */}
                    <div className="flex items-center gap-1 text-[10px] font-mono text-[#707a8a]">
                      <span title="Defense Rating">🛡️ {agent.defense}</span>
                      <span className="text-[#eaecef] dark:text-[#2b3139]">|</span>
                      <span title="Foresight Rating">🧠 {agent.foresight}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Stats & Streak Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] flex items-center justify-center font-bold">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#181a20] dark:text-white">
                  Best Win Streak:{' '}
                  <span className="text-[#b8860b] dark:text-[#FCD535]">
                    {scoreboard.bestStreak}x
                  </span>
                </span>
                <p className="text-[11px] text-[#707a8a]">
                  Total Rounds Completed: {scoreboard.totalGames}
                </p>
              </div>
            </div>

            <button
              onClick={handleResetScoreboard}
              className="text-[11px] text-[#707a8a] hover:text-[#ef4444] cursor-pointer hover:underline"
              title="Reset win/loss scoreboard"
            >
              Reset Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
