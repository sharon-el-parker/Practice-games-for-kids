const scene = document.querySelector('#apple-scene');
const context = scene.getContext('2d');
const firstNumber = document.querySelector('#first-number');
const secondNumber = document.querySelector('#second-number');
const answerButtons = document.querySelector('#answer-buttons');
const timeElement = document.querySelector('#apple-time');
const scoreElement = document.querySelector('#apple-score');
const statusElement = document.querySelector('#apple-status');
const modeButtons = document.querySelectorAll('[data-mode]');
const highScoreElements = Object.fromEntries([...modeButtons].map((button) => [button.dataset.mode, document.querySelector(`#high-score-${button.dataset.mode}`)]));
const gameOverBox = document.querySelector('#apple-game-over-box');
const gameOverMessage = document.querySelector('#apple-game-over-message');

let first = 1;
let second = 1;
let answer = 1;
let previousFact = '';
let selectedMode = '1-4';
let currentChoices = [];
let score = 0;
let bucketAppleCount = 0;
let timeLeft = 45;
let gameTimer = null;
let isRunning = false;
let isResolving = false;
let action = null;
let sceneMessage = '';
let messageUntil = 0;
let animationFrame;

Object.entries(highScoreElements).forEach(([mode, element]) => { element.textContent = String(localStorage.getItem(`apples-high-score-${mode}`) || 0).padStart(2, '0'); });

function updateHighScore() {
  const key = `apples-high-score-${selectedMode}`;
  const highScore = Math.max(score, Number(localStorage.getItem(key) || 0));
  localStorage.setItem(key, String(highScore));
  highScoreElements[selectedMode].textContent = String(highScore).padStart(2, '0');
}

function newFact() {
  const [low, high] = selectedMode.split('-').map(Number);
  do {
    if (selectedMode === '1-4') {
      first = Math.floor(Math.random() * 4) + 1;
      second = Math.floor(Math.random() * 4) + 1;
    } else {
      const fixed = Math.floor(Math.random() * 2) + low;
      const other = Math.floor(Math.random() * high) + 1;
      if (Math.random() > 0.5) { first = fixed; second = other; } else { first = other; second = fixed; }
    }
  } while (`${Math.min(first, second)}x${Math.max(first, second)}` === previousFact);
  previousFact = `${Math.min(first, second)}x${Math.max(first, second)}`;
  answer = first * second;
  firstNumber.textContent = first;
  secondNumber.textContent = second;
  const choices = new Set([answer]);
  while (choices.size < 3) choices.add(Math.max(1, Math.min(100, answer + Math.floor(Math.random() * 9) - 4)));
  currentChoices = [...choices].sort(() => Math.random() - 0.5);
  renderAnswers();
}

function renderAnswers() {
  answerButtons.innerHTML = currentChoices.map((choice) => `<button class="answer-button" type="button" data-answer="${choice}">${choice}</button>`).join('');
  answerButtons.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => chooseAnswer(Number(button.dataset.answer))));
}

function chooseAnswer(choice) {
  if (!isRunning) {
    startGame(selectedMode, true);
  }
  if (isResolving) return;
  if (choice === answer) {
    isResolving = true;
    answerButtons.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    score += 1;
    const caughtApple = score;
    scoreElement.textContent = String(score).padStart(2, '0');
    updateHighScore();
    action = { type: 'catch', startedAt: performance.now() };
    sceneMessage = 'Caught it!';
    messageUntil = Date.now() + 800;
    statusElement.textContent = 'The apple is in the bucket';
    setTimeout(() => {
      if (isRunning) {
        bucketAppleCount = Math.max(bucketAppleCount, caughtApple);
        isResolving = false;
        action = null;
        newFact();
      }
    }, 600);
  } else {
    const selectedButton = answerButtons.querySelector(`[data-answer="${choice}"]`);
    selectedButton.classList.add('wrong-answer');
    action = { type: 'deer', startedAt: performance.now() };
    sceneMessage = 'The deer got it!';
    messageUntil = Date.now() + 800;
    statusElement.textContent = 'A deer is running through';
    setTimeout(() => {
      if (isRunning && action?.type === 'deer') {
        action = null;
      }
    }, 467);
  }
}

function startGame(mode, keepFact = false) {
  clearInterval(gameTimer);
  selectedMode = mode;
  score = 0;
  bucketAppleCount = 0;
  timeLeft = 45;
  scoreElement.textContent = '00';
  timeElement.textContent = '45';
  isRunning = true;
  isResolving = false;
  action = null;
  gameOverBox.hidden = true;
  modeButtons.forEach((button) => { button.classList.toggle('selected', button.dataset.mode === selectedMode); button.disabled = false; });
  statusElement.textContent = 'Watch the tree';
  if (!keepFact) newFact();
  gameTimer = setInterval(() => {
    timeLeft -= 1;
    timeElement.textContent = String(timeLeft).padStart(2, '0');
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  clearInterval(gameTimer);
  isRunning = false;
  isResolving = false;
  action = null;
  statusElement.textContent = `Time's up · ${score} apples caught`;
  gameOverMessage.textContent = `Great job! You caught ${score} apples!`;
  gameOverBox.hidden = false;
  modeButtons.forEach((button) => { button.disabled = false; });
}

function drawScene() {
  const width = scene.width;
  const height = scene.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#f7c978'; context.fillRect(0, 0, width, height * 0.55);
  context.fillStyle = '#ed9c65'; context.beginPath(); context.arc(width * 0.82, 78, 44, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#9bc96d'; context.fillRect(0, height * 0.55, width, height * 0.45);
  drawTree(260, 175);
  if (action?.type === 'catch') drawCatchAction(width, height);
  else if (action?.type === 'deer') drawDeerAction(width, height);
  else { drawPerson(590, height * 0.55 + 14); drawBucket(650, height * 0.55 + 35); drawApple(260, 150); }
  if (Date.now() < messageUntil) { context.fillStyle = '#17231f'; context.font = '500 18px "DM Mono"'; context.fillText(sceneMessage, width * 0.61, height * 0.84); }
  animationFrame = requestAnimationFrame(drawScene);
}

function drawCatchAction(width, height) {
  const progress = Math.min(1, (performance.now() - action.startedAt) / 600);
  const ground = height * 0.55;
  const personX = 590 - (590 - 350) * progress;
  drawPerson(personX, ground + 14);
  const bucketX = personX - 45;
  const bucketY = ground - 26;
  drawBucket(bucketX, bucketY);
  const dropProgress = Math.max(0, Math.min(1, (progress - 0.42) / 0.58));
  const appleX = dropProgress > 0 ? 260 + (bucketX - 260) * dropProgress : 260;
  const appleY = dropProgress > 0 ? 150 + (bucketY - 150) * dropProgress ** 1.35 : 150;
  drawApple(appleX, appleY);
}

function drawDeerAction(width, height) {
  const progress = Math.min(1, (performance.now() - action.startedAt) / 467);
  const deerX = -100 + (width + 180) * progress;
  drawPerson(590, height * 0.55 + 14); drawBucket(650, height * 0.55 + 35); drawDeer(deerX, height * 0.55 - 12);
  const appleX = 260 + 80 * Math.min(1, progress * 2); const appleY = 150 + 65 * Math.min(1, progress * 2);
  if (progress < 0.78) drawApple(appleX, appleY);
}

function drawTree(x, y) {
  context.fillStyle = '#94533d'; context.fillRect(x - 22, y, 44, 250);
  context.fillStyle = '#4e7568'; context.beginPath(); context.arc(x, y - 32, 135, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#638d59'; context.beginPath(); context.arc(x - 80, y - 8, 77, 0, Math.PI * 2); context.arc(x + 78, y - 4, 82, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#d94f42'; context.strokeStyle = '#17231f'; context.lineWidth = 2;
  [[210, 125], [285, 105], [345, 155], [190, 190]].forEach(([appleX, appleY]) => { context.beginPath(); context.arc(appleX, appleY, 11, 0, Math.PI * 2); context.fill(); context.stroke(); });
}

function drawApple(x, y) {
  context.fillStyle = '#d94f42'; context.strokeStyle = '#17231f'; context.lineWidth = 3;
  context.beginPath(); context.arc(x, y, 18, 0, Math.PI * 2); context.fill(); context.stroke();
  context.fillStyle = '#17231f'; context.fillRect(x - 2, y - 27, 4, 10);
  context.fillStyle = '#d9f36b'; context.beginPath(); context.ellipse(x + 9, y - 22, 8, 4, -0.4, 0, Math.PI * 2); context.fill();
}

function drawPerson(x, y) {
  context.strokeStyle = '#17231f'; context.lineWidth = 8; context.lineCap = 'round'; context.beginPath();
  context.moveTo(x, y + 32); context.lineTo(x, y + 92); context.moveTo(x, y + 55); context.lineTo(x - 30, y + 18); context.moveTo(x, y + 90); context.lineTo(x - 25, y + 125); context.moveTo(x, y + 90); context.lineTo(x + 29, y + 125); context.stroke();
  context.fillStyle = '#f0eee6'; context.beginPath(); context.arc(x, y + 10, 18, 0, Math.PI * 2); context.fill(); context.stroke();
}

function drawBucket(x, y) {
  context.fillStyle = '#f0eee6'; context.strokeStyle = '#17231f'; context.lineWidth = 4;
  context.beginPath(); context.moveTo(x - 31, y - 18); context.lineTo(x + 31, y - 18); context.lineTo(x + 23, y + 34); context.lineTo(x - 23, y + 34); context.closePath(); context.fill(); context.stroke();
  for (let index = 0; index < Math.min(bucketAppleCount, 6); index += 1) drawBucketApple(x - 18 + (index % 3) * 18, y + 4 - Math.floor(index / 3) * 13);
}

function drawBucketApple(x, y) {
  context.fillStyle = '#d94f42'; context.strokeStyle = '#17231f'; context.lineWidth = 2;
  context.beginPath(); context.arc(x, y, 9, 0, Math.PI * 2); context.fill(); context.stroke();
  context.fillStyle = '#17231f'; context.fillRect(x - 1, y - 14, 2, 6);
  context.fillStyle = '#d9f36b'; context.beginPath(); context.ellipse(x + 5, y - 11, 5, 2, -0.4, 0, Math.PI * 2); context.fill();
}
function drawDeer(x, y) { context.strokeStyle = '#6b4436'; context.lineWidth = 8; context.lineCap = 'round'; context.beginPath(); context.moveTo(x, y + 20); context.lineTo(x + 70, y); context.lineTo(x + 103, y + 20); context.moveTo(x + 22, y + 13); context.lineTo(x + 10, y + 58); context.moveTo(x + 58, y + 8); context.lineTo(x + 78, y + 54); context.stroke(); context.fillStyle = '#9a6547'; context.beginPath(); context.ellipse(x + 42, y, 48, 20, 0, 0, Math.PI * 2); context.fill(); context.beginPath(); context.ellipse(x + 104, y + 10, 21, 17, 0, 0, Math.PI * 2); context.fill(); context.stroke(); context.beginPath(); context.moveTo(x + 101, y - 5); context.lineTo(x + 92, y - 28); context.moveTo(x + 108, y - 5); context.lineTo(x + 120, y - 28); context.stroke(); }

modeButtons.forEach((button) => button.addEventListener('click', () => startGame(button.dataset.mode)));
newFact();
drawScene();
