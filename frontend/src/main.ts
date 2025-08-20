import { boundaryCheck, detectCollision, resetGame, ball, boardWidth, boardHeight, playerHeight } from './pong';

//board/game properties
let board: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

//players
let playerWidth = 10;
let playerHeightLocal = 50;
let playerVelocityY = 0;

let player1 = {
	x : 10,
	y : (boardHeight - playerHeightLocal)/2,
	width : playerWidth,
	height :playerHeightLocal,
	velocityY : playerVelocityY
};

let player2 = {
	x : boardWidth - playerWidth - 10,
	y : (boardHeight - playerHeightLocal)/2,
	width : playerWidth,
	height :playerHeightLocal,
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

window.onload = () => {
	board = document.getElementById("board") as HTMLCanvasElement;
	board.height = boardHeight;
	board.width = boardWidth;
	board.addEventListener("click", onCanvasClick);
	board.tabIndex = 0;
	board.focus();

	context = board.getContext("2d") as CanvasRenderingContext2D;
	context.fillStyle = "skyblue";
	context.fillRect(player1.x, player1.y, playerWidth, playerHeightLocal);
	context.fillRect(player2.x, player2.y, playerWidth, playerHeightLocal);

	const chosen = parseInt(prompt("Play to how many points? (default 11)") || "", 10);
	if (!isNaN(chosen) && chosen > 0)
		targetScore = chosen;

	requestAnimationFrame(update);
	document.addEventListener("keydown", handleKeyDown);
	document.addEventListener("keyup", handleKeyUp);
};

function update(): void {
	requestAnimationFrame(update);
	context.clearRect(0,0, board.width, board.height);

	context.fillStyle = "skyblue";
	const nextPlayer1Y = player1.y + player1.velocityY;
	if (!boundaryCheck(nextPlayer1Y))
		player1.y = nextPlayer1Y;
	context.fillRect(player1.x, player1.y, playerWidth, playerHeightLocal);

	const nextPlayer2Y = player2.y + player2.velocityY;
	if (!boundaryCheck(nextPlayer2Y))
		player2.y = nextPlayer2Y;
	context.fillRect(player2.x, player2.y, playerWidth, playerHeightLocal);

	context.fillStyle = "white";
	ball.x += ball.velocityX;
	ball.y += ball.velocityY;
	context.fillRect(ball.x, ball.y, ball.width, ball.height);

	if (ball.y <= 0 || (ball.y + ball.height >= boardHeight)) {
		ball.velocityY *= -1;
	}

	if (detectCollision(ball, player1)) {
		if (ball.x <= player1.x + player1.width) {
			ball.velocityX *= -1;
		}
	}
	else if ((detectCollision(ball, player2))) {
		if (ball.x + ball.width >= player2.x) {
			ball.velocityX *= -1;
		}
	}
	if (ball.x < 0) {
		player2Score++;
		resetGame(1);
	}
	else if (ball.x + ball.width > boardWidth) {
		player1Score++;
		resetGame(-1);
	}

	if (player1Score >= targetScore || player2Score >= targetScore) {
		lastWinner = (player1Score >= targetScore) ? 1 : 2;
		winMessage = (lastWinner === 1) ? "Player 1 wins!" : "Player 2 wins!";

		gameOver = true;
		player1.velocityY = 0;
		player2.velocityY = 0;
		ball.velocityX = 0;
		ball.velocityY = 0;
	}

	context.font = "45px sans-serif";
	context.fillText(String(player1Score), boardWidth / 5, 45);
	context.fillText(String(player2Score), boardWidth * 4 / 5 - 45, 45);

	for (let i = 10; i < board.height; i += 25) {
		context.fillRect(board.width / 2 - 10, i , 5, 5);
	}

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

		playButton.w = 160;
		playButton.h = 44;
		playButton.x = (boardWidth - playButton.w) / 2;
		playButton.y = boardHeight / 2 + 20;

		context.fillStyle = "black";
		context.fillRect(playButton.x, playButton.y, playButton.w, playButton.h);

		context.fillStyle = "white";
		context.font = "20px sans-serif";
		context.fillText("Play Again", playButton.x + playButton.w / 2, playButton.y + playButton.h / 2);
		context.textAlign = "start";
		context.textBaseline = "alphabetic";;
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
