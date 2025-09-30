// tournamentPong.ts  (Tournament-only)

// ---------- Types ----------
//?: means it is optional and specifies the type
type GameOpts = {
  width?: number;
  height?: number;
  speed?: number;
  targetScore?: number;     // default 5 in tournament mode
  player1?: string;
  player2?: string;
  onGameEnd?: (winner: string) => void; // called exactly once
};

export type Rect = { x: number; y: number; width: number; height: number };

// ------- Helpers -------
export function boundaryCheck(yPosition: number): boolean {
  return (yPosition < 0 || yPosition + playerHeight > boardHeight);
}

export function detectCollision(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function resetGame(direction: number): void {
  ball = {
    x: boardWidth / 2,
    y: boardHeight / 2,
    width: ballWidth,
    height: ballHeight,
    velocityX: direction,
    velocityY: 1.5,
  };
}

// ---------- Module state ----------
let rafId: number | null = null;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let keyupHandler: ((e: KeyboardEvent) => void) | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let canvasRef: HTMLCanvasElement | null = null;

//export test hooks
export let boardWidth = 640;
export let boardHeight = 480;
export let playerHeight = 50;

let playerWidth = 10;
let playerVelocityY = 0;

type Player = { x: number; y: number; width: number; height: number; velocityY: number };
let player1: Player;
let player2: Player;

let player1Score = 0;
let player2Score = 0;

//default settings
let paddleSpeed = 4;
let targetScore = 5; // tournament default
let winMessage: string | null = null;
let gameOver = false;
let lastWinner: 1 | 2 | null = null;

// draw-once-then-stop logic
let pendingStop = false; // set true after we draw the winner banner once
let announced = false;   // ensures onGameEnd fires exactly once

//ball
const ballWidth = 10;
const ballHeight = 10;
export let ball: Rect & { velocityX: number; velocityY: number } = {
  x: 0,
  y: 0,
  width: ballWidth,
  height: ballHeight,
  velocityX: 1.2,
  velocityY: 1.8
};

// Tournament integration
let pongOnGameEnd: ((winner: string) => void) | undefined = undefined;
let pongPlayer1Name: string = "Player 1";
let pongPlayer2Name: string = "Player 2";

// ---------- Public mount/API ----------
export function renderTournamentPongView(container?: HTMLElement, opts: GameOpts = {}) {
  // Create a container for labels + canvas
  const root = document.createElement('div');
  root.className = 'pong-container flex flex-col items-center';

  // Render player labels above the canvas
  function renderPlayerLabels() {
    const labelDiv = document.createElement('div');
    labelDiv.className = "flex justify-between items-center w-full";
    labelDiv.style.height = "1.5em";
    labelDiv.style.marginTop = "1em";
    labelDiv.innerHTML = `
      <span class=\"font-bold text-left\" style=\"min-width: 120px; margin-left: 6em; color: hotpink;\"><strong>${opts.player1 || 'Player 1'}</strong></span>
      <span class=\"font-bold text-left\" style=\"min-width: 120px; margin-left: 16em; color: hotpink;\"><strong>${opts.player2 || 'Player 2'}</strong></span>
    `;
    return labelDiv;
  }

  root.appendChild(renderPlayerLabels());
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'pong-board';
  canvas.className = 'border border-gray-300 dark:border-gray-700 rounded';
  root.appendChild(canvas);

  // Mount to container or fallback
  if (container) {
    container.innerHTML = '';
    container.appendChild(root);
  } else {
    const main = document.querySelector('main');
    if (main) {
      main.innerHTML = '';
      main.appendChild(root);
    }
  }

  // Start game on that canvas
  startTournamentPongGame(canvas, opts);
}

// ---------- Public API ----------
export function startTournamentPongGame(canvas: HTMLCanvasElement, opts: GameOpts = {}) {
  // Ensure previous game loop and listeners are cleaned up
  stopTournamentPongGame();

  pongPlayer1Name = opts.player1 || "Player 1";
  pongPlayer2Name = opts.player2 || "Player 2";
  pongOnGameEnd = typeof opts.onGameEnd === 'function' ? opts.onGameEnd : undefined;

  // sizes and options
  boardWidth = opts.width ?? 640;
  boardHeight = opts.height ?? 480;
  paddleSpeed = typeof opts.speed === 'number' ? opts.speed : 4;
  targetScore = typeof opts.targetScore === 'number' ? opts.targetScore : 5;

  // attach and size canvas
  canvasRef = canvas;
  canvasRef.width = boardWidth;
  canvasRef.height = boardHeight;

  // visible border so you can see it
  if (!canvasRef.classList.contains('border')) {
    canvasRef.classList.add('border', 'border-gray-300', 'dark:border-gray-700', 'rounded');
  }

  ctx = canvasRef.getContext("2d");
  if (!ctx) throw new Error("2D ctx not available");

  // initial state
  playerHeight = 50;
  playerWidth = 10;
  playerVelocityY = 0;

  player1 = {
    x: 10,
    y: (boardHeight - playerHeight) / 2,
    width: playerWidth,
    height: playerHeight,
    velocityY: playerVelocityY,
  };

  player2 = {
    x: boardWidth - playerWidth - 10,
    y: (boardHeight - playerHeight) / 2,
    width: playerWidth,
    height: playerHeight,
    velocityY: playerVelocityY,
  };

  player1Score = 0;
  player2Score = 0;
  winMessage = null;
  gameOver = false;
  lastWinner = null;
  pendingStop = false;
  announced = false;

  resetGame(Math.random() < 0.5 ? -1 : 1);

  // focus for the keyboard
  canvasRef.tabIndex = 0;
  canvasRef.focus();

  // listeners
  keydownHandler = handleKeyDown;
  keyupHandler = handleKeyUp;
  document.addEventListener("keydown", keydownHandler);
  document.addEventListener("keyup", keyupHandler);

  // Remove player names display under the board
  const boardFooter = document.getElementById('pong-board-footer');
  if (boardFooter) {
    boardFooter.innerHTML = "";
  }

  // start game loop
  loop();
}

export function stopTournamentPongGame() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (keydownHandler) {
    document.removeEventListener("keydown", keydownHandler);
    keydownHandler = null;
  }
  if (keyupHandler) {
    document.removeEventListener("keyup", keyupHandler);
    keyupHandler = null;
  }
  if (ctx && canvasRef) {
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
  }
  // Clear player names until next match
  const boardFooter = document.getElementById('pong-board-footer');
  if (boardFooter) {
    boardFooter.innerHTML = "";
  }
  ctx = null;
  canvasRef = null;
}

// ---------- Loop ----------
function loop(): void {
  rafId = requestAnimationFrame(loop);
  if (!ctx || !canvasRef) return;
  update();
  draw(ctx, canvasRef);

  // after we’ve drawn the winner banner once, stop
  if (pendingStop) {
    pendingStop = false;
    stopTournamentPongGame();
  }
}

function update(): void {
  if (gameOver) {
    if (!announced) {
      const winnerName =
        lastWinner === 1 ? pongPlayer1Name :
        lastWinner === 2 ? pongPlayer2Name :
        'Winner';
      announced = true;
      if (typeof pongOnGameEnd === 'function') {
        pongOnGameEnd(winnerName); // notify bracket once
      }
      pendingStop = true; // stop after we draw the red banner one frame
    }
    return;
  }

  // paddles
  const nextPlayer1Y = player1.y + player1.velocityY;
  if (!boundaryCheck(nextPlayer1Y)) player1.y = nextPlayer1Y;

  const nextPlayer2Y = player2.y + player2.velocityY;
  if (!boundaryCheck(nextPlayer2Y)) player2.y = nextPlayer2Y;

  // ball
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  // wall collisions
  if (ball.y <= 0 || (ball.y + ball.height >= boardHeight)) {
    ball.velocityY *= -1;
  }

  // paddle collisions
  if (detectCollision(ball, player1)) {
    if (ball.x <= player1.x + player1.width) {
      ball.velocityX *= -1;
    }
  } else if (detectCollision(ball, player2)) {
    if (ball.x + ball.width >= player2.x) {
      ball.velocityX *= -1;
    }
  }

  // scoring
  if (ball.x < 0) {           // past left -> P2 scores
    player2Score++;
    resetGame(1);
  } else if (ball.x + ball.width > boardWidth) { // past right -> P1 scores
    player1Score++;
    resetGame(-1);
  }

  // gameover
  if (player1Score >= targetScore || player2Score >= targetScore) {
    lastWinner = (player1Score >= targetScore) ? 1 : 2;
    winMessage = (lastWinner === 1)
      ? `${pongPlayer1Name} wins!`
      : `${pongPlayer2Name} wins!`;
    gameOver = true;

    // freeze movement
    player1.velocityY = 0;
    player2.velocityY = 0;
    ball.velocityX = 0;
    ball.velocityY = 0;
  }
}

function draw(ctx: CanvasRenderingContext2D, board: HTMLCanvasElement) {
  // background (Tailwind gray-800)
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, 0, board.width, board.height);

  // paddles
  ctx.fillStyle = "skyblue";
  ctx.fillRect(player1.x, player1.y, playerWidth, playerHeight);
  ctx.fillRect(player2.x, player2.y, playerWidth, playerHeight);

  // ball
  ctx.fillStyle = "white";
  ctx.fillRect(ball.x, ball.y, ball.width, ball.height);

  // scores
  ctx.fillStyle = "white";
  ctx.font = "45px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(player1Score), boardWidth / 4, 45);
  ctx.fillText(String(player2Score), (boardWidth * 3) / 4, 45);

  // dashed center line
  for (let i = 10; i < board.height; i += 25) {
    ctx.fillRect(board.width / 2 - 2, i, 4, 4);
  }

  // Tiny red winner banner (tournament only)
  if (gameOver) {
    ctx.save();
    ctx.fillStyle = "#dc2626"; // Tailwind red-600
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    const winnerText = winMessage ?? "Game Over";
    ctx.fillText(winnerText, board.width / 2, 40);
    ctx.restore();
  }
}
  

// --- Keyboard event handlers (moved to module scope) ---
function handleKeyDown(e: KeyboardEvent): void { 
  if (e.code ==="KeyW" || e.code === "KeyS" || e.code === "ArrowUp" || e.code === "ArrowDown") 
    e.preventDefault(); 
  if (e.code === "KeyW")
    player1.velocityY = -paddleSpeed; 
  else if (e.code === "KeyS")
    player1.velocityY = paddleSpeed; 
  else if (e.code === "ArrowUp")
    player2.velocityY = -paddleSpeed;
  else if (e.code === "ArrowDown")
    player2.velocityY = paddleSpeed;
} 

function handleKeyUp(e: KeyboardEvent): void {
  if (e.code ==="KeyW" || e.code === "KeyS" || e.code === "ArrowUp" || e.code === "ArrowDown")
    e.preventDefault(); 
  if (e.code === "KeyW" || e.code === "KeyS")
    player1.velocityY = 0;
  if (e.code === "ArrowUp" || e.code === "ArrowDown")
    player2.velocityY = 0;
}
