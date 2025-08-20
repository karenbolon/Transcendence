//board/game properties
let boardWidth = 640;
let boardHeight = 480;
const speed = 4;
let targetScore = 11; //classic pong had 11
let winMessage: string | null = null;
let gameOver = false;
let lastWinner: 1 | 2 | null = null; //1 for player 1, 2 for player 2, null for no winner yet
//const playButton = { x: number, y:number, w: number, h:number } = { x: 0, y: 0, w: 160, h: 44};
const playButton = { x: 0, y: 0, w: 160, h: 44};


//add types:
let board!: HTMLCanvasElement;
let context!: CanvasRenderingContext2D;


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

let player1Score = 0;
let player2Score = 0;

window.onload = () => {
	board = document.getElementById("board") as HTMLCanvasElement;
	board.height = boardHeight;
	board.width = boardWidth;
	board.addEventListener("click", onCanvasClick);
	board.tabIndex = 0;
	board.focus(); //focus the canvas so it can receive keyboard events

	context = board.getContext("2d") as CanvasRenderingContext2D; //draw the board
	
	//draw players
	context.fillStyle = "skyblue"; 
	context.fillRect(player1.x, player1.y, playerWidth, playerHeight);
	context.fillRect(player2.x, player2.y, playerWidth, playerHeight);
	
	const chosen = parseInt(prompt("Play to how many points? (default 11)") || "", 10);
	if (!isNaN(chosen) && chosen > 0)
		targetScore = chosen;

	//start game loop
	requestAnimationFrame(update);
	document.addEventListener("keydown", handleKeyDown);//keyup or key down??
	document.addEventListener("keyup", handleKeyUp);//keyup or key down??
};

function update(): void {
	requestAnimationFrame(update);
	context.clearRect(0,0, board.width, board.height);

	//draw player1
	context.fillStyle = "skyblue";
	const nextPlayer1Y = player1.y + player1.velocityY;
	if (!boundaryCheck(nextPlayer1Y))
		player1.y = nextPlayer1Y;
	context.fillRect(player1.x, player1.y, playerWidth, playerHeight);

	//draw player2
	const nextPlayer2Y = player2.y + player2.velocityY;
	if (!boundaryCheck(nextPlayer2Y))
		player2.y = nextPlayer2Y;
	context.fillRect(player2.x, player2.y, playerWidth, playerHeight);

	//ball
	context.fillStyle = "white";
	ball.x += ball.velocityX;
	ball.y += ball.velocityY;
	context.fillRect(ball.x, ball.y, ballWidth, ballHeight);

	//top/bottom bounce
	if (ball.y <= 0 || (ball.y + ballHeight >= boardHeight)) {
		ball.velocityY *= -1; //reverse direction of ball
	}

	//paddle bounce
	if (detectCollision(ball, player1)) {
		if (ball.x <= player1.x + player1.width) {
			//left side of ball touches player1 paddle (right side of paddle with left side of ball)
			ball.velocityX *= -1; //reverse direction of ball
		}
	}
	else if ((detectCollision(ball, player2))) {
		if (ball.x + ballWidth >= player2.x) {
			//right side of ball touches player2 paddle (left side of paddle with right side of ball)
			ball.velocityX *= -1; //reverse direction of ball
		}
	}
	//game over 
	if (ball.x < 0) {
		player2Score++;
		resetGame(1);
	}
	else if (ball.x + ballWidth > boardWidth) {
		player1Score++;
		resetGame(-1);
	}

	//check for game over
	if (player1Score >= targetScore || player2Score >= targetScore) {
		lastWinner = (player1Score >= targetScore) ? 1 : 2;
		winMessage = (lastWinner === 1) ? "Player 1 wins!" : "Player 2 wins!";

		gameOver = true;
		player1.velocityY = 0;
		player2.velocityY = 0;
		ball.velocityX = 0;
		ball.velocityY = 0;
	}

	//score
	context.font = "45px sans-serif";
	context.fillText(String(player1Score), boardWidth / 5, 45);
	context.fillText(String(player2Score), boardWidth * 4 / 5 - 45, 45);//need to subtract the width of the text

	//draw dotted line in middle
	for (let i = 10; i < board.height; i += 25) {
		context.fillRect(board.width / 2 - 10, i , 5, 5);
	}

	if (gameOver) {
		context.save();
		context.globalAlpha = 0.5;
		context.fillStyle = "black";
		context.clearRect(0, 0, board.width, board.height);
		context.restore();

		//winner announcement
		context.fillStyle = "white";
		context.font = "36px sans-serif";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.fillText(winMessage || "", boardWidth / 2, boardHeight / 2);

		//"play again" button
		playButton.w = 160;
		playButton.h = 44;
		playButton.x = (boardWidth - playButton.w) / 2;
		playButton.y = boardHeight / 2 + 20;

		//button background
		context.fillStyle = "black";
		context.fillRect(playButton.x, playButton.y, playButton.w, playButton.h);

		//button label
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

	//start new match
	player1Score = 0;
	player2Score = 0;
	winMessage = null;
	gameOver = false;

	//serve ball toward loser of previous match
	const dir: 1 | -1 = (lastWinner === 1) ? 1 : (lastWinner === 2) ? -1 : 1;
	resetGame(dir);

	board.focus();
}