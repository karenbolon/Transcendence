//board/game properties
let board!: HTMLCanvasElement;
let context!: CanvasRenderingContext2D;
let boardWidth = 640;
let boardHeight = 480;

export function mount(canvas: HTMLCanvasElement) {
	board = canvas;
}

//players
let playerWidth = 10;
let playerHeight = 50;
let playerVelocityY = 0;

let player1 = {
	x : 10,
	y : (boardHeight - playerHeight)/2,
	width : playerWidth,
	height :playerHeight,
	velocityY : playerVelocityY
};

let player2 = {
	x : boardWidth - playerWidth - 10,
	y : (boardHeight - playerHeight)/2,
	width : playerWidth,
	height :playerHeight,
	velocityY : playerVelocityY
};

let player1Score = 0;
let player2Score = 0;

const speed = 4;
let targetScore = 11;
let winMessage: string | null = null;
let gameOver = false;
let lastWinner: 1 | 2 | null = null;
const playButton = { x: 0, y: 0, w: 160, h: 44 };

//ball
const ballWidth = 10;
const ballHeight = 10;
let ball = {
	x : boardWidth/2,
	y : boardHeight/2,
	width : ballWidth,
	height : ballHeight,
	velocityX : 1.2,
	velocityY : 1.8
}

//export function to run from main.ts
export function startGame(canvas: HTMLCanvasElement) {

	board = canvas;
	board.height = boardHeight;
	board.width = boardWidth;
	board.addEventListener("click", onCanvasClick);
	board.tabIndex = 0;
	board.focus();

	context = board.getContext("2d") as CanvasRenderingContext2D;
	context.fillStyle = "skyblue";
	context.fillRect(player1.x, player1.y, playerWidth, playerHeight);
	context.fillRect(player2.x, player2.y, playerWidth, playerHeight);

	const chosen = parseInt(prompt("Play to how many points? (default 11)") || "11", 10);
	if (chosen > 0)
		targetScore = chosen;
	else
		targetScore = 11;

	requestAnimationFrame(update);
	document.addEventListener("keydown", handleKeyDown);
	document.addEventListener("keyup", handleKeyUp);
}

function update(): void {
	requestAnimationFrame(update);

	//paint/fill board background grey
	context.fillStyle = "#1f2937"; //same as Tailwind bg-gray-800 found in index.html
	context.fillRect(0,0, board.width, board.height);

	//Render Player1 paddle
	context.fillStyle = "skyblue";
	const nextPlayer1Y = player1.y + player1.velocityY;
	if (!boundaryCheck(nextPlayer1Y))
		player1.y = nextPlayer1Y;
	context.fillRect(player1.x, player1.y, playerWidth, playerHeight);

	//Render Player2 paddle
	const nextPlayer2Y = player2.y + player2.velocityY;
	if (!boundaryCheck(nextPlayer2Y))
		player2.y = nextPlayer2Y;
	context.fillRect(player2.x, player2.y, playerWidth, playerHeight);

	//Render ball
	ball.x += ball.velocityX;
	ball.y += ball.velocityY;
	context.fillStyle = "white";
	context.fillRect(ball.x, ball.y, ball.width, ball.height);

	//Collisions
	//detect when ball reaches top and bottom border
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
	//determines who wins the game
	if (player1Score >= targetScore || player2Score >= targetScore) {
		//if player1Score > than targetScore, lastWinner is 1 else 2
		lastWinner = (player1Score >= targetScore) ? 1 : 2;
		winMessage = (lastWinner === 1) ? "Player 1 wins!" : "Player 2 wins!";

		gameOver = true;
		player1.velocityY = 0;
		player2.velocityY = 0;
		ball.velocityX = 0;
		ball.velocityY = 0;
	}

	//displays current score throughout the game for each player
	context.fillStyle = 'white';
	context.font = "45px sans-serif";
	context.textAlign = 'center';
	context.fillText(String(player1Score), boardWidth / 4, 45);
	context.fillText(String(player2Score), boardWidth * 3 / 4, 45);

	for (let i = 10; i < board.height; i += 25) {
		context.fillRect(board.width / 2 - 2, i , 4, 4);
	}

	//game over screen
	if (gameOver) {
		context.save();
		context.globalAlpha = 0.5;
		context.fillStyle = "black";
		context.clearRect(0, 0, board.width, board.height);
		context.restore();

		context.fillStyle = "white";
		context.font = "36px sans-serif";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.fillText(winMessage || "", boardWidth / 2, boardHeight / 2);

		//button to play again after game is won
		playButton.w = 160;
		playButton.h = 44;
		playButton.x = (boardWidth - playButton.w) / 2;
		playButton.y = boardHeight / 2 + 20;

		context.fillStyle = "black";
		context.fillRect(playButton.x, playButton.y, playButton.w, playButton.h);

		context.fillStyle = "white";
		context.font = "20px sans-serif";
		context.fillText("Play Again", playButton.x + playButton.w / 2, playButton.y + playButton.h / 2);
	}
}

function handleKeyDown(e: KeyboardEvent): void {
	if (e.code ==="KeyW" || e.code === "KeyS" || e.code === "ArrowUp" || e.code === "ArrowDown")
		e.preventDefault();
	if (e.code === "KeyW")
		player1.velocityY = -speed;
	else if (e.code === "KeyS")
		player1.velocityY = speed;
	else if (e.code === "ArrowUp")
		player2.velocityY = -speed;
	else if (e.code === "ArrowDown")
		player2.velocityY = speed;
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
	if (!gameOver)
		return;
	const rect = board.getBoundingClientRect();
	const mx = e.clientX - rect.left;
	const my = e.clientY - rect.top;

	const inside = 
		mx >= playButton.x && mx <= playButton.x + playButton.w &&
		my >= playButton.y && my <= playButton.y + playButton.h;
	
	if (!inside)
		return;

	player1Score = 0;
	player2Score = 0;
	winMessage = null;
	gameOver = false;

	const dir: 1 | -1 = (lastWinner === 1) ? 1 : (lastWinner === 2) ? -1 : 1;
	resetGame(dir);

	board.focus();
}

export function boundaryCheck(yPosition: number): boolean {
  return (yPosition < 0 || yPosition + playerHeight > boardHeight);
}

export type Rect = { x: number, y: number, width: number, height: number };

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

// Export for testing
export { ball, boardWidth, boardHeight, playerHeight };

