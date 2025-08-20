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
// DOM and rendering logic moved to main.ts


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

// window and DOM logic moved to main.ts for testability

// update function and rendering logic moved to main.ts

// input handling moved to main.ts


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

// onCanvasClick moved to main.ts