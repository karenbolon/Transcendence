//board properties
let board;
let boardWidth = 500;
let boardHeight = 500;
let context;

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
let ballWidth = 10;
let ballHeight = 10;
let ball = {
	x : boardWidth/2,
	y : boardHeight/2,
	width : ballWidth,
	height : ballHeight,
	velocityX : 1,
	velocityY : 1.5
}

let player1Score = 0;
let player2Score = 0;

window.onload = function() {
	board = document.getElementById("board");
	board.height = boardHeight;
	board.width = boardWidth;
	context = board.getContext("2d"); //draw the board
	
	//draw player1
	context.fillStyle = "skyblue"; 
	context.fillRect(player1.x, player1.y, playerWidth, playerHeight);
	
	//draw player2
	context.fillStyle = "skyblue"; 
	context.fillRect(player2.x, player2.y, playerWidth, playerHeight);
	
	//start game loop
	requestAnimationFrame(update);
	document.addEventListener("keyup", movePlayer);//keyup or key down??
}

function update() {
	requestAnimationFrame(update);
	context.clearRect(0,0, board.width, board.height);

	//draw player1
	context.fillStyle = "skyblue";
	let nextPlayer1Y = player1.y + player1.velocityY;
	if (!boundaryCheck(nextPlayer1Y)) {
		player1.y = nextPlayer1Y;
	}
	context.fillRect(player1.x, player1.y, playerWidth, playerHeight);

	//draw player2
	let nextPlayer2Y = player2.y + player2.velocityY;
	if (!boundaryCheck(nextPlayer2Y)) {
		player2.y = nextPlayer2Y;
	}
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

	//score
	context.font = "45px sans-serif";
	context.fillText(player1Score, boardWidth / 5, 45);
	context.fillText(player2Score, boardWidth * 4 / 5 - 45, 45);//need to subtract the width of the text

	//draw dotted line in middle
	for (let i = 10; i < board.height; i += 25) {
		context.fillRect(board.width / 2 - 10, i , 5, 5);
	}

}

function boundaryCheck(yPosition) {
	return (yPosition < 0 || yPosition + playerHeight > boardHeight);
}

function movePlayer(e) {
	//player1
	if (e.code == "KeyW") {
		player1.velocityY = -3;
	}
	else if (e.code == "KeyS") {
		player1.velocityY = 3;
	}

	//player2
	if (e.code == "ArrowUp") {
		player2.velocityY = -3;
	}
	else if (e.code == "ArrowDown") {
		player2.velocityY = 3;
	}
}

function detectCollision(a, b) {
	//if 2 rectangles intersect, we need to return where the collision
	//occured (RH side of left paddle with left side of ball or LH of right paddle with right
	//side of ball)
	return a.x < b.x + b.width && //a's top RH doesn't reach b's top RH
			a.x + a.width > b.x && //a's top LH passes b's top RH
			a.y < b.y + b.height && //a's top LH doesn't reach b's bottom LH
			a.y + a.height > b.y; //a's bottom left corner passes b's top LH
}

function resetGame(direction) {
	ball = {
		x : boardWidth / 2,
		y : boardHeight / 2,
		width: ballWidth,
		height: ballHeight,
		velocityX : direction,
		velocityY : 1.5
	}
}
