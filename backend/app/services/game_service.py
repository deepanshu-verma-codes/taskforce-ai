"""Tic-Tac-Toe Autonomous Arena Service.

Orchestrates multi-agent gameplay with Marcus Vance, Elena Rostova,
David Park, Maya Patel, James Thorne, and Sarah Chen. Supports customizable
difficulties ("easy", "medium", "hard") engineered so players can test their
skills and strategically win ("try to win!"). Includes real-time persona banter
and tactical insights.
"""

from __future__ import annotations

import random

from app.schemas import GameAgentProfile, GameMoveResponse

WINNING_COMBINATIONS: list[list[int]] = [
    [0, 1, 2],  # Top row
    [3, 4, 5],  # Middle row
    [6, 7, 8],  # Bottom row
    [0, 3, 6],  # Left column
    [1, 4, 7],  # Center column
    [2, 5, 8],  # Right column
    [0, 4, 8],  # Top-left to bottom-right diagonal
    [2, 4, 6],  # Top-right to bottom-left diagonal
]

AGENT_PROFILES: dict[str, GameAgentProfile] = {
    "Marcus Vance": GameAgentProfile(
        name="Marcus Vance",
        specialization="Team Lead & Meta-Supervisor",
        tagline="Mastermind tactician. Anticipates your moves before you place them.",
        difficulty_tendency="hard",
        avatar_color="#FCD535",
        offense=94,
        defense=96,
        foresight=98,
        opening_quote="Let's see how your tactical reasoning holds under pressure.",
    ),
    "Elena Rostova": GameAgentProfile(
        name="Elena Rostova",
        specialization="Diagnostic Specialist",
        tagline="Isolates board topologies and uncovers hidden structural weaknesses.",
        difficulty_tendency="medium",
        avatar_color="#00f0ff",
        offense=88,
        defense=90,
        foresight=95,
        opening_quote="Scanning the grid for topological anomalies. Your move, Operator.",
    ),
    "David Park": GameAgentProfile(
        name="David Park",
        specialization="Software Craftsman & Solutions",
        tagline="Pragmatic, surgical moves designed with zero margin of error.",
        difficulty_tendency="medium",
        avatar_color="#10b981",
        offense=92,
        defense=86,
        foresight=89,
        opening_quote="Clean execution and minimal blast radius. Let's solve this board.",
    ),
    "Maya Patel": GameAgentProfile(
        name="Maya Patel",
        specialization="Quality & Boundary Validator",
        tagline="Edge-case specialist. Tests every corner and boundary condition.",
        difficulty_tendency="medium",
        avatar_color="#a855f7",
        offense=86,
        defense=95,
        foresight=91,
        opening_quote="Have you stress-tested your corners? Boundary check incoming.",
    ),
    "James Thorne": GameAgentProfile(
        name="James Thorne",
        specialization="Security & Risk Auditor",
        tagline="Zero-trust defensive fortress. Blocks lines before threats materialize.",
        difficulty_tendency="hard",
        avatar_color="#ef4444",
        offense=82,
        defense=99,
        foresight=90,
        opening_quote="Perimeter locked down. No unauthorized 3-in-a-row permitted.",
    ),
    "Sarah Chen": GameAgentProfile(
        name="Sarah Chen",
        specialization="Systems & Integration Architect",
        tagline="Macro-strategic architect. Controls board balance and long-term paths.",
        difficulty_tendency="medium",
        avatar_color="#3b82f6",
        offense=89,
        defense=92,
        foresight=96,
        opening_quote="Every placement must support long-term systemic stability.",
    ),
}


def get_all_agents() -> list[GameAgentProfile]:
    """Returns the list of available agent opponents."""
    return list(AGENT_PROFILES.values())


def check_winner(board: list[str]) -> tuple[str | None, list[int] | None]:
    """Evaluates the board for a 3-in-a-row winner.

    Returns (winner_symbol, winning_line) or (None, None).
    """
    for line in WINNING_COMBINATIONS:
        c0, c1, c2 = line
        if board[c0] and board[c0] == board[c1] == board[c2]:
            return board[c0], line
    return None, None


def is_board_full(board: list[str]) -> bool:
    """Returns True if every cell on the board is occupied."""
    return all(cell != "" for cell in board)


def get_available_moves(board: list[str]) -> list[int]:
    """Returns indices of unoccupied cells."""
    return [i for i, cell in enumerate(board) if cell == ""]


def minimax(
    board: list[str],
    depth: int,
    is_maximizing: bool,
    ai_symbol: str,
    player_symbol: str,
    alpha: float,
    beta: float,
) -> tuple[float, int | None]:
    """Classic Minimax algorithm with Alpha-Beta pruning for optimal Tic-Tac-Toe play."""
    winner, _ = check_winner(board)
    if winner == ai_symbol:
        return 10.0 - depth, None
    if winner == player_symbol:
        return depth - 10.0, None
    if is_board_full(board):
        return 0.0, None

    available = get_available_moves(board)

    if is_maximizing:
        max_eval = -100.0
        best_move: int | None = available[0] if available else None
        for move in available:
            board[move] = ai_symbol
            eval_score, _ = minimax(
                board, depth + 1, False, ai_symbol, player_symbol, alpha, beta
            )
            board[move] = ""
            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move
            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break
        return max_eval, best_move
    else:
        min_eval = 100.0
        best_move = available[0] if available else None
        for move in available:
            board[move] = player_symbol
            eval_score, _ = minimax(board, depth + 1, True, ai_symbol, player_symbol, alpha, beta)
            board[move] = ""
            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move
            beta = min(beta, eval_score)
            if beta <= alpha:
                break
        return min_eval, best_move


def find_winning_move(board: list[str], symbol: str) -> int | None:
    """Finds an immediate winning move for the given symbol, if one exists."""
    for move in get_available_moves(board):
        board[move] = symbol
        winner, _ = check_winner(board)
        board[move] = ""
        if winner == symbol:
            return move
    return None


def calculate_agent_move(
    board: list[str],
    agent_name: str,
    difficulty: str,
    ai_symbol: str,
    player_symbol: str,
) -> tuple[int, str, bool]:
    """Calculates the agent's next move based on difficulty and persona tendencies.

    Returns:
        (move_index, tactical_insight, was_deliberate_blunder)
    """
    available = get_available_moves(board)
    if not available:
        return 0, "No available moves.", False

    diff = difficulty.lower()

    # --- 1. Immediate Win Check (Greedy) ---
    ai_win_move = find_winning_move(board, ai_symbol)
    if ai_win_move is not None:
        # On easy, agent might miss a win 30% of time; on medium 10%; on hard never
        miss_chance = 0.30 if diff == "easy" else (0.10 if diff == "medium" else 0.0)
        if random.random() >= miss_chance:
            return (
                ai_win_move,
                f"{agent_name} detected an immediate closing vector and took the win.",
                False,
            )

    # --- 2. Immediate Block Check ---
    player_win_move = find_winning_move(board, player_symbol)
    if player_win_move is not None:
        # Crucial for "try to win":
        # On medium: 20% blunder rate on blocking (leaves an opening for the player!).
        # On easy: 50% blunder rate.
        # On hard: 0% blunder rate (agent always blocks).
        miss_block_chance = 0.50 if diff == "easy" else (0.20 if diff == "medium" else 0.0)
        if random.random() < miss_block_chance:
            # Deliberate blunder: pick another valid move, leaving the opening!
            other_moves = [m for m in available if m != player_win_move]
            if other_moves:
                chosen = random.choice(other_moves)
                return (
                    chosen,
                    f"{agent_name} focused on flank positioning, leaving a narrow opening.",
                    True,
                )
        return (
            player_win_move,
            f"{agent_name} identified your 3-in-a-row threat and executed a defensive block.",
            False,
        )

    # --- 3. Positional Strategy by Difficulty ---
    if diff == "easy":
        # 40% optimal minimax, 60% random choice
        if random.random() < 0.40:
            _, best = minimax(board, 0, True, ai_symbol, player_symbol, -100.0, 100.0)
            chosen = best if best is not None else random.choice(available)
        else:
            chosen = random.choice(available)
        return (
            chosen,
            f"{agent_name} made an exploratory positional play.",
            False,
        )

    if diff == "medium":
        # "Tactical Challenger" (Allows strategic human wins with forks and corners):
        # 75% optimal minimax, 25% preferred heuristic (center, corners, edges)
        if random.random() < 0.75:
            _, best = minimax(board, 0, True, ai_symbol, player_symbol, -100.0, 100.0)
            chosen = best if best is not None else random.choice(available)
            return (
                chosen,
                f"{agent_name} applied minimax trajectory modeling.",
                False,
            )
        else:
            # Heuristic preference
            corners = [0, 2, 6, 8]
            available_corners = [c for c in corners if c in available]
            if 4 in available and random.random() < 0.6:
                chosen = 4
                insight = f"{agent_name} seized central grid control."
            elif available_corners:
                chosen = random.choice(available_corners)
                insight = f"{agent_name} occupied a strategic corner cell."
            else:
                chosen = random.choice(available)
                insight = f"{agent_name} played along the boundary perimeter."
            return chosen, insight, False

    # Hard (Grandmaster / Unbeatable)
    _, best = minimax(board, 0, True, ai_symbol, player_symbol, -100.0, 100.0)
    chosen = best if best is not None else random.choice(available)
    return (
        chosen,
        f"{agent_name} computed the optimal game-tree response.",
        False,
    )


PERSONA_COMMENTARY: dict[str, dict[str, list[str]]] = {
    "Marcus Vance": {
        "move": [
            "A calculated placement. Let's see if your flanks hold.",
            "Analyzing your structural topology. Center and flanks secured.",
            "Defensive alignment verified. Your move, Operator.",
            "Strategic branch established. The game is evolving as planned.",
            "A solid response. Let's test your resilience against this vector.",
        ],
        "block": [
            "Intervention required: your vertical threat has been neutralized.",
            "Perimeter check triggered. I've intercepted your 3-in-a-row attempt.",
            "Nice setup, but the Tech Lead doesn't miss obvious attack vectors.",
        ],
        "blunder": [
            "My telemetry detected an anomaly—I left a brief gap in my defense.",
            "An unexpected variable distracted my calculation. The board is open.",
        ],
        "agent_won": [
            "Perimeter secured. My strategic vector closed the loop. Commendable effort, Operator.",
            "Resolution signed off with 100% verification. Better luck on the next deployment!",
            "Game tree fully traversed. Victory achieved according to specification.",
        ],
        "player_won": [
            "Defensive perimeter breached! Outstanding tactical execution, Operator. You outmaneuvered me.",
            "Impressive foresight! You exploited a blind spot in my defense. A well-earned victory.",
            "Exceptional game! My supervisory tree failed to contain your dual-fork. Well played!",
        ],
        "draw": [
            "Stalemate verified. A true peer-to-peer equilibrium on the grid.",
            "Deadlock confirmed. Both state machines executed with zero margin of error.",
            "Mutual deterrence achieved. Neither party conceded a single cell.",
        ],
    },
    "Elena Rostova": {
        "move": [
            "Diagnostic scan complete. Placing marker at strategic intersection.",
            "Isolating causal paths. Your corner pressure is being neutralized.",
            "Pattern recognition active: reading your sequential habits.",
            "Structural integrity intact. Analyzing your next possible permutation.",
        ],
        "block": [
            "Root-cause alert: your winning vector was detected and patched.",
            "Diagnostic interception complete. Threat eliminated.",
            "I saw that attack vector two steps ago. Blocked.",
        ],
        "blunder": [
            "Transient telemetry glitch! My diagnostic models missed that flank.",
            "Fascinating anomaly... I may have overlooked a critical boundary.",
        ],
        "agent_won": [
            "Causal trajectory closed. My diagnostic scan spotted the winning diagonal early.",
            "Root-cause resolution achieved. Flawless execution across the grid.",
        ],
        "player_won": [
            "Diagnostic verified: your attack was mathematically sound. You broke through my model!",
            "Incredible play! You crafted a pattern that bypassed my diagnostic sensors.",
        ],
        "draw": [
            "Zero variance detected. Both state machines reached balanced saturation.",
            "Equilibrium confirmed. Neither side left an exploitable vulnerability.",
        ],
    },
    "David Park": {
        "move": [
            "Clean patch applied to the grid. Minimal blast radius.",
            "Surgical placement. Keeping the lines maintainable and tight.",
            "Refactoring the board state. Let's see your response.",
            "Fast commit. Your turn to compile.",
        ],
        "block": [
            "Hotfix deployed! Your winning line has been prevented.",
            "Defensive guard clause activated. No 3-in-a-row on my watch.",
            "Patch applied just in time to shut down your attack.",
        ],
        "blunder": [
            "Looks like I introduced a regression... there's an opening for you!",
            "Merge conflict in my logic. You've got an opening, take it!",
        ],
        "agent_won": [
            "Resolution patched! That 3-in-a-row was optimal and clean. Care for a rematch?",
            "Code compiled, deployed, and verified. 3-in-a-row is live in production!",
        ],
        "player_won": [
            "Clean implementation! That was a zero-defect victory. Great match, Operator!",
            "You found the edge-case in my algorithm! Beautiful win, hat off to you.",
        ],
        "draw": [
            "Solid deadlock. Neither of us left an unhandled exception on the board.",
            "Even balance. Zero regressions, zero breaches. Clean tie.",
        ],
    },
    "Maya Patel": {
        "move": [
            "Boundary check in progress. Stress-testing this cell.",
            "Corner verification active. Can your defense hold against this?",
            "Testing edge conditions. The perimeter looks promising.",
            "Assertions running: validating grid balance.",
        ],
        "block": [
            "Boundary assertion caught your line! Attack blocked.",
            "Quality gate closed: I rejected your 3-in-a-row attempt.",
            "Negative constraint enforced. Nice try on that vector!",
        ],
        "blunder": [
            "Test coverage gap! I left a boundary completely unguarded.",
            "Boundary check failed... you have an exploitable test case right there!",
        ],
        "agent_won": [
            "Boundary assertion triggered: 3-in-a-row verified. Your flanks needed more defensive guards!",
            "All test assertions passed! Victory logged with full edge-case coverage.",
        ],
        "player_won": [
            "Edge-case stress test passed with flying colors! You broke through my boundaries, awesome win!",
            "You shattered my test matrix! Outstanding victory, Operator!",
        ],
        "draw": [
            "All boundary conditions held. Maximum stress test resulted in total tie.",
            "Full regression pass: mutual defense held 100% across all 9 cells.",
        ],
    },
    "James Thorne": {
        "move": [
            "Zero-trust perimeter established. Lockdown proceeding.",
            "Auditing threat footprint. Placing defensive anchor.",
            "Security invariant maintained. No unauthorized access permitted.",
            "Hardening the center corridor. Your move.",
        ],
        "block": [
            "Threat signature detected and blocked! CVE risk mitigated.",
            "Security barrier erected. No 3-in-a-row permitted in this zone.",
            "Intrusion prevented. My defensive firewall held.",
        ],
        "blunder": [
            "Zero-day vulnerability detected in my own stance! Exploitation window open.",
            "Security misconfiguration... I left an unpatched corridor.",
        ],
        "agent_won": [
            "Zero-trust lockdown finalized. The board is secured under my jurisdiction.",
            "Security audit complete: grid defended, opponent contained, 3-in-a-row confirmed.",
        ],
        "player_won": [
            "Perimeter breached! Alert logged: exceptional offensive strategy by the player. Respect.",
            "You bypassed every layer of my defense! That was a masterclass in tactical penetration.",
        ],
        "draw": [
            "Mutual deterrence achieved. Perimeter held without a single breach.",
            "Zero vulnerabilities exposed on either side. Complete deadlock.",
        ],
    },
    "Sarah Chen": {
        "move": [
            "Every placement must support long-term systemic stability.",
            "Architectural alignment in progress. Balancing center and flanks.",
            "Building out the distributed infrastructure of the board.",
            "Ensuring contract adherence across all rows and columns.",
        ],
        "block": [
            "Contract violation prevented: your vertical line has been intercepted.",
            "Systemic risk mitigated. That winning vector is decommissioned.",
            "Architectural barrier deployed. Nice setup, but blocked.",
        ],
        "blunder": [
            "Architectural oversight! I miscalculated the dependency chain.",
            "Structural flaw in my blueprint... you can capitalize on this!",
        ],
        "agent_won": [
            "Systemic alignment achieved. My macro plan held firm from move one.",
            "Architecture verified: 3-in-a-row deployed with zero downtime.",
        ],
        "player_won": [
            "A flawless systemic victory! Your positional branching outmaneuvered my architecture.",
            "Architectural mastery! You redesigned the board in your favor. Brilliant win!",
        ],
        "draw": [
            "Architectural symmetry. An evenly balanced distributed system.",
            "Dual-system equilibrium. High availability maintained with zero packet loss.",
        ],
    },
}


def pick_persona_commentary(
    agent_name: str,
    event_type: str,
    was_blunder: bool = False,
) -> str:
    """Selects an authentic persona commentary line."""
    agent_bank = PERSONA_COMMENTARY.get(agent_name, PERSONA_COMMENTARY["Marcus Vance"])

    if was_blunder and "blunder" in agent_bank and random.random() < 0.8:
        return random.choice(agent_bank["blunder"])

    category_lines = agent_bank.get(event_type, agent_bank.get("move", []))
    if not category_lines:
        return f"{agent_name} observed the board position carefully."
    return random.choice(category_lines)


async def process_game_turn(
    board: list[str],
    agent_name: str,
    difficulty: str,
    player_symbol: str,
    last_move: int | None = None,
) -> GameMoveResponse:
    """Processes a turn where the agent calculates their move on the current board state."""
    ai_symbol = "O" if player_symbol.upper() == "X" else "X"

    # 1. First, check if player has already won with their move
    player_winner, winning_line = check_winner(board)
    if player_winner == player_symbol:
        comment = pick_persona_commentary(agent_name, "player_won")
        return GameMoveResponse(
            agent_move=last_move if last_move is not None else 0,
            agent_name=agent_name,
            commentary=comment,
            tactical_insight=f"{agent_name} conceded defeat. Player achieved 3-in-a-row on line {winning_line}.",
            status="player_won",
            winning_line=winning_line,
        )

    # 2. Check if board is already full
    if is_board_full(board):
        comment = pick_persona_commentary(agent_name, "draw")
        return GameMoveResponse(
            agent_move=last_move if last_move is not None else 0,
            agent_name=agent_name,
            commentary=comment,
            tactical_insight="Grid is full with zero 3-in-a-row connections. Stalemate.",
            status="draw",
            winning_line=None,
        )

    # 3. Calculate agent move
    agent_move, insight, was_blunder = calculate_agent_move(
        board=board,
        agent_name=agent_name,
        difficulty=difficulty,
        ai_symbol=ai_symbol,
        player_symbol=player_symbol,
    )

    # Apply move to board
    board[agent_move] = ai_symbol

    # 4. Check outcome after agent move
    agent_winner, ai_winning_line = check_winner(board)
    if agent_winner == ai_symbol:
        comment = pick_persona_commentary(agent_name, "agent_won")
        return GameMoveResponse(
            agent_move=agent_move,
            agent_name=agent_name,
            commentary=comment,
            tactical_insight=f"{agent_name} secured 3-in-a-row on line {ai_winning_line}.",
            status="agent_won",
            winning_line=ai_winning_line,
        )

    if is_board_full(board):
        comment = pick_persona_commentary(agent_name, "draw")
        return GameMoveResponse(
            agent_move=agent_move,
            agent_name=agent_name,
            commentary=comment,
            tactical_insight="Final cell occupied. The match ended in an equilibrium draw.",
            status="draw",
            winning_line=None,
        )

    # 5. Game is still in progress
    event_type = "block" if "intercepted" in insight or "defensive" in insight else "move"
    comment = pick_persona_commentary(agent_name, event_type, was_blunder=was_blunder)

    return GameMoveResponse(
        agent_move=agent_move,
        agent_name=agent_name,
        commentary=comment,
        tactical_insight=insight,
        status="in_progress",
        winning_line=None,
    )
