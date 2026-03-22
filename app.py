"""
Tic Tac Toe - Flask Backend
Provides API endpoint for AI moves using Minimax algorithm
"""

from flask import Flask, render_template, request, jsonify
import math
import random

app = Flask(__name__)

# Winning combinations (indices)
WIN_LINES = [
    [0, 1, 2],  # Row 1
    [3, 4, 5],  # Row 2
    [6, 7, 8],  # Row 3
    [0, 3, 6],  # Col 1
    [1, 4, 7],  # Col 2
    [2, 5, 8],  # Col 3
    [0, 4, 8],  # Diagonal
    [2, 4, 6],  # Anti-diagonal
]


def check_winner(board):
    """
    Check if there's a winner.
    Returns 'X', 'O', or None.
    """
    for line in WIN_LINES:
        a, b, c = line
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return None


def get_winning_line(board):
    """
    Get the indices of the winning line (for highlighting).
    Returns list of 3 indices or None.
    """
    for line in WIN_LINES:
        a, b, c = line
        if board[a] and board[a] == board[b] == board[c]:
            return line
    return None


def is_board_full(board):
    """Check if board is full (draw condition)."""
    return all(cell is not None for cell in board)


def minimax(board, is_maximizing, alpha=-math.inf, beta=math.inf):
    """
    Minimax algorithm with alpha-beta pruning.
    Returns best score: +1 for O win, -1 for X win, 0 for draw.
    """
    winner = check_winner(board)
    if winner == "O":
        return 1
    if winner == "X":
        return -1
    if is_board_full(board):
        return 0

    if is_maximizing:
        best_score = -math.inf
        for i in range(9):
            if board[i] is None:
                board[i] = "O"
                score = minimax(board, False, alpha, beta)
                board[i] = None
                best_score = max(best_score, score)
                alpha = max(alpha, score)
                if beta <= alpha:
                    break
        return best_score
    else:
        best_score = math.inf
        for i in range(9):
            if board[i] is None:
                board[i] = "X"
                score = minimax(board, True, alpha, beta)
                board[i] = None
                best_score = min(best_score, score)
                beta = min(beta, score)
                if beta <= alpha:
                    break
        return best_score


def get_best_move(board):
    """
    Find the best move for AI (O) using Minimax.
    Returns index of best move or -1 if no valid moves.
    """
    best_score = -math.inf
    best_move = -1

    for i in range(9):
        if board[i] is None:
            board[i] = "O"
            score = minimax(board, False)
            board[i] = None
            if score > best_score:
                best_score = score
                best_move = i

    return best_move


def get_random_move(board):
    """Get a random valid move (for easy difficulty)."""
    available = [i for i in range(9) if board[i] is None]
    return random.choice(available) if available else -1


# Scoring for explanation (use +10, -10, 0 to match reference diagrams)
SCORE_WIN = 10
MAX_EXPLAIN_DEPTH = 6  # Limit tree depth for performance
SCORE_LOSE = -10
SCORE_DRAW = 0


def build_minimax_tree(board, is_maximizing, depth=0):
    """
    Build full Minimax tree for explanation (no alpha-beta pruning).
    Returns dict with board, move, score, children, is_terminal, is_maximizing.
    Uses +10/-10/0 for display clarity.
    """
    winner = check_winner(board)
    if winner == "O":
        return {
            "board": board[:],
            "move": None,
            "score": SCORE_WIN,
            "children": [],
            "is_terminal": True,
            "is_maximizing": is_maximizing,
            "terminal_reason": "AI wins",
        }
    if winner == "X":
        return {
            "board": board[:],
            "move": None,
            "score": SCORE_LOSE,
            "children": [],
            "is_terminal": True,
            "is_maximizing": is_maximizing,
            "terminal_reason": "Player wins",
        }
    if is_board_full(board):
        return {
            "board": board[:],
            "move": None,
            "score": SCORE_DRAW,
            "children": [],
            "is_terminal": True,
            "is_maximizing": is_maximizing,
            "terminal_reason": "Draw",
        }

    available = [i for i in range(9) if board[i] is None]
    if depth >= MAX_EXPLAIN_DEPTH:
        return {
            "board": board[:],
            "move": None,
            "score": 0,
            "children": [],
            "is_terminal": False,
            "is_maximizing": is_maximizing,
            "terminal_reason": f"(depth limit)",
        }

    children = []
    best_score = -999 if is_maximizing else 999
    best_child_idx = -1

    for i in available:
        board[i] = "O" if is_maximizing else "X"
        child = build_minimax_tree(board, not is_maximizing, depth + 1)
        child["move"] = i
        board[i] = None

        if is_maximizing and child["score"] > best_score:
            best_score = child["score"]
            best_child_idx = len(children)
        elif not is_maximizing and child["score"] < best_score:
            best_score = child["score"]
            best_child_idx = len(children)

        children.append(child)

    # Mark best children
    if is_maximizing and children:
        for idx, c in enumerate(children):
            c["is_best"] = idx == best_child_idx and c["score"] == best_score
    elif not is_maximizing and children:
        for idx, c in enumerate(children):
            c["is_best"] = idx == best_child_idx and c["score"] == best_score
    else:
        for c in children:
            c["is_best"] = False

    return {
        "board": board[:],
        "move": None,
        "score": best_score,
        "children": children,
        "is_terminal": False,
        "is_maximizing": is_maximizing,
        "terminal_reason": None,
    }


def get_explanation_tree(board):
    """
    Get the minimax tree for the current board (AI's turn to move).
    Returns root node and best move index.
    """
    if sum(1 for c in board if c) % 2 != 1:
        return None, -1  # Not AI's turn (X just played, O to move)

    best_move = get_best_move([c for c in board])
    root = build_minimax_tree([c for c in board], True)

    # Mark best path in root's children
    for i, child in enumerate(root["children"]):
        if child["move"] == best_move:
            child["is_best"] = True
        else:
            child["is_best"] = False

    return root, best_move


@app.route("/")
def index():
    """Serve the main game page."""
    return render_template("index.html")


@app.route("/move", methods=["POST"])
def move():
    """
    API endpoint: Process player move and return AI response.
    Expects JSON: { "board": [...], "difficulty": "easy"|"hard" }
    Returns: { "board": [...], "game_over": bool, "winner": "X"|"O"|null, "winning_cells": [...] }
    """
    try:
        data = request.get_json()
        if not data or "board" not in data:
            return jsonify({"error": "Missing board data"}), 400

        board = data["board"]
        difficulty = data.get("difficulty", "hard")

        # Validate board
        if not isinstance(board, list) or len(board) != 9:
            return jsonify({"error": "Invalid board format"}), 400

        # Normalize None values (JavaScript sends null)
        board = [cell if cell else None for cell in board]

        # Check if game is already over
        winner = check_winner(board)
        if winner or is_board_full(board):
            winning_line = get_winning_line(board) if winner else None
            return jsonify({
                "board": board,
                "game_over": True,
                "winner": winner,
                "winning_cells": winning_line or [],
            })

        # Count X and O to determine if it's AI's turn
        x_count = board.count("X")
        o_count = board.count("O")

        # Player (X) should have exactly one more than O (just played)
        if x_count != o_count + 1:
            return jsonify({"error": "Invalid game state"}), 400

        # Get AI move
        if difficulty == "easy":
            ai_move = get_random_move(board)
        else:
            ai_move = get_best_move(board)

        if ai_move != -1:
            board[ai_move] = "O"

        winner = check_winner(board)
        winning_line = get_winning_line(board) if winner else None

        return jsonify({
            "board": board,
            "game_over": bool(winner or is_board_full(board)),
            "winner": winner,
            "winning_cells": winning_line or [],
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/explain", methods=["POST"])
def explain():
    """
    API endpoint: Return full Minimax tree for explanation.
    Expects JSON: { "board": [...] } - board state BEFORE AI move (after player's X).
    Returns: { "tree": {...}, "best_move": int, "concepts": {...} }
    """
    try:
        data = request.get_json()
        if not data or "board" not in data:
            return jsonify({"error": "Missing board data"}), 400

        board = [cell if cell else None for cell in data["board"]]
        if not isinstance(board, list) or len(board) != 9:
            return jsonify({"error": "Invalid board format"}), 400

        x_count = board.count("X")
        o_count = board.count("O")
        if x_count != o_count + 1:
            return jsonify({
                "error": "Board must be in state where AI (O) is about to move. "
                         "Send board after player (X) has moved."
            }), 400

        root, best_move = get_explanation_tree(board)

        if best_move == -1:
            return jsonify({"error": "No valid moves to explain"}), 400

        return jsonify({
            "tree": root,
            "best_move": best_move,
            "concepts": {
                "initial_state": "The current board state before AI evaluates. All empty cells are possible moves.",
                "successor_function": "For each empty cell, we generate a new board by placing O there. These are the legal moves.",
                "terminal_state": "A board where someone wins (3 in a row) or the board is full (draw). No more moves possible.",
                "utility_function": f"+{SCORE_WIN} = AI wins (goal) • {SCORE_LOSE} = Player wins (avoid) • {SCORE_DRAW} = Draw (neutral)",
                "recursive_evaluation": "Minimax recursively evaluates each branch. Maximizer (AI) picks highest score; Minimizer (player) picks lowest. Scores bubble up to root.",
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
