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
}

/** Real-time debug metrics displayed in the game HUD */
export interface DebugMetrics {
	fps: number;
	snapshotDelta: number;   // ms between last two snapshots received
	snapshotJitter: number;  // standard deviation of recent snapshot deltas
	rtt: number;             // round-trip time in ms
	stateAge: number;        // ms since the snapshot was created on server
}
