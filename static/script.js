/**
 * Tic Tac Toe - Frontend Game Logic
 * Connects to Flask backend via Fetch API
 */

// Game state
let board = Array(9).fill(null);
let gameOver = false;
let isPlayerTurn = true;

// Scores (persisted in sessionStorage)
let scores = {
  you: parseInt(sessionStorage.getItem('scoreYou') || '0'),
  ai: parseInt(sessionStorage.getItem('scoreAi') || '0'),
  draws: parseInt(sessionStorage.getItem('scoreDraws') || '0')
};

// Difficulty: 'easy' (random) or 'hard' (minimax)
let difficulty = 'hard';

// Store board state before AI move (for Explain feature)
let lastBoardBeforeAIMove = null;

// DOM elements
const boardEl = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
const turnText = turnIndicator.querySelector('.turn-text');
const turnIcon = turnIndicator.querySelector('.turn-icon');
const gameStatus = document.getElementById('game-status');
const restartBtn = document.getElementById('restart-btn');
const resetScoresBtn = document.getElementById('reset-scores');
const easyBtn = document.getElementById('easy-btn');
const hardBtn = document.getElementById('hard-btn');
const explainBtn = document.getElementById('explain-btn');
const explainModal = document.getElementById('explain-modal');
const modalClose = document.getElementById('modal-close');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderBoard();
  updateScores();
  updateStats();
  updateTurnIndicator();
  setupEventListeners();
  explainBtn.disabled = true;
});

function setupEventListeners() {
  restartBtn.addEventListener('click', restartGame);
  resetScoresBtn.addEventListener('click', resetScores);
  easyBtn.addEventListener('click', () => setDifficulty('easy'));
  hardBtn.addEventListener('click', () => setDifficulty('hard'));
  explainBtn.addEventListener('click', openExplainModal);
  modalClose.addEventListener('click', closeExplainModal);
  explainModal.addEventListener('click', (e) => {
    if (e.target === explainModal) closeExplainModal();
  });
}

/**
 * Render the 3x3 board with clickable cells
 */
function renderBoard() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.textContent = board[i] || '';
    if (board[i]) {
      cell.classList.add('filled', board[i].toLowerCase());
    }
    cell.addEventListener('click', () => handleCellClick(i));
    boardEl.appendChild(cell);
  }
}

/**
 * Handle player click on a cell
 */
function handleCellClick(index) {
  if (gameOver || !isPlayerTurn || board[index]) return;

  // Place X
  board[index] = 'X';
  isPlayerTurn = false;
  renderBoard();
  updateTurnIndicator();

  // Check for immediate win/draw (client-side quick check)
  const winner = checkWinner(board);
  const full = board.every(c => c);

  if (winner || full) {
    endGame(winner);
    return;
  }

  // Store board for "Explain AI Move" (only in hard mode)
  if (difficulty === 'hard') {
    lastBoardBeforeAIMove = board.map(c => c);
    explainBtn.disabled = false;
  } else {
    lastBoardBeforeAIMove = null;
    explainBtn.disabled = true;
  }

  // Request AI move from backend (with delay to feel natural)
  const AI_DELAY_MS = 800;
  setTimeout(() => {
    fetch('/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board: board.map(c => c),
        difficulty: difficulty
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error(data.error);
        isPlayerTurn = true;
        renderBoard();
        updateTurnIndicator();
        return;
      }

      board = data.board;
      gameOver = data.game_over;
      const winner = data.winner;
      const winningCells = data.winning_cells || [];

      renderBoard();

      if (winningCells.length) {
        winningCells.forEach(i => {
          const cell = boardEl.children[i];
          if (cell) cell.classList.add('winner', winner.toLowerCase());
        });
      }

      if (gameOver) {
        endGame(winner);
      } else {
        isPlayerTurn = true;
        updateTurnIndicator();
      }
    })
    .catch(err => {
      console.error('API error:', err);
      gameStatus.textContent = 'Connection error. Try again.';
      isPlayerTurn = true;
      renderBoard();
      updateTurnIndicator();
    });
  }, AI_DELAY_MS);
}

/**
 * Check for winner (client-side utility)
 */
function checkWinner(grid) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) return grid[a];
  }
  return null;
}

/**
 * End game and update scores/stats
 */
function endGame(winner) {
  gameOver = true;
  isPlayerTurn = false;

  if (winner === 'X') {
    scores.you++;
    gameStatus.textContent = 'You win!';
    gameStatus.className = 'game-status win';
  } else if (winner === 'O') {
    scores.ai++;
    gameStatus.textContent = 'AI wins!';
    gameStatus.className = 'game-status lose';
  } else {
    scores.draws++;
    gameStatus.textContent = "It's a draw!";
    gameStatus.className = 'game-status draw';
  }

  saveScores();
  updateScores();
  updateStats();
  updateTurnIndicator();
}

/**
 * Restart the game (new round)
 */
function restartGame() {
  board = Array(9).fill(null);
  gameOver = false;
  isPlayerTurn = true;
  lastBoardBeforeAIMove = null;
  explainBtn.disabled = true;
  gameStatus.textContent = '';
  gameStatus.className = 'game-status';
  renderBoard();
  updateTurnIndicator();
}

/**
 * Reset all scores
 */
function resetScores() {
  scores = { you: 0, ai: 0, draws: 0 };
  saveScores();
  updateScores();
  updateStats();
}

function saveScores() {
  sessionStorage.setItem('scoreYou', scores.you);
  sessionStorage.setItem('scoreAi', scores.ai);
  sessionStorage.setItem('scoreDraws', scores.draws);
}

function updateScores() {
  document.getElementById('score-you').textContent = scores.you;
  document.getElementById('score-ai').textContent = scores.ai;
  document.getElementById('score-draws').textContent = scores.draws;
}

function updateStats() {
  const total = scores.you + scores.ai + scores.draws;
  const winRate = total > 0 ? Math.round((scores.you / total) * 100) : 0;
  document.getElementById('total-games').textContent = total;
  document.getElementById('win-rate').textContent = winRate;
}

function updateTurnIndicator() {
  if (gameOver) {
    turnIndicator.classList.remove('your-turn', 'ai-turn');
    turnText.textContent = 'GAME OVER';
    turnIcon.textContent = '';
    return;
  }
  if (isPlayerTurn) {
    turnIndicator.classList.remove('ai-turn');
    turnIndicator.classList.add('your-turn');
    turnIcon.textContent = 'X';
    turnText.textContent = 'YOUR TURN';
  } else {
    turnIndicator.classList.remove('your-turn');
    turnIndicator.classList.add('ai-turn');
    turnIcon.textContent = 'O';
    turnText.textContent = "AI'S TURN";
  }
}

function setDifficulty(level) {
  difficulty = level;
  easyBtn.classList.toggle('active', level === 'easy');
  hardBtn.classList.toggle('active', level === 'hard');
  explainBtn.disabled = level === 'easy' || !lastBoardBeforeAIMove;
}

// ─── Explain AI Move ───────────────────────────────────────────────────

function openExplainModal() {
  if (!lastBoardBeforeAIMove || difficulty !== 'hard') return;

  explainModal.classList.add('open');
  document.getElementById('concept-list').innerHTML = '<p>Loading...</p>';
  document.getElementById('tree-container').innerHTML = '';
  document.getElementById('explain-summary-text').textContent = '';

  fetch('/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ board: lastBoardBeforeAIMove })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        document.getElementById('concept-list').innerHTML =
          '<p class="concept-item" style="color:#ff6b6b">' + data.error + '</p>';
        return;
      }

      renderConcepts(data.concepts);
      const treeContainer = document.getElementById('tree-container');
      treeContainer.innerHTML = '';
      treeContainer.appendChild(renderTree(data.tree, data.best_move));
      renderSummary(data.best_move, data.tree);
    })
    .catch(err => {
      document.getElementById('concept-list').innerHTML =
        '<p class="concept-item" style="color:#ff6b6b">Failed to load explanation.</p>';
    });
}

function closeExplainModal() {
  explainModal.classList.remove('open');
}

function renderConcepts(concepts) {
  const html = [
    { key: 'initial_state', label: 'Initial State' },
    { key: 'successor_function', label: 'Successor Function' },
    { key: 'terminal_state', label: 'Terminal State' },
    { key: 'utility_function', label: 'Utility Function' },
    { key: 'recursive_evaluation', label: 'Recursive Evaluation' }
  ]
    .map(
      ({ key, label }) =>
        `<div class="concept-item"><strong>${label}:</strong> ${concepts[key] || ''}</div>`
    )
    .join('');
  document.getElementById('concept-list').innerHTML = html;
}

function renderTree(node, bestMove, depth = 0) {
  const div = document.createElement('div');
  div.className = 'tree-node' + (node.is_best ? ' best' : '');

  const boardHtml = node.board
    .map(
      (c) =>
        `<div class="mini-cell ${(c || '').toLowerCase()}">${c || ''}</div>`
    )
    .join('');

  let scoreClass = '';
  if (node.is_terminal) {
    if (node.score === 10) scoreClass = 'win';
    else if (node.score === -10) scoreClass = 'lose';
    else scoreClass = 'draw';
  }

  const scoreText = node.is_terminal
    ? `${node.score} (${node.terminal_reason || ''})`
    : `Score: ${node.score}`;

  const moveLabel =
    node.move !== undefined && node.move !== null
      ? `Move: cell ${node.move}`
      : depth === 0
        ? 'Root'
        : '';

  div.innerHTML = `
    <div class="mini-board">${boardHtml}</div>
    ${moveLabel ? `<div class="node-toggle">${moveLabel}</div>` : ''}
    <div class="node-score ${scoreClass}">${scoreText}</div>
    ${node.children && node.children.length ? '<div class="tree-children"></div>' : ''}
  `;

  if (node.children && node.children.length) {
    const childrenEl = div.querySelector('.tree-children');
    node.children.forEach((child) => {
      childrenEl.appendChild(renderTree(child, bestMove, depth + 1));
    });

    const toggle = document.createElement('div');
    toggle.className = 'node-toggle';
    toggle.textContent = '▼ Collapse';
    toggle.style.cursor = 'pointer';
    toggle.addEventListener('click', () => {
      div.classList.toggle('collapsed');
      toggle.textContent = div.classList.contains('collapsed') ? '▶ Expand' : '▼ Collapse';
    });
    div.querySelector('.node-score').after(toggle);
  }

  return div;
}

function renderSummary(bestMove, tree) {
  const row = Math.floor(bestMove / 3) + 1;
  const col = (bestMove % 3) + 1;
  const text = `The AI selected cell ${bestMove} (row ${row}, column ${col}) because the Minimax algorithm evaluated all possible moves and determined this move leads to the best outcome. The AI maximizes its score (+10 to win) while assuming you (the player) will minimize it (-10 to avoid your win). The chosen path is highlighted in the tree above.`;
  document.getElementById('explain-summary-text').textContent = text;
}
