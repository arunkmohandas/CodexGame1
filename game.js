(() => {
  'use strict';

  // -------------------------
  // Constants and references
  // -------------------------
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const menuScreen = document.getElementById('menuScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const menuBtn = document.getElementById('menuBtn');
  const finalScoreText = document.getElementById('finalScoreText');
  const highScoreText = document.getElementById('highScoreText');

  const STORAGE_KEY = 'oneTapShiftHighScoreMs';

  const COLORS = {
    A: '#2dd4bf',
    B: '#ff5f8f',
    text: '#f4f7ff',
    grid: 'rgba(255,255,255,0.06)',
    warning: '#ffd166'
  };

  const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
  };

  // -------------------------
  // Game variables
  // -------------------------
  let state = GAME_STATE.MENU;
  let highScoreMs = Number(localStorage.getItem(STORAGE_KEY)) || 0;

  let player;
  let obstacles;
  let startTimeMs;
  let elapsedMs;
  let lastFrameTime;
  let spawnTimer;
  let animationId;

  // -------------------------
  // Initialization
  // -------------------------
  function init() {
    bindEvents();
    resetWorld();
    render();
    showMenu();
  }

  function bindEvents() {
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    menuBtn.addEventListener('click', showMenu);

    canvas.addEventListener('pointerdown', () => {
      if (state === GAME_STATE.PLAYING) {
        togglePlayerColor();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();

        if (state === GAME_STATE.PLAYING) {
          togglePlayerColor();
        } else if (state === GAME_STATE.MENU) {
          startGame();
        } else if (state === GAME_STATE.GAME_OVER) {
          startGame();
        }
      }
    });
  }

  // -------------------------
  // State transitions
  // -------------------------
  function showMenu() {
    state = GAME_STATE.MENU;
    cancelAnimationFrame(animationId);
    resetWorld();

    menuScreen.classList.remove('hidden');
    menuScreen.classList.add('active');
    gameOverScreen.classList.add('hidden');

    render();
  }

  function startGame() {
    state = GAME_STATE.PLAYING;
    resetWorld();

    menuScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    startTimeMs = performance.now();
    lastFrameTime = startTimeMs;

    animationId = requestAnimationFrame(gameLoop);
  }

  function endGame() {
    state = GAME_STATE.GAME_OVER;
    cancelAnimationFrame(animationId);

    const finalMs = elapsedMs;
    if (finalMs > highScoreMs) {
      highScoreMs = finalMs;
      localStorage.setItem(STORAGE_KEY, String(highScoreMs));
    }

    finalScoreText.textContent = `Final Score: ${formatScore(finalMs)}`;
    highScoreText.textContent = `High Score: ${formatScore(highScoreMs)}`;

    gameOverScreen.classList.remove('hidden');
  }

  // -------------------------
  // Game data and helpers
  // -------------------------
  function resetWorld() {
    const playerWidth = canvas.width * 0.78;
    const playerHeight = 30;
    player = {
      x: canvas.width / 2 - playerWidth / 2,
      y: canvas.height - playerHeight - 8,
      width: playerWidth,
      height: playerHeight,
      colorState: 'A'
    };

    obstacles = [];
    elapsedMs = 0;
    spawnTimer = 0;
    startTimeMs = 0;
  }

  function togglePlayerColor() {
    player.colorState = player.colorState === 'A' ? 'B' : 'A';
  }

  function createObstacle() {
    const minSize = 28;
    const maxSize = 72;
    const size = randRange(minSize, maxSize);
    const x = randRange(0, canvas.width - size);

    obstacles.push({
      x,
      y: -size,
      size,
      colorState: Math.random() < 0.5 ? 'A' : 'B'
    });
  }

  function getDifficulty(ms) {
    const seconds = ms / 1000;

    // Increase fall speed over time.
    const fallSpeed = 180 + Math.min(460, seconds * 20);

    // Decrease spawn interval over time.
    const spawnInterval = Math.max(0.22, 0.95 - seconds * 0.02);

    return { fallSpeed, spawnInterval };
  }

  function update(deltaSeconds, nowMs) {
    elapsedMs = nowMs - startTimeMs;
    const difficulty = getDifficulty(elapsedMs);

    spawnTimer += deltaSeconds;
    while (spawnTimer >= difficulty.spawnInterval) {
      spawnTimer -= difficulty.spawnInterval;
      createObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = obstacles[i];
      obstacle.y += difficulty.fallSpeed * deltaSeconds;

      // Evaluate obstacle only once it actually reaches the bottom edge.
      if (obstacle.y + obstacle.size >= canvas.height) {
        if (obstacle.colorState !== player.colorState) {
          endGame();
          return;
        }

        // Matching color at the bottom: obstacle is safely cleared.
        obstacles.splice(i, 1);
      }
    }
  }

  // -------------------------
  // Rendering
  // -------------------------
  function renderBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw subtle vertical grid lines for motion reference.
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    const gap = 40;
    for (let x = 0; x <= canvas.width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
  }

  function renderPlayer() {
    ctx.fillStyle = COLORS[player.colorState];
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
  }

  function renderObstacles() {
    for (const obstacle of obstacles) {
      ctx.fillStyle = COLORS[obstacle.colorState];
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.size, obstacle.size);

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.size, obstacle.size);
    }
  }

  function renderScore() {
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 26px Inter, Segoe UI, Roboto, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${formatScore(elapsedMs)}`, 14, 12);

    if (state === GAME_STATE.PLAYING) {
      ctx.fillStyle = COLORS.warning;
      ctx.font = '600 14px Inter, Segoe UI, Roboto, Arial, sans-serif';
      ctx.fillText('Tap / Click / Space to shift color', 14, 44);
    }
  }

  function render() {
    renderBackground();
    renderObstacles();
    renderPlayer();
    renderScore();
  }

  // -------------------------
  // Main game loop
  // -------------------------
  function gameLoop(nowMs) {
    if (state !== GAME_STATE.PLAYING) {
      return;
    }

    const deltaSeconds = Math.min(0.05, (nowMs - lastFrameTime) / 1000);
    lastFrameTime = nowMs;

    update(deltaSeconds, nowMs);
    render();

    if (state === GAME_STATE.PLAYING) {
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  // -------------------------
  // Utilities
  // -------------------------
  function randRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function formatScore(ms) {
    return `${(ms / 1000).toFixed(3)}s`;
  }

  init();
})();
