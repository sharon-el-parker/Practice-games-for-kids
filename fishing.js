const scene = document.querySelector('#fishing-scene');
const context = scene.getContext('2d');
const firstNumber = document.querySelector('#first-number');
const secondNumber = document.querySelector('#second-number');
const answerButtons = document.querySelector('#answer-buttons');
const timeLeftElement = document.querySelector('#time-left');
const caughtElement = document.querySelector('#caught-count');
const pailElement = document.querySelector('#pail-count');
const statusElement = document.querySelector('#fishing-status');
const modeButtons = document.querySelectorAll('[data-mode]');
const highScoreElements = Object.fromEntries([...modeButtons].map((button) => [button.dataset.mode, document.querySelector(`#high-score-${button.dataset.mode}`)]));
const gameOverBox = document.querySelector('#game-over-box');
const gameOverMessage = document.querySelector('#game-over-message');

let first = 1;
let second = 1;
let answer = 2;
let caught = 0;
let timeLeft = 60;
let gameTimer = null;
let isRunning = false;
let sceneMessage = '';
let messageUntil = 0;
let fishOffset = 0;
let animationFrame;
let fishTransition = null;
let fishColor = '#d9f36b';
let pailFishColors = [];
let hasFish = false;
let isResolving = false;
let catchTimer = null;
let nextFactTimer = null;
let selectedMode = '1-4';
let previousFact = '';
let currentChoices = [];
const fishColors = ['#d9f36b', '#ff9f68', '#f48fb1', '#8ee3c1', '#f6e58d', '#9bb8ff'];

function updateHighScore() {
  const storageKey = `fishing-high-score-${selectedMode}`;
  const highScore = Math.max(caught, Number(localStorage.getItem(storageKey) || 0));
  localStorage.setItem(storageKey, String(highScore));
  highScoreElements[selectedMode].textContent = String(highScore).padStart(2, '0');
}

Object.entries(highScoreElements).forEach(([mode, element]) => {
  element.textContent = String(localStorage.getItem(`fishing-high-score-${mode}`) || 0).padStart(2, '0');
});

function newFact({ showPreviousFishLeaving = true } = {}) {
  const previousFishColor = fishColor;
  const [low, high] = selectedMode.split('-').map(Number);
  do {
    if (selectedMode === '1-4') {
      first = Math.floor(Math.random() * 4) + 1;
      second = Math.floor(Math.random() * 4) + 1;
    } else {
      const fixedNumber = Math.floor(Math.random() * 2) + low;
      const otherNumber = Math.floor(Math.random() * high) + 1;
      if (Math.random() > 0.5) { first = fixedNumber; second = otherNumber; }
      else { first = otherNumber; second = fixedNumber; }
    }
  } while (`${Math.min(first, second)}+${Math.max(first, second)}` === previousFact);
  previousFact = `${Math.min(first, second)}+${Math.max(first, second)}`;
  answer = first + second;
  firstNumber.textContent = first;
  secondNumber.textContent = second;
  const choices = new Set([answer]);
  while (choices.size < 3) choices.add(Math.max(2, Math.min(20, answer + Math.floor(Math.random() * 7) - 3)));
  currentChoices = [...choices].sort(() => Math.random() - 0.5);
  renderAnswerButtons();
  setNewFish(showPreviousFishLeaving, previousFishColor);
}

function renderAnswerButtons() {
  answerButtons.innerHTML = currentChoices.map((choice) => `<button class="answer-button" type="button" data-answer="${choice}">${choice}</button>`).join('');
  answerButtons.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => chooseAnswer(Number(button.dataset.answer))));
}

function setNewFish(showPreviousFishLeaving = true, previousFishColor = fishColor) {
  fishColor = fishColors[Math.floor(Math.random() * fishColors.length)];
  fishTransition = { startedAt: performance.now(), oldColor: showPreviousFishLeaving && hasFish ? previousFishColor : null };
  hasFish = true;
}

function chooseAnswer(choice) {
  if (isResolving) return;
  if (!isRunning) startGame(selectedMode, false);
  if (choice === answer) {
    isResolving = true;
    answerButtons.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    caught += 1;
    caughtElement.textContent = String(caught).padStart(2, '0');
    updateHighScore();
    sceneMessage = 'Nice catch!';
    messageUntil = Date.now() + 850;
    statusElement.textContent = 'Fish on the line!';
    fishTransition = { startedAt: performance.now(), type: 'catch', color: fishColor };
    catchTimer = setTimeout(completeCatch, 400);
    return;
  }
  const selectedButton = answerButtons.querySelector(`[data-answer="${choice}"]`);
  selectedButton.classList.add('wrong-answer');
  setNewFish(true);
  sceneMessage = 'That fish got away!';
  messageUntil = Date.now() + 850;
  statusElement.textContent = 'New fish on the line';
}

function completeCatch() {
  pailFishColors.push(fishColor);
  pailElement.textContent = `${caught} fish`;
  fishTransition = { type: 'empty' };
  statusElement.textContent = 'Fish in the pail!';
  nextFactTimer = setTimeout(() => {
    if (!isRunning) return;
    isResolving = false;
    newFact({ showPreviousFishLeaving: false });
  }, 233);
}

function startGame(mode, refreshFact = true) {
  clearInterval(gameTimer);
  clearTimeout(catchTimer);
  clearTimeout(nextFactTimer);
  caught = 0;
  timeLeft = 45;
  caughtElement.textContent = '00';
  pailElement.textContent = '0 fish';
  pailFishColors = [];
  hasFish = false;
  isResolving = false;
  fishTransition = null;
  timeLeftElement.textContent = '45';
  isRunning = true;
  gameOverBox.hidden = true;
  selectedMode = mode;
  modeButtons.forEach((button) => button.classList.toggle('selected', button.dataset.mode === selectedMode));
  statusElement.textContent = 'Cast your line';
  if (refreshFact) newFact();
  gameTimer = setInterval(() => {
    timeLeft -= 1;
    timeLeftElement.textContent = String(timeLeft).padStart(2, '0');
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  clearInterval(gameTimer);
  clearTimeout(catchTimer);
  clearTimeout(nextFactTimer);
  isRunning = false;
  statusElement.textContent = `Time's up · ${caught} fish caught`;
  gameOverMessage.textContent = `Great job! You caught ${caught} fish!`;
  gameOverBox.hidden = false;
  modeButtons.forEach((button) => { button.disabled = false; });
  isResolving = false;
  fishTransition = null;
  answerButtons.querySelectorAll('button').forEach((button) => { button.disabled = true; });
}

function drawScene() {
  const width = scene.width;
  const height = scene.height;
  const waterline = height * 0.49;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#f7c978';
  context.fillRect(0, 0, width, waterline);
  context.fillStyle = '#ed9c65';
  context.beginPath();
  context.arc(width * 0.82, height * 0.18, 45, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#80c6c1';
  context.fillRect(0, waterline, width, height - waterline);
  context.strokeStyle = 'rgba(23, 35, 31, 0.18)';
  context.lineWidth = 2;
  for (let y = waterline + 28; y < height; y += 42) {
    context.beginPath();
    context.moveTo(0, y);
    context.quadraticCurveTo(width * 0.25, y - 8, width * 0.5, y);
    context.quadraticCurveTo(width * 0.75, y + 8, width, y);
    context.stroke();
  }
  drawBoat(width * 0.28, waterline + 18);
  drawPerson(width * 0.3, waterline - 105);
  const lineStartX = width * 0.3 + 42;
  const lineStartY = waterline - 75;
  const hookX = lineStartX + 155;
  const hookY = waterline + 100;
  const fishX = hookX - 105 + Math.sin(fishOffset) * 6;
  const fishY = waterline + 152;
  let catchingFish = null;
  if (fishTransition?.type === 'catch') {
    const catchProgress = Math.min(1, (performance.now() - fishTransition.startedAt) / 400);
    const pailX = width * 0.18;
    const pailY = waterline - 35;
    if (catchProgress < 0.35) {
      const approach = catchProgress / 0.35;
      catchingFish = { x: fishX + (hookX - 25 - fishX) * approach, y: fishY + (hookY - fishY) * approach };
    } else {
      const swing = (catchProgress - 0.35) / 0.65;
      catchingFish = { x: hookX - 25 + (pailX - (hookX - 25)) * swing, y: hookY + (pailY - hookY) * swing };
    }
  }
  drawLine(lineStartX, lineStartY, catchingFish ? catchingFish.x + 25 : hookX, catchingFish ? catchingFish.y : hookY);
  if (fishTransition && fishTransition.type !== 'empty') {
    const duration = fishTransition.type === 'catch' ? 400 : 467;
    const progress = Math.min(1, (performance.now() - fishTransition.startedAt) / duration);
    if (fishTransition.type === 'catch') {
      drawFish(catchingFish.x, catchingFish.y, 1, fishTransition.color);
    } else {
      if (fishTransition.oldColor) drawFish(fishX + progress * 150, fishY - progress * 25, 1 - progress, fishTransition.oldColor);
      drawFish(-70 + progress * (fishX + 70), fishY, progress, fishColor);
    }
    if (progress === 1) fishTransition = null;
  } else if (!fishTransition) {
    drawFish(fishX, fishY, 1, fishColor);
  }
  drawPail(width * 0.18, waterline - 27);
  if (Date.now() < messageUntil) {
    context.fillStyle = '#17231f';
    context.font = '500 18px "DM Mono"';
    context.fillText(sceneMessage, width * 0.56, height * 0.77);
  }
  fishOffset += 0.0375;
  animationFrame = requestAnimationFrame(drawScene);
}

function drawBoat(x, y) {
  context.fillStyle = '#e96f57';
  context.beginPath();
  context.moveTo(x - 145, y);
  context.lineTo(x + 135, y);
  context.lineTo(x + 92, y + 58);
  context.lineTo(x - 94, y + 58);
  context.closePath();
  context.fill();
  context.strokeStyle = '#17231f';
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = '#f0eee6';
  context.fillRect(x - 76, y - 34, 132, 34);
  context.strokeRect(x - 76, y - 34, 132, 34);
}

function drawPerson(x, y) {
  context.strokeStyle = '#17231f';
  context.lineWidth = 8;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(x, y + 35); context.lineTo(x + 2, y + 98);
  context.moveTo(x + 2, y + 65); context.lineTo(x + 42, y + 30);
  context.moveTo(x + 2, y + 93); context.lineTo(x - 25, y + 124);
  context.moveTo(x + 2, y + 93); context.lineTo(x + 32, y + 123);
  context.stroke();
  context.fillStyle = '#f0eee6';
  context.beginPath(); context.arc(x, y + 13, 19, 0, Math.PI * 2); context.fill(); context.stroke();
  context.fillStyle = '#17231f';
  context.fillRect(x - 24, y - 8, 49, 8);
}

function drawLine(x, y, lineEndX = x + 155, lineEndY = y + 175) {
  context.strokeStyle = '#17231f';
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.beginPath(); context.moveTo(x, y); context.lineTo(x + 96, y - 148); context.stroke();
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(x + 96, y - 148); context.lineTo(lineEndX, lineEndY); context.stroke();
  context.beginPath(); context.arc(lineEndX, lineEndY, 6, 0, Math.PI * 2); context.stroke();
  context.beginPath(); context.moveTo(lineEndX, lineEndY); context.quadraticCurveTo(lineEndX - 10, lineEndY + 17, lineEndX + 2, lineEndY + 23); context.stroke();
}

function drawFish(x, y, opacity = 1, color = '#d9f36b') {
  context.save();
  context.globalAlpha = opacity;
  context.fillStyle = color;
  context.strokeStyle = '#17231f';
  context.lineWidth = 3;
  context.beginPath(); context.ellipse(x, y, 25, 14, 0, 0, Math.PI * 2); context.fill(); context.stroke();
  context.beginPath(); context.moveTo(x - 20, y); context.lineTo(x - 43, y - 18); context.lineTo(x - 43, y + 18); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = '#17231f'; context.beginPath(); context.arc(x + 12, y - 4, 3, 0, Math.PI * 2); context.fill();
  context.restore();
}

function drawPail(x, y) {
  context.fillStyle = '#f0eee6';
  context.beginPath(); context.moveTo(x - 42, y - 13); context.lineTo(x + 42, y - 13); context.lineTo(x + 31, y + 45); context.lineTo(x - 31, y + 45); context.closePath(); context.fill();
  context.strokeStyle = '#17231f'; context.lineWidth = 4; context.stroke();
  for (let index = 0; index < Math.min(pailFishColors.length, 5); index += 1) drawFish(x - 26 + index * 13, y - 18 - (index % 2) * 8, 1, pailFishColors[index]);
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => startGame(button.dataset.mode));
});
newFact();
drawScene();
