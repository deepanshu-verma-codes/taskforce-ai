import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import game_service


@pytest.mark.asyncio
async def test_list_game_agents():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/game/agents")
        assert resp.status_code == 200
        agents = resp.json()
        assert len(agents) == 6
        names = [a["name"] for a in agents]
        assert "Marcus Vance" in names
        assert "Elena Rostova" in names
        assert "David Park" in names
        assert "Maya Patel" in names
        assert "James Thorne" in names
        assert "Sarah Chen" in names

        for a in agents:
            assert a["offense"] > 0
            assert a["defense"] > 0
            assert a["foresight"] > 0
            assert len(a["opening_quote"]) > 5


@pytest.mark.asyncio
async def test_game_move_opening_turn():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Player placed 'X' in center (index 4)
        board = ["", "", "", "", "X", "", "", "", ""]
        payload = {
            "board": board,
            "agent_name": "Marcus Vance",
            "difficulty": "medium",
            "player_symbol": "X",
            "last_move": 4,
        }
        resp = await client.post("/api/game/move", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["agent_name"] == "Marcus Vance"
        assert 0 <= data["agent_move"] <= 8
        assert data["agent_move"] != 4  # Cannot pick occupied cell
        assert data["status"] == "in_progress"
        assert len(data["commentary"]) > 0


@pytest.mark.asyncio
async def test_game_move_player_wins():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Player just completed top row [0, 1, 2]
        board = ["X", "X", "X", "O", "O", "", "", "", ""]
        payload = {
            "board": board,
            "agent_name": "Elena Rostova",
            "difficulty": "medium",
            "player_symbol": "X",
            "last_move": 2,
        }
        resp = await client.post("/api/game/move", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "player_won"
        assert data["winning_line"] == [0, 1, 2]
        assert "Elena Rostova" in data["agent_name"]
        assert len(data["commentary"]) > 0


@pytest.mark.asyncio
async def test_game_move_agent_wins():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Agent ('O') has [0, 1] and [2] is open
        board = ["O", "O", "", "X", "X", "", "", "", ""]
        payload = {
            "board": board,
            "agent_name": "David Park",
            "difficulty": "hard",  # Hard guarantees taking the win
            "player_symbol": "X",
            "last_move": 4,
        }
        resp = await client.post("/api/game/move", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["agent_move"] == 2
        assert data["status"] == "agent_won"
        assert data["winning_line"] == [0, 1, 2]


@pytest.mark.asyncio
async def test_game_move_draw():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Board will be full after agent's last move
        # X O X
        # X O O
        # O X _  (cell 8 is open, player is X, agent is O)
        board = ["X", "O", "X", "X", "O", "O", "O", "X", ""]
        payload = {
            "board": board,
            "agent_name": "Maya Patel",
            "difficulty": "hard",
            "player_symbol": "X",
            "last_move": 7,
        }
        resp = await client.post("/api/game/move", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["agent_move"] == 8
        assert data["status"] == "draw"
        assert data["winning_line"] is None


def test_check_winner_helper():
    assert game_service.check_winner(["X", "X", "X", "", "", "", "", "", ""]) == (
        "X",
        [0, 1, 2],
    )
    assert game_service.check_winner(["O", "", "", "O", "", "", "O", "", ""]) == (
        "O",
        [0, 3, 6],
    )
    assert game_service.check_winner(["", "", "X", "", "X", "", "X", "", ""]) == (
        "X",
        [2, 4, 6],
    )
    assert game_service.check_winner(["X", "O", "X", "X", "O", "O", "O", "X", "O"]) == (
        None,
        None,
    )


def test_try_to_win_medium_blunder_possibility():
    """Validates that on medium difficulty, there is a chance for human players to win."""
    # Player threatens win at cell 2
    board = ["X", "X", "", "O", "", "", "", "", ""]
    blunder_observed = False
    for _ in range(50):
        board_copy = list(board)
        move, _, was_blunder = game_service.calculate_agent_move(
            board=board_copy,
            agent_name="James Thorne",
            difficulty="medium",
            ai_symbol="O",
            player_symbol="X",
        )
        if was_blunder or move != 2:
            blunder_observed = True
            break
    assert blunder_observed, "Medium difficulty should occasionally leave openings to let players try to win!"
