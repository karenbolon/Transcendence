// This is the game state the server sends to both clients every tick (60fps).
  // It's a snapshot of everything the client needs to DRAW the game —
  // no physics internals like currentBallSpeed or paddle velocities.

export interface GameStateSnapshot {
	phase: string;
	paddle1Y: number;
	paddle2Y: number;
	ballX: number;
	ballY: number;
	ballVX: number;
	ballVY: number;
	ballSpin: number;
	ballRotation: number;
	score1: number;
	score2: number;
	countdownDisplay: string;
	winner: string;
	scoreFlash: 'left' | 'right' | null;
	scoreFlashTimer: number;
	timestamp: number;
}

// Sent once when the game ends (win or forfeit).
// Contains everything needed to save the match and show results.
export interface GameResult {
	roomId: string;
	player1: { userId: number; username: string; score: number };
	player2: { userId: number; username: string; score: number };
	winnerId: number;
	winnerUsername: string;
	loserId: number;
	loserUsername: string;
	durationSeconds: number;
	settings: { speedPreset: string; winScore: number };
	// Progression stats (tracked by game engine during play)
	ballReturns: number;
	maxDeficit: number;
	reachedDeuce: boolean;
}
