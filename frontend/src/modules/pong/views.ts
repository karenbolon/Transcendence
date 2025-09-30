//pong

export function renderPongView(container?: HTMLElement, opts: GameOpts = {}) {
	const root = document.createElement('div');
	//root.className = 'pong-container flex flex-col items-center gap-1';
	root.className = 'pong-container flex flex-col items-center';

	// Render player labels directly under the canvas
	function renderPlayerLabels() {
		const labelDiv = document.createElement('div');
		labelDiv.className = "flex justify-between items-center w-full";
		labelDiv.style.height = "1.5em";
		labelDiv.style.marginTop = "1em";
		labelDiv.innerHTML = `
			<span class="font-bold text-left" style="min-width: 120px; margin-left: 6em; color: hotpink;"><strong>Player 1</strong></span>
			<span class="font-bold text-left" style="min-width: 120px; margin-left: 16em;color: hotpink;"><strong>Player 2</strong></span>
		`;
		return labelDiv;
	}

	let playAgainBtn: HTMLButtonElement | null = null;
	let canvas: HTMLCanvasElement | null = null;
	let targetScore = opts && typeof opts.targetScore === 'number' ? opts.targetScore : undefined;

	// Score selection form (only if targetScore is not set)
	if (typeof targetScore !== 'number') {
		const scoreForm = document.createElement('form');
		scoreForm.className = 'flex flex-col items-center gap-2 mb-4 w-full max-w-xs mx-auto';
		scoreForm.innerHTML = `
			<label for="targetScore" class="text-sm"><br><br>Target Score:</label>
			<input id="targetScore" name="targetScore" type="number" min="1" max="99" value="11" class="border rounded px-2 py-1 w-24 text-center" />
			<button type="submit" class="mt-2 px-4 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">Start Game</button>
			<br><br>
		`;
		scoreForm.addEventListener('submit', (e) => {
			e.preventDefault();
			const input = scoreForm.querySelector<HTMLInputElement>('#targetScore');
			const score = input ? parseInt(input.value, 10) : 11;
			// Remove previous game if any
			const oldCanvas = root.querySelector('canvas');
			if (oldCanvas) oldCanvas.remove();
			// Remove Play Again button if present
			if (playAgainBtn && (playAgainBtn as HTMLButtonElement).parentElement) {
				(playAgainBtn as HTMLButtonElement).parentElement!.removeChild(playAgainBtn);
			}
			// Create new canvas and start game
			canvas = document.createElement('canvas');
			canvas.style.display = 'block';
			canvas.style.marginBottom = '0';
			root.appendChild(canvas);
			startPongGame(canvas, { ...opts, targetScore: score });
		});
		root.appendChild(scoreForm);
		// Initial canvas for game (not started until form submit)
	canvas = document.createElement('canvas');
	canvas.style.display = 'block';
	canvas.style.marginBottom = '0';
	root.appendChild(canvas);
	root.appendChild(renderPlayerLabels());
	} else {
		// If targetScore is set, start game immediately
	canvas = document.createElement('canvas');
	canvas.style.display = 'block';
	canvas.style.marginBottom = '0';
	root.appendChild(canvas);
	startPongGame(canvas, { ...opts, targetScore });
	}

	// Mount to provided container or main area
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
}

//?: means it is optional and specifies the type
type GameOpts = {
	width?: number;
	height?: number;
	speed?: number;
	targetScore?: number;
	//player1?: string;
	//player2?: string;
	onGameEnd?: (winner: string) => void;
}

let rafId: number | null = null;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let keyupHandler: ((e: KeyboardEvent) => void) | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let canvasRef: HTMLCanvasElement | null = null;


// export test hooks
export let boardWidth = 640;
export let boardHeight = 480;
export let playerHeight = 50;

// players and game state (reinitialised on start of game)
let playerWidth = 10;
let playerVelocityY = 0;

type Player = {x: number; y: number; width: number; height: number; velocityY: number };
let player1: Player;
let player2: Player;

let player1Score = 0;
let player2Score = 0;

//default paddlespead, can be overridded by opts.speed
let paddleSpeed = 4;
let targetScore = 11;
let winMessage: string | null = null;
let gameOver = false;
let lastWinner: 1 | 2 | null = null;
const playButton = { x: 0, y: 0, w: 160, h: 44 };

//ball
const ballWidth = 10;
const ballHeight = 10;
export type Rect = {x: number; y: number; width: number; height: number };
export let ball: Rect & {velocityX: number; velocityY: number } =  {
	x : 0,
	y : 0,
	width : ballWidth,
	height : ballHeight,
	velocityX : 1.2,
	velocityY : 1.8
};

// Tournament integration: store callback and player names at module scope
let pongOnGameEnd: ((winner: string) => void) | undefined = undefined;
let pongPlayer1Name: string = "Player 1";
let pongPlayer2Name: string = "Player 2";

//public API
export function startPongGame(canvas: HTMLCanvasElement, opts: GameOpts = {}) {
	// Ensure previous game loop and listeners are cleaned up
	stopPongGame();
			pongPlayer1Name = "Player 1";
			pongPlayer2Name = "Player 2";
			pongOnGameEnd = typeof opts.onGameEnd === 'function' ? opts.onGameEnd : undefined;
	//sizes and options
	boardWidth = opts.width ?? 640;
	boardHeight = opts.height ?? 480;
		paddleSpeed = typeof opts.speed === 'number' ? opts.speed : 4;
	targetScore = opts.targetScore ?? 11;

	canvas.width = boardWidth;
	canvas.height = boardHeight;
	canvasRef = canvas;
	ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("2D ctx not available\n");

	//initial state
	playerHeight = 50;
	playerWidth = 10;
	playerVelocityY = 0;

	player1 = {
		x : 10,
		y : (boardHeight - playerHeight)/2,
		width : playerWidth,
		height :playerHeight,
		velocityY : playerVelocityY,
	};

	player2 = {
		x : boardWidth - playerWidth - 10,
		y : (boardHeight - playerHeight)/2,
		width : playerWidth,
		height :playerHeight,
		velocityY : playerVelocityY,
	};
	player1Score = 0;
	player2Score = 0;
	winMessage = null;
	gameOver = false;
	lastWinner = null;

	resetGame(Math.random() < 0.5 ? -1: 1);

	//focus for the keyboard
	canvas.tabIndex = 0;
	canvas.focus();

	//listeners
	keydownHandler = handleKeyDown;
	keyupHandler = handleKeyUp;
	clickHandler = onCanvasClick;

	document.addEventListener("keydown", keydownHandler);
	document.addEventListener("keyup", keyupHandler);
	canvas.addEventListener("click", clickHandler);

	//start game loop
	loop();
}

export function stopPongGame() {
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
	if (clickHandler && canvasRef) {
		canvasRef.removeEventListener("click", clickHandler);
		clickHandler = null;
	}
	//clear
	if (ctx && canvasRef) {
		ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
	}
	ctx = null;
	canvasRef = null;
}


//game loop
function loop(): void {
	rafId = requestAnimationFrame(loop);
	if (!ctx || !canvasRef)
		return;
	update();
	draw(ctx, canvasRef);
}


function update(): void {
			if (gameOver) {
				// Tournament integration: call pongOnGameEnd with winner name
				if (typeof pongOnGameEnd === 'function' && lastWinner) {
					const winnerName = lastWinner === 1 ? pongPlayer1Name : pongPlayer2Name;
					pongOnGameEnd(winnerName);
					pongOnGameEnd = undefined; // Prevent multiple calls
				}
				return;
			}

	//paddles
	const nextPlayer1Y = player1.y + player1.velocityY;
	if (!boundaryCheck(nextPlayer1Y))
		player1.y = nextPlayer1Y;

	const nextPlayer2Y = player2.y + player2.velocityY;
	if (!boundaryCheck(nextPlayer2Y))
		player2.y = nextPlayer2Y;

	//ball
	ball.x += ball.velocityX;
	ball.y += ball.velocityY;

	//Collisions
	//top and bottom border bounce
	if (ball.y <= 0 || (ball.y + ball.height >= boardHeight)) {
		ball.velocityY *= -1;
	}

	//detects if ball collides with player1 paddle
	if (detectCollision(ball, player1)) {
		if (ball.x <= player1.x + player1.width) {
			ball.velocityX *= -1;
		}
	}
	//detects if ball collides with player2 paddle
	else if ((detectCollision(ball, player2))) {
		if (ball.x + ball.width >= player2.x) {
			ball.velocityX *= -1;
		}
	}

	//scoring
	//if ball is past left side of board, player2 wins the point
	if (ball.x < 0) {
		player2Score++;
		resetGame(1);
	}
	//if ball is past right side of board, player1 wins the point
	else if (ball.x + ball.width > boardWidth) {
		player1Score++;
		resetGame(-1);
	}

	//gameover
	if (player1Score >= targetScore || player2Score >= targetScore) {
		//if player1Score > than targetScore, lastWinner is 1 else 2
		lastWinner = (player1Score >= targetScore) ? 1 : 2;
		winMessage = (lastWinner === 1) ? "Player 1 wins!" : "Player 2 wins!";
		gameOver = true;

		//freeze any movement
		player1.velocityY = 0;
		player2.velocityY = 0;
		ball.velocityX = 0;
		ball.velocityY = 0;
	}
}

function draw(ctx: CanvasRenderingContext2D, board: HTMLCanvasElement) {
	//render background (same as Tailwind bg-gray-800)
	ctx.fillStyle = "#1f2937"; //same as Tailwind bg-gray-800 found in index.html
	ctx.fillRect(0,0, board.width, board.height);

	//render paddles
	ctx.fillStyle = "skyblue";
	ctx.fillRect(player1.x, player1.y, playerWidth, playerHeight);
	ctx.fillRect(player2.x, player2.y, playerWidth, playerHeight);

	//render ball
	ctx.fillStyle = "white";
	ctx.fillRect(ball.x, ball.y, ball.width, ball.height);

	//displays current score throughout the game for each player
	ctx.fillStyle = 'white';
	ctx.font = "45px sans-serif";
	ctx.textAlign = 'center';
	ctx.fillText(String(player1Score), boardWidth / 4, 45);
	ctx.fillText(String(player2Score), boardWidth * 3 / 4, 45);

	//dashed center line
	for (let i = 10; i < board.height; i += 25) {
		ctx.fillRect(board.width / 2 - 2, i , 4, 4);
	}

	//Game over overlay and button
	if (gameOver) {
		//dim the background
		ctx.fillStyle = "rgba(0,0,0.55)";
		ctx.fillRect(0, 0, board.width, board.height);

		//winner announcement
		ctx.fillStyle = "white";
		ctx.font = "16px sans-serif";
		ctx.textAlign = 'center';
		const winnerText = winMessage ?? "Game Over";
		ctx.fillText(winnerText, board.width / 2, board.height / 2 - 40);
	
		// button rect (centered)
	    playButton.w = 180;
	    playButton.h = 46;
	    playButton.x = Math.round(board.width / 2 - playButton.w / 2);
    	playButton.y = Math.round(board.height / 2 + 10);

    	// button background
    	ctx.fillStyle = "#3b82f6"; // Tailwind blue-500
    	ctx.fillRect(playButton.x, playButton.y, playButton.w, playButton.h);

    	// button label
    	ctx.fillStyle = "white";
    	ctx.font = "18px sans-serif";
    	ctx.fillText(`Play Again`, board.width / 2, playButton.y + playButton.h / 2 + 6);
  	}
}

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

function onCanvasClick(e: MouseEvent): void {
	if (!gameOver || !canvasRef)
		return;
	const rect = canvasRef.getBoundingClientRect();
	const mx = e.clientX - rect.left;
	const my = e.clientY - rect.top;

	// ...existing code...
    

	const dir: 1 | -1 = (lastWinner === 1) ? 1 : (lastWinner === 2) ? -1 : 1;
	resetGame(dir);

	canvasRef.focus();
}

// ------- Helper funtions -------

export function boundaryCheck(yPosition: number): boolean {
  return (yPosition < 0 || yPosition + playerHeight > boardHeight);
}

export function detectCollision(a: Rect, b: Rect): boolean {
  //if 2 rectangles intersect, we need to return where the collision
  //occured (RH side of left paddle with left side of ball or LH of right paddle with right
  //side of ball)
  return (a.x < b.x + b.width && //a's top RH doesn't reach b's top RH
	a.x + a.width > b.x && //a's top LH passes b's top RH
	a.y < b.y + b.height && //a's top LH doesn't reach b's bottom LH
	a.y + a.height > b.y); //a's bottom left corner passes b's top LH
}

export function resetGame(direction: number): void {
	ball = {
		x : boardWidth / 2,
		y : boardHeight / 2,
		width: ballWidth,
		height: ballHeight,
		velocityX : direction,
		velocityY : 1.5
	};
}
