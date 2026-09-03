const canvas = document.querySelector('#game-board');
const context = canvas.getContext('2d');
const scoreElement = document.querySelector('#score');
const bestElement = document.querySelector('#best');
const statusElement = document.querySelector('#status');
const startButton = document.querySelector('#start-button');
const pauseButton = document.querySelector('#pause-button');

const gridSize = 20;
const cellSize = canvas.width / gridSize;
const startingSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
let snake = [...startingSnake];
let food = { x: 15, y: 10 };
let direction = { x: 1, y: 0 };
let nextDirection = { ...direction };
let score = 0;
let best = Number(localStorage.getItem('neon-snake-best') || 0);
let gameTimer = null;
let isRunning = false;
let isPaused = false;

bestElement.textContent = formatScore(best);

function formatScore(value) { return String(value).padStart(3, '0'); }

function drawBoard() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#b9dfca';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = 'rgba(23, 35, 31, 0.1)';
  context.lineWidth = 1;
  for (let index = 1; index < gridSize; index += 1) {
    const position = index * cellSize;
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, canvas.height);
    context.moveTo(0, position);
    context.lineTo(canvas.width, position);
    context.stroke();
  }

  drawFood();
  snake.forEach((segment, index) => drawSegment(segment, index));
}

function drawSegment(segment, index) {
  const padding = index === 0 ? 3 : 4;
  const x = segment.x * cellSize + padding;
  const y = segment.y * cellSize + padding;
  const size = cellSize - padding * 2;
  context.fillStyle = index === 0 ? '#17231f' : '#4e7568';
  context.fillRect(x, y, size, size);
  if (index === 0) {
    context.fillStyle = '#d9f36b';
    const eyeX = direction.x === -1 ? x + 5 : direction.x === 1 ? x + size - 8 : x + 7;
    const eyeY = direction.y === -1 ? y + 5 : direction.y === 1 ? y + size - 8 : y + 7;
    context.fillRect(eyeX, eyeY, 4, 4);
    if (direction.x === 0) context.fillRect(x + size - 11, eyeY, 4, 4);
    if (direction.y === 0) context.fillRect(eyeX, y + size - 11, 4, 4);
  }
}

function drawFood() {
  const centerX = food.x * cellSize + cellSize / 2;
  const centerY = food.y * cellSize + cellSize / 2;
  context.fillStyle = '#ff765f';
  context.beginPath();
  context.arc(centerX, centerY, cellSize * 0.3, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#17231f';
  context.fillRect(centerX + 2, centerY - cellSize * 0.39, 3, 7);
}

function tick() {
  direction = { ...nextDirection };
  const head = {
    x: (snake[0].x + direction.x + gridSize) % gridSize,
    y: (snake[0].y + direction.y + gridSize) % gridSize,
  };
  const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);
  if (hitSelf) { endGame(); return; }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = formatScore(score);
    if (score > best) {
      best = score;
      bestElement.textContent = formatScore(best);
      localStorage.setItem('neon-snake-best', String(best));
    }
    placeFood();
    updateSpeed();
  } else {
    snake.pop();
  }
  drawBoard();
}

function placeFood() {
  do {
    food = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
  } while (snake.some((segment) => segment.x === food.x && segment.y === food.y));
}

function updateSpeed() {
  clearInterval(gameTimer);
  gameTimer = setInterval(tick, Math.max(120, 220 - score * 1.2));
}

function startGame(initialDirection = { x: 1, y: 0 }) {
  snake = [...startingSnake];
  direction = { ...initialDirection };
  nextDirection = { ...direction };
  score = 0;
  scoreElement.textContent = formatScore(score);
  placeFood();
  isRunning = true;
  isPaused = false;
  statusElement.textContent = 'Run in progress';
  startButton.textContent = 'Restart game ↗';
  pauseButton.innerHTML = 'Pause <span>Space</span>';
  updateSpeed();
  drawBoard();
}

function endGame() {
  clearInterval(gameTimer);
  isRunning = false;
  isPaused = false;
  statusElement.textContent = 'Game over · try again';
  startButton.textContent = 'Play again ↗';
  pauseButton.innerHTML = 'Pause <span>Space</span>';
}

function togglePause() {
  if (!isRunning) return;
  isPaused = !isPaused;
  if (isPaused) {
    clearInterval(gameTimer);
    statusElement.textContent = 'Paused';
    pauseButton.innerHTML = 'Resume <span>Space</span>';
  } else {
    statusElement.textContent = 'Run in progress';
    pauseButton.innerHTML = 'Pause <span>Space</span>';
    updateSpeed();
  }
}

function setDirection(newDirection) {
  if (newDirection.x === -direction.x && newDirection.y === -direction.y) return;
  nextDirection = newDirection;
  if (!isRunning) startGame(newDirection);
}

const directions = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
};

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') { event.preventDefault(); togglePause(); return; }
  const key = directions[event.code] || directions[event.key] || directions[event.key.toLowerCase()];
  if (key) { event.preventDefault(); setDirection(key); }
});

document.querySelectorAll('[data-direction]').forEach((button) => {
  button.addEventListener('click', () => setDirection(directions[{ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[button.dataset.direction]]));
});

startButton.addEventListener('click', () => startGame());
pauseButton.addEventListener('click', togglePause);
drawBoard();
