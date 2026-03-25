import { createServer } from 'http';
import { createReadStream, existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { handler } from './build/handler.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const socketLog = logger.child({ component: 'socket.io' });
const serverLog = logger.child({ component: 'server' });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Serve runtime-uploaded avatars from build/client/avatars/uploads
const __dirname = import.meta.dirname ?? import.meta.url.replace('file://', '').replace(/\/[^/]*$/, '');
const uploadsDir = join(__dirname, 'build', 'client', 'avatars', 'uploads');

const MIME_TYPES = {
	'.webp': 'image/webp',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
};

function uploadsHandler(req, res, next) {
	if (!req.url.startsWith('/avatars/uploads/')) return next();

	const filename = req.url.slice('/avatars/uploads/'.length).split('?')[0];
	// Prevent path traversal
	if (filename.includes('..') || filename.includes('/')) return next();

	const filepath = join(uploadsDir, filename);
	const ext = extname(filename).toLowerCase();
	const mime = MIME_TYPES[ext];

	if (!mime) return next();

	stat(filepath).then((info) => {
		res.writeHead(200, {
			'Content-Type': mime,
			'Content-Length': info.size,
			'Cache-Control': 'public, max-age=31536000, immutable',
		});
		createReadStream(filepath).pipe(res);
	}).catch(() => next());
}

// Create HTTP server with uploads handler + SvelteKit handler
const httpServer = createServer((req, res) => {
	uploadsHandler(req, res, () => handler(req, res));
});

// Attach Socket.IO to the same HTTP server
const io = new SocketIOServer(httpServer, {
	cors: {
		origin: true,
		credentials: true,
	},
	path: '/socket.io',
	pingTimeout: 60000,
});

// ── Socket.IO Auth Middleware ──────────────────────────────────────
// We can't import the bundled SvelteKit server modules directly,
// so we duplicate the minimal auth logic here for production.
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || process.env.DB_URL;
const sql = postgres(DATABASE_URL);

function parseCookies(cookieHeader) {
	const cookies = {};
	for (const pair of cookieHeader.split(';')) {
		const [key, ...rest] = pair.trim().split('=');
		if (key) cookies[key] = rest.join('=');
	}
	return cookies;
}

// Map userId → Set of socketIds
const userSockets = new Map();

async function socketAuthMiddleware(socket, next) {
	try {
		const cookieHeader = socket.handshake.headers.cookie ?? '';
		const cookies = parseCookies(cookieHeader);

		// Lucia uses 'auth_session' cookie by default
		const sessionId = cookies['auth_session'];
		if (!sessionId) {
			return next(new Error('No session cookie'));
		}

		// Validate session directly against the database
		const sessions = await sql`
			SELECT s.id, s.user_id, s.expires_at,
			       u.id as uid, u.username, u.name, u.avatar_url, u.is_deleted
			FROM sessions s
			JOIN users u ON u.id = s.user_id
			WHERE s.id = ${sessionId}
		`;

		if (sessions.length === 0) {
			return next(new Error('Invalid session'));
		}

		const session = sessions[0];

		if (new Date(session.expires_at) < new Date()) {
			return next(new Error('Session expired'));
		}

		if (session.is_deleted) {
			return next(new Error('User deleted'));
		}

		socket.data.userId = Number(session.uid);
		socket.data.username = session.username;
		socket.data.displayName = session.name ?? null;
		socket.data.avatarUrl = session.avatar_url ?? null;

		next();
	} catch (err) {
		socketLog.error({ err: err.message }, 'Auth error');
		next(new Error('Authentication failed'));
	}
}

// ── Helper: get friend IDs ────────────────────────────────────────
async function getFriendIds(userId) {
	const rows = await sql`
		SELECT CASE WHEN user_id = ${userId} THEN friend_id ELSE user_id END AS friend_id
		FROM friendships
		WHERE status = 'accepted'
		  AND (user_id = ${userId} OR friend_id = ${userId})
	`;
	return rows.map(r => Number(r.friend_id));
}

// ── Helper: notify all online friends ─────────────────────────────
async function notifyFriends(userId, event, data) {
	const friendIds = await getFriendIds(userId);
	for (const friendId of friendIds) {
		const friendSocketIds = userSockets.get(friendId);
		if (friendSocketIds) {
			for (const socketId of friendSocketIds) {
				io.to(socketId).emit(event, data);
			}
		}
	}
}

// ── Game Engine (inline copy of gameEngine.ts — plain JS) ────────
// Must stay in sync with src/lib/component/pong/gameEngine.ts

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const PADDLE_OFFSET = 30;
const PADDLE_SPEED = 500;
const BALL_RADIUS = 8;
const BALL_SPEED_INCREMENT = 30;
const MAX_BOUNCE_ANGLE = 0.89;
const SCORE_PAUSE_DURATION = 0.9;
const SPIN_FACTOR = 0.6;
const SPIN_ACCELERATION = 800;
const SPIN_DECAY = 0.97;

const SPEED_CONFIGS = {
	chill:  { ballSpeed: 300, maxBallSpeed: 400 },
	normal: { ballSpeed: 500, maxBallSpeed: 600 },
	fast:   { ballSpeed: 700, maxBallSpeed: 1100 },
};

function createGameState() {
	return {
		phase: 'menu',
		paddle1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
		paddle2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
		ballX: CANVAS_WIDTH / 2,
		ballY: CANVAS_HEIGHT / 2,
		ballVX: 0, ballVY: 0,
		currentBallSpeed: 0,
		ballSpin: 0, ballRotation: 0,
		paddle1VY: 0, paddle2VY: 0,
		score1: 0, score2: 0,
		winner: '',
		playTime: 0,
		countdownTimer: 0, countdownDisplay: '',
		scorePause: 0, scoreFlash: null, scoreFlashTimer: 0,
		ballReturns: 0,
		maxDeficit: 0,
		reachedDeuce: false,
	};
}

function resetPositions(state) {
	state.paddle1Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
	state.paddle2Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
	state.ballX = CANVAS_WIDTH / 2;
	state.ballY = CANVAS_HEIGHT / 2;
	state.ballVX = 0; state.ballVY = 0;
	state.ballSpin = 0; state.ballRotation = 0;
	state.paddle1VY = 0; state.paddle2VY = 0;
}

function resetBall(state, settings) {
	state.ballX = CANVAS_WIDTH / 2;
	state.ballY = CANVAS_HEIGHT / 2;
	state.currentBallSpeed = settings.ballSpeed;
	state.ballSpin = 0;
	const direction = Math.random() > 0.5 ? 1 : -1;
	state.ballVX = settings.ballSpeed * direction;
	state.ballVY = settings.ballSpeed * (Math.random() - 0.5);
}

function startCountdown(state, settings) {
	state.phase = 'countdown';
	state.countdownTimer = 3.5;
	state.countdownDisplay = '3';
	state.currentBallSpeed = settings.ballSpeed;
	state.playTime = 0;
	resetPositions(state);
}

function startPlaying(state, settings) {
	state.phase = 'playing';
	const direction = Math.random() > 0.5 ? 1 : -1;
	state.ballVX = settings.ballSpeed * direction;
	state.ballVY = settings.ballSpeed * (Math.random() - 0.5);
}

function endGameState(state, winnerName) {
	state.phase = 'gameover';
	state.winner = winnerName;
	state.ballVX = 0;
	state.ballVY = 0;
}

function movePaddles(state, dt, input) {
	const prevP1Y = state.paddle1Y;
	const prevP2Y = state.paddle2Y;
	if (input.paddle1Up)   state.paddle1Y -= PADDLE_SPEED * dt;
	if (input.paddle1Down) state.paddle1Y += PADDLE_SPEED * dt;
	if (input.paddle2Up)   state.paddle2Y -= PADDLE_SPEED * dt;
	if (input.paddle2Down) state.paddle2Y += PADDLE_SPEED * dt;
	state.paddle1Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle1Y));
	state.paddle2Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle2Y));
	state.paddle1VY = dt > 0 ? (state.paddle1Y - prevP1Y) / dt : 0;
	state.paddle2VY = dt > 0 ? (state.paddle2Y - prevP2Y) / dt : 0;
}

function handlePaddleBounce(state, paddleY, direction, settings, paddleVY) {
	const paddleCenter = paddleY + PADDLE_HEIGHT / 2;
	const offset = (state.ballY - paddleCenter) / (PADDLE_HEIGHT / 2);
	const clampedOffset = Math.max(-1, Math.min(1, offset));
	state.currentBallSpeed = Math.min(state.currentBallSpeed + BALL_SPEED_INCREMENT, settings.maxBallSpeed);
	const bounceAngle = clampedOffset * MAX_BOUNCE_ANGLE;
	state.ballVY = state.currentBallSpeed * bounceAngle;
	state.ballVX = state.currentBallSpeed * Math.sqrt(1 - bounceAngle * bounceAngle) * direction;
	state.ballSpin = (paddleVY / PADDLE_SPEED) * SPIN_FACTOR;
	if (direction === 1) {
		state.ballX = PADDLE_OFFSET + PADDLE_WIDTH + BALL_RADIUS;
	} else {
		state.ballX = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH - BALL_RADIUS;
	}
}

function checkPaddleCollision(state, settings) {
	if (state.ballVX < 0 &&
		state.ballX - BALL_RADIUS <= PADDLE_OFFSET + PADDLE_WIDTH &&
		state.ballX + BALL_RADIUS >= PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle1Y &&
		state.ballY - BALL_RADIUS <= state.paddle1Y + PADDLE_HEIGHT) {
		state.ballReturns++;
		handlePaddleBounce(state, state.paddle1Y, 1, settings, state.paddle1VY);
	}
	const p2Left = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
	if (state.ballVX > 0 &&
		state.ballX + BALL_RADIUS >= p2Left &&
		state.ballX - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle2Y &&
		state.ballY - BALL_RADIUS <= state.paddle2Y + PADDLE_HEIGHT) {
		state.ballReturns++;
		handlePaddleBounce(state, state.paddle2Y, -1, settings, state.paddle2VY);
	}
}

function checkScoring(state, settings) {
	if (state.ballX + BALL_RADIUS < 0) {
		state.score2++;
		state.scoreFlash = 'right';
		state.scoreFlashTimer = 0.5;
		// Track max deficit from player 1's perspective
		const deficit = state.score2 - state.score1;
		if (deficit > state.maxDeficit) state.maxDeficit = deficit;
		// Check deuce
		if (state.score1 >= settings.winScore - 1 && state.score2 >= settings.winScore - 1) {
			state.reachedDeuce = true;
		}
		if (state.score2 >= settings.winScore) {
			endGameState(state, 'Player 2');
		} else {
			state.scorePause = SCORE_PAUSE_DURATION;
			resetBall(state, settings);
		}
	}
	if (state.ballX - BALL_RADIUS > CANVAS_WIDTH) {
		state.score1++;
		state.scoreFlash = 'left';
		state.scoreFlashTimer = 0.5;
		// Check deuce
		if (state.score1 >= settings.winScore - 1 && state.score2 >= settings.winScore - 1) {
			state.reachedDeuce = true;
		}
		if (state.score1 >= settings.winScore) {
			endGameState(state, 'Player 1');
		} else {
			state.scorePause = SCORE_PAUSE_DURATION;
			resetBall(state, settings);
		}
	}
}

function updateGame(state, dt, input, settings) {
	if (state.scoreFlashTimer > 0) {
		state.scoreFlashTimer -= dt;
		if (state.scoreFlashTimer <= 0) state.scoreFlash = null;
	}
	if (state.phase === 'countdown') {
		state.countdownTimer -= dt;
		if (state.countdownTimer > 3) state.countdownDisplay = '3';
		else if (state.countdownTimer > 2) state.countdownDisplay = '2';
		else if (state.countdownTimer > 1) state.countdownDisplay = '1';
		else if (state.countdownTimer > 0) state.countdownDisplay = 'GO!';
		else { state.countdownDisplay = 'GO!'; state.countdownTimer = 0; return; }
		movePaddles(state, dt, input);
	} else if (state.phase === 'playing') {
		state.playTime += dt;
		movePaddles(state, dt, input);
		if (state.scorePause > 0) { state.scorePause -= dt; return; }
		// movePaddles(state, dt, input);
		state.ballVY += state.ballSpin * SPIN_ACCELERATION * dt;
		state.ballSpin *= SPIN_DECAY;
		if (Math.abs(state.ballSpin) < 0.001) state.ballSpin = 0;
		state.ballRotation += state.ballSpin * 15 * dt;
		state.ballX += state.ballVX * dt;
		state.ballY += state.ballVY * dt;
		if (state.ballY - BALL_RADIUS <= 0) { state.ballY = BALL_RADIUS; state.ballVY = Math.abs(state.ballVY); }
		if (state.ballY + BALL_RADIUS >= CANVAS_HEIGHT) { state.ballY = CANVAS_HEIGHT - BALL_RADIUS; state.ballVY = -Math.abs(state.ballVY); }
		checkPaddleCollision(state, settings);
		checkScoring(state, settings);
	}
}

// ── GameRoom Class (inline — mirrors GameRoom.ts) ────────────────

const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;
const RECONNECT_TIMEOUT = 15000;

// Room storage
const activeRooms = new Map();      // roomId → room
const playerRoomMap = new Map();     // userId → roomId

function getGameRoom(roomId) { return activeRooms.get(roomId); }
function getRoomByPlayerId(userId) {
	const roomId = playerRoomMap.get(userId);
	return roomId ? activeRooms.get(roomId) : undefined;
}
function isPlayerInGame(userId) { return playerRoomMap.has(userId); }

function destroyGameRoom(roomId) {
	const room = activeRooms.get(roomId);
	if (!room) return;
	room.destroy();
	playerRoomMap.delete(room.player1.userId);
	playerRoomMap.delete(room.player2.userId);
	activeRooms.delete(roomId);
}

function broadcastRoomState(roomId, state) {
	const room = getGameRoom(roomId);
	if (!room) return;
	for (const sid of room.player1.socketIds) { io.to(sid).emit('game:state', state); }
	for (const sid of room.player2.socketIds) { io.to(sid).emit('game:state', state); }
}

function broadcastRoomEvent(roomId, event, data) {
	const room = getGameRoom(roomId);
	if (!room) return;
	for (const sid of room.player1.socketIds) { io.to(sid).emit(event, data); }
	for (const sid of room.player2.socketIds) { io.to(sid).emit(event, data); }
}

class ServerGameRoom {
	constructor(roomId, p1, p2, settings) {
		this.roomId = roomId;
		this.rawSettings = settings;
		this.destroyed = false;
		this.gameEnded = false;
		this.interval = null;
		this.lastTick = 0;
		this.disconnectTimers = new Map();

		const speedConfig = SPEED_CONFIGS[settings.speedPreset] ?? SPEED_CONFIGS.normal;
		this.settings = {
			winScore: settings.winScore,
			ballSpeed: speedConfig.ballSpeed,
			maxBallSpeed: speedConfig.maxBallSpeed,
			gameMode: 'local',
			powerUps: settings.powerUps ?? false,
		};

		const emptyInput = { paddle1Up: false, paddle1Down: false, paddle2Up: false, paddle2Down: false };
		this.player1 = { userId: p1.userId, username: p1.username, socketIds: new Set(), input: { ...emptyInput } };
		this.player2 = { userId: p2.userId, username: p2.username, socketIds: new Set(), input: { ...emptyInput } };
		this.state = createGameState();
	}

	addSocket(userId, socketId) {
		const player = this._getPlayer(userId);
		if (!player) return false;
		player.socketIds.add(socketId);
		const timer = this.disconnectTimers.get(userId);
		if (timer) {
			clearTimeout(timer);
			this.disconnectTimers.delete(userId);
			broadcastRoomEvent(this.roomId, 'game:player-reconnected', { userId });
		}
		return true;
	}

	removeSocket(userId, socketId) {
		const player = this._getPlayer(userId);
		if (!player) return;
		player.socketIds.delete(socketId);
		if (player.socketIds.size === 0 && (this.state.phase === 'playing' || this.state.phase === 'countdown')) {
			broadcastRoomEvent(this.roomId, 'game:player-disconnected', { userId, timeout: RECONNECT_TIMEOUT });
			const timer = setTimeout(() => {
				this.disconnectTimers.delete(userId);
				const opponent = userId === this.player1.userId ? this.player2 : this.player1;
				this._handleForfeit(opponent);
			}, RECONNECT_TIMEOUT);
			this.disconnectTimers.set(userId, timer);
		}
	}

	handleInput(userId, direction) {
		const player = this._getPlayer(userId);
		if (!player) return;
		player.input = { paddle1Up: false, paddle1Down: false, paddle2Up: false, paddle2Down: false };
		if (userId === this.player1.userId) {
			player.input.paddle1Up = direction === 'up';
			player.input.paddle1Down = direction === 'down';
		} else {
			player.input.paddle2Up = direction === 'up';
			player.input.paddle2Down = direction === 'down';
		}
	}

	start() {
		if (this.interval) return;
		startCountdown(this.state, this.settings);
		this.lastTick = Date.now();
		this.interval = setInterval(() => this._tick(), TICK_INTERVAL);
	}

	_tick() {
		if (this.destroyed) return;
		const now = Date.now();
		const dt = (now - this.lastTick) / 1000;
		this.lastTick = now;
		const safeDt = Math.min(dt, 0.05);

		const mergedInput = {
			paddle1Up: this.player1.input.paddle1Up,
			paddle1Down: this.player1.input.paddle1Down,
			paddle2Up: this.player2.input.paddle2Up,
			paddle2Down: this.player2.input.paddle2Down,
		};

		const prevPhase = this.state.phase;
		updateGame(this.state, safeDt, mergedInput, this.settings);

		if (this.state.phase === 'countdown' && this.state.countdownTimer <= 0) {
			startPlaying(this.state, this.settings);
		}

		if (this.state.phase === 'gameover' && prevPhase === 'playing') {
			this._handleGameOver();
			return;
		}

		broadcastRoomState(this.roomId, this._getSnapshot());
	}

	_getSnapshot() {
		return {
			phase: this.state.phase,
			paddle1Y: this.state.paddle1Y, paddle2Y: this.state.paddle2Y,
			ballX: this.state.ballX, ballY: this.state.ballY,
			ballVX: this.state.ballVX, ballVY: this.state.ballVY,
			ballSpin: this.state.ballSpin, ballRotation: this.state.ballRotation,
			score1: this.state.score1, score2: this.state.score2,
			countdownDisplay: this.state.countdownDisplay,
			winner: this.state.winner,
			scoreFlash: this.state.scoreFlash, scoreFlashTimer: this.state.scoreFlashTimer,
			timestamp: Date.now(),
		};
	}

	_handleGameOver() {
		if (this.gameEnded) return;
		this.gameEnded = true;
		this.stop();
		const p1Won = this.state.score1 > this.state.score2;
		const winner = p1Won ? this.player1 : this.player2;
		const loser = p1Won ? this.player2 : this.player1;
		const result = {
			roomId: this.roomId,
			player1: { userId: this.player1.userId, username: this.player1.username, score: this.state.score1 },
			player2: { userId: this.player2.userId, username: this.player2.username, score: this.state.score2 },
			winnerId: winner.userId, winnerUsername: winner.username,
			loserId: loser.userId, loserUsername: loser.username,
			durationSeconds: Math.round(this.state.playTime),
			settings: this.rawSettings,
			ballReturns: this.state.ballReturns ?? 0,
			maxDeficit: this.state.maxDeficit ?? 0,
			reachedDeuce: this.state.reachedDeuce ?? false,
		};
		broadcastRoomState(this.roomId, this._getSnapshot());
		broadcastRoomEvent(this.roomId, 'game:over', result);
		// Clear playerRoomMap immediately so players can challenge again
		// while the async DB save is still running
		playerRoomMap.delete(this.player1.userId);
		playerRoomMap.delete(this.player2.userId);
		saveOnlineMatch(result);
	}

	_handleForfeit(winner) {
		if (this.gameEnded) return;
		this.gameEnded = true;
		this.stop();
		const loser = winner === this.player1 ? this.player2 : this.player1;
		const bothZero = this.state.score1 === 0 && this.state.score2 === 0;
		const gameNotStarted = this.state.phase === 'countdown' || this.state.phase === 'menu';

		if (gameNotStarted || bothZero) {
			const reason = gameNotStarted ? 'Player left before game started' : 'Player disconnected at 0-0';
			broadcastRoomEvent(this.roomId, 'game:cancelled', {
				roomId: this.roomId, reason,
				leftUserId: loser.userId, stayedUserId: winner.userId,
				stayedUsername: winner.username, settings: this.rawSettings,
			});
			return;
		}

		endGameState(this.state, winner.username);
		const result = {
			roomId: this.roomId,
			player1: { userId: this.player1.userId, username: this.player1.username, score: this.state.score1 },
			player2: { userId: this.player2.userId, username: this.player2.username, score: this.state.score2 },
			winnerId: winner.userId, winnerUsername: winner.username,
			loserId: loser.userId, loserUsername: loser.username,
			durationSeconds: Math.round(this.state.playTime),
			settings: this.rawSettings,
			ballReturns: this.state.ballReturns ?? 0,
			maxDeficit: this.state.maxDeficit ?? 0,
			reachedDeuce: this.state.reachedDeuce ?? false,
		};
		broadcastRoomEvent(this.roomId, 'game:forfeit', result);
		playerRoomMap.delete(this.player1.userId);
		playerRoomMap.delete(this.player2.userId);
		saveOnlineMatch(result);
	}

	forfeitByPlayer(userId) {
		const player = this._getPlayer(userId);
		if (!player) return;
		const opponent = userId === this.player1.userId ? this.player2 : this.player1;
		this._handleForfeit(opponent);
	}

	stop() {
		if (this.interval) { clearInterval(this.interval); this.interval = null; }
	}

	destroy() {
		this.destroyed = true;
		this.stop();
		for (const timer of this.disconnectTimers.values()) clearTimeout(timer);
		this.disconnectTimers.clear();
	}

	hasPlayer(userId) {
		return userId === this.player1.userId || userId === this.player2.userId;
	}

	_getPlayer(userId) {
		if (userId === this.player1.userId) return this.player1;
		if (userId === this.player2.userId) return this.player2;
		return null;
	}
}

function createGameRoom(roomId, p1, p2, settings) {
	const room = new ServerGameRoom(roomId, p1, p2, settings);
	activeRooms.set(roomId, room);
	playerRoomMap.set(p1.userId, roomId);
	playerRoomMap.set(p2.userId, roomId);

	// Safety: destroy room if nobody joins within 30 seconds
	room._joinTimeout = setTimeout(() => {
		if (room.player1.socketIds.size === 0 || room.player2.socketIds.size === 0) {
			console.log(`[GameRoom] Room ${roomId} timed out — nobody joined`);
			destroyGameRoom(roomId);
		}
	}, 30000);

	return room;
}

// ── Progression: XP Calculation (mirrors src/lib/server/progression/xp.ts) ──

const XP_TABLE_SIZE = 100;
const BASE_XP = 50;
const GROWTH_FACTOR = 1.3;
let _xpThresholds = null;

function getXpThresholds() {
	if (_xpThresholds) return _xpThresholds;
	_xpThresholds = [0];
	let cumulative = 0;
	for (let i = 1; i <= XP_TABLE_SIZE; i++) {
		cumulative += Math.round(BASE_XP * Math.pow(GROWTH_FACTOR, i - 1));
		_xpThresholds.push(cumulative);
	}
	return _xpThresholds;
}

function calculateMatchXp(result) {
	const bonuses = [];
	const base = result.won ? 50 : 20;
	if (result.won && result.player2Score === 0) {
		bonuses.push({ name: 'levelUpModal.bonuses.shutout', amount: 15 });
	}
	if (result.won && result.currentWinStreak > 0) {
		bonuses.push({ name: 'levelUpModal.bonuses.winStreak', amount: Math.min(result.currentWinStreak * 5, 25) });
	}
	if (result.won && result.maxDeficit >= 2) {
		bonuses.push({ name: 'levelUpModal.bonuses.comeback', amount: 10 });
	}
	const speedBonusMap = { chill: 0, normal: 5, fast: 10 };
	const speedBonus = speedBonusMap[result.speedPreset] ?? 0;
	if (speedBonus > 0) {
		bonuses.push({ name: 'levelUpModal.bonuses.speedBonus', amount: speedBonus });
	}
	const total = base + bonuses.reduce((sum, b) => sum + b.amount, 0);
	return { base, bonuses, total };
}

function getLevelForXp(totalXp) {
	const thresholds = getXpThresholds();
	let level = 0;
	for (let i = 1; i < thresholds.length; i++) {
		if (totalXp >= thresholds[i]) level = i;
		else break;
	}
	const xpAtCurrentLevel = thresholds[level] ?? 0;
	const xpAtNextLevel = thresholds[level + 1] ?? thresholds[level] + 1000;
	return { level, xpIntoLevel: totalXp - xpAtCurrentLevel, xpForNextLevel: xpAtNextLevel - xpAtCurrentLevel };
}

// ── Progression: Achievement Evaluation (mirrors src/lib/server/progression/achievements.ts) ──

const ACHIEVEMENT_CONDITIONS = [
	{ id: 'shutout_bronze', field: 'shutout_wins', threshold: 1 },
	{ id: 'shutout_silver', field: 'shutout_wins', threshold: 10 },
	{ id: 'shutout_gold', field: 'shutout_wins', threshold: 50 },
	{ id: 'streak_bronze', field: 'best_win_streak', threshold: 3 },
	{ id: 'streak_silver', field: 'best_win_streak', threshold: 7 },
	{ id: 'streak_gold', field: 'best_win_streak', threshold: 15 },
	{ id: 'matches_10', field: 'games_played', threshold: 10 },
	{ id: 'matches_50', field: 'games_played', threshold: 50 },
	{ id: 'matches_v_100', field: 'games_played', threshold: 100 },
	{ id: 'matches_v_250', field: 'games_played', threshold: 250 },
	{ id: 'matches_v_500', field: 'games_played', threshold: 500 },
	{ id: 'points_bronze', field: 'total_points_scored', threshold: 50 },
	{ id: 'points_silver', field: 'total_points_scored', threshold: 250 },
	{ id: 'points_gold', field: 'total_points_scored', threshold: 1000 },
	{ id: 'comeback_bronze', field: 'comeback_wins', threshold: 1 },
	{ id: 'comeback_silver', field: 'comeback_wins', threshold: 5 },
	{ id: 'comeback_gold', field: 'comeback_wins', threshold: 20 },
	{ id: 'rally_bronze', field: 'total_ball_returns', threshold: 100 },
	{ id: 'rally_silver', field: 'total_ball_returns', threshold: 500 },
	{ id: 'rally_gold', field: 'total_ball_returns', threshold: 2000 },
];

function evaluateAchievements(stats, existingIds) {
	const newlyUnlocked = [];
	for (const cond of ACHIEVEMENT_CONDITIONS) {
		if (existingIds.has(cond.id)) continue;
		if (stats[cond.field] >= cond.threshold) newlyUnlocked.push(cond.id);
	}
	return newlyUnlocked;
}

// ── Progression: Process match progression for one player (raw SQL version) ──

async function processMatchProgressionSQL(userId, input) {
	// 1. Read or create progression row
	const [existingRow] = await sql`
		SELECT * FROM player_progression WHERE user_id = ${userId}
	`;
	const isFirstGame = !existingRow;
	const current = existingRow ?? {
		current_level: 0, current_xp: 0, total_game_xp: 0, total_xp: 0,
		xp_to_next_level: 50, current_win_streak: 0, best_win_streak: 0,
		total_points_scored: 0, total_ball_returns: 0, shutout_wins: 0,
		comeback_wins: 0, consecutive_days_played: 0, last_played_at: null,
	};

	// 2. Update cumulative stats
	const newWinStreak = input.won ? current.current_win_streak + 1 : 0;
	const newBestStreak = Math.max(current.best_win_streak, newWinStreak);
	const newTotalPoints = current.total_points_scored + input.player1Score;
	const newBallReturns = current.total_ball_returns + input.ballReturns;
	const isShutout = input.won && input.player2Score === 0;
	const newShutoutWins = current.shutout_wins + (isShutout ? 1 : 0);
	const isComeback = input.won && input.maxDeficit >= 2;
	const newComebackWins = current.comeback_wins + (isComeback ? 1 : 0);

	// 3. Calculate XP
	const xpBreakdown = calculateMatchXp({
		won: input.won,
		player1Score: input.player1Score,
		player2Score: input.player2Score,
		winScore: input.winScore,
		speedPreset: input.speedPreset,
		currentWinStreak: newWinStreak,
		ballReturns: input.ballReturns,
		maxDeficit: input.maxDeficit,
	});
	const oldTotalXp = current.total_xp;
	const newTotalXp = oldTotalXp + xpBreakdown.total;

	// 4. Determine levels
	const oldLevelInfo = getLevelForXp(oldTotalXp);
	const newLevelInfo = getLevelForXp(newTotalXp);

	// 5. Consecutive days tracking
	const now = new Date();
	let newConsecutiveDays = current.consecutive_days_played;
	if (current.last_played_at) {
		const diffHours = (now.getTime() - new Date(current.last_played_at).getTime()) / (1000 * 60 * 60);
		if (diffHours >= 20 && diffHours <= 48) newConsecutiveDays++;
		else if (diffHours > 48) newConsecutiveDays = 1;
	} else {
		newConsecutiveDays = 1;
	}

	// 6. Upsert progression row
	if (isFirstGame) {
		await sql`
			INSERT INTO player_progression (user_id, current_level, current_xp, total_game_xp, total_xp,
				xp_to_next_level, current_win_streak, best_win_streak, total_points_scored,
				total_ball_returns, shutout_wins, comeback_wins, consecutive_days_played, last_played_at)
			VALUES (${userId}, ${newLevelInfo.level}, ${newLevelInfo.xpIntoLevel},
				${current.total_game_xp + xpBreakdown.total}, ${newTotalXp}, ${newLevelInfo.xpForNextLevel},
				${newWinStreak}, ${newBestStreak}, ${newTotalPoints}, ${newBallReturns},
				${newShutoutWins}, ${newComebackWins}, ${newConsecutiveDays}, ${now})
		`;
	} else {
		await sql`
			UPDATE player_progression SET
				current_level = ${newLevelInfo.level}, current_xp = ${newLevelInfo.xpIntoLevel},
				total_game_xp = total_game_xp + ${xpBreakdown.total}, total_xp = ${newTotalXp},
				xp_to_next_level = ${newLevelInfo.xpForNextLevel},
				current_win_streak = ${newWinStreak}, best_win_streak = ${newBestStreak},
				total_points_scored = ${newTotalPoints}, total_ball_returns = ${newBallReturns},
				shutout_wins = ${newShutoutWins}, comeback_wins = ${newComebackWins},
				consecutive_days_played = ${newConsecutiveDays}, last_played_at = ${now}
			WHERE user_id = ${userId}
		`;
	}

	// 7. Get games_played for achievements
	const [userRow] = await sql`SELECT games_played FROM users WHERE id = ${userId}`;

	// 8. Evaluate achievements
	const existingAchievements = await sql`
		SELECT achievement_id FROM achievements WHERE user_id = ${userId}
	`;
	const existingIds = new Set(existingAchievements.map(a => a.achievement_id));

	const stats = {
		shutout_wins: newShutoutWins,
		best_win_streak: newBestStreak,
		total_points_scored: newTotalPoints,
		comeback_wins: newComebackWins,
		total_ball_returns: newBallReturns,
		games_played: userRow?.games_played ?? 0,
	};

	const newAchievementIds = evaluateAchievements(stats, existingIds);

	// 9. Insert newly unlocked achievements
	if (newAchievementIds.length > 0) {
		for (const achId of newAchievementIds) {
			await sql`INSERT INTO achievements (user_id, achievement_id) VALUES (${userId}, ${achId})`;
		}
	}

	// 10. Fetch definitions for newly unlocked
	let newAchievementDetails = [];
	if (newAchievementIds.length > 0) {
		newAchievementDetails = await sql`
			SELECT id, name, description, tier FROM achievement_definitions WHERE id = ANY(${newAchievementIds})
		`;
	}

	return {
		xpEarned: xpBreakdown.total,
		bonuses: [{ name: 'Base', amount: xpBreakdown.base }, ...xpBreakdown.bonuses],
		oldLevel: oldLevelInfo.level,
		newLevel: newLevelInfo.level,
		currentXp: newLevelInfo.xpIntoLevel,
		xpForNextLevel: newLevelInfo.xpForNextLevel,
		newAchievements: newAchievementDetails.map(d => ({ id: d.id, name: d.name, description: d.description, tier: d.tier })),
	};
}

/** Save online match result to database */
async function saveOnlineMatch(result) {
	try {
		const finishedAt = new Date();
		const startedAt = new Date(finishedAt.getTime() - result.durationSeconds * 1000);
		const p1Won = result.winnerId === result.player1.userId;
		const p2Won = result.winnerId === result.player2.userId;

		// Use a transaction for atomicity
		await sql.begin(async (tx) => {
			// 1. Insert game record
			await tx`
				INSERT INTO games (type, status, game_mode, player1_id, player2_id, player2_name,
					player1_score, player2_score, winner_id, winner_name, winner_score,
					speed_preset, duration_seconds, started_at, finished_at)
				VALUES ('pong', 'finished', 'online',
					${result.player1.userId}, ${result.player2.userId}, ${result.player2.username},
					${result.player1.score}, ${result.player2.score},
					${result.winnerId}, ${result.winnerUsername}, ${result.settings.winScore},
					${result.settings.speedPreset}, ${result.durationSeconds},
					${startedAt}, ${finishedAt})
			`;

			// 2. Update player 1 stats
			await tx`
				UPDATE users SET
					games_played = games_played + 1,
					wins = wins + ${p1Won ? 1 : 0},
					losses = losses + ${p1Won ? 0 : 1},
					updated_at = ${finishedAt}
				WHERE id = ${result.player1.userId}
			`;

			// 3. Update player 2 stats
			await tx`
				UPDATE users SET
					games_played = games_played + 1,
					wins = wins + ${p2Won ? 1 : 0},
					losses = losses + ${p2Won ? 0 : 1},
					updated_at = ${finishedAt}
				WHERE id = ${result.player2.userId}
			`;
		});

		// 4. Process progression for both players (outside tx — uses its own queries)
		const p1MaxDeficit = result.maxDeficit;
		const p2MaxDeficit = Math.max(0, result.player1.score - result.player2.score);

		const [p1Progression, p2Progression] = await Promise.all([
			processMatchProgressionSQL(result.player1.userId, {
				won: p1Won,
				player1Score: result.player1.score,
				player2Score: result.player2.score,
				winScore: result.settings.winScore,
				speedPreset: result.settings.speedPreset,
				ballReturns: result.ballReturns,
				maxDeficit: p1MaxDeficit,
				reachedDeuce: result.reachedDeuce,
			}),
			processMatchProgressionSQL(result.player2.userId, {
				won: p2Won,
				player1Score: result.player2.score,
				player2Score: result.player1.score,
				winScore: result.settings.winScore,
				speedPreset: result.settings.speedPreset,
				ballReturns: result.ballReturns,
				maxDeficit: p2MaxDeficit,
				reachedDeuce: result.reachedDeuce,
			}),
		]);

		// 5. Emit progression to each player via socket
		const io = globalThis.__socketIO;
		const sockets = globalThis.__userSockets;
		if (io && sockets) {
			for (const [uid, progression] of [[result.player1.userId, p1Progression], [result.player2.userId, p2Progression]]) {
				const playerSockets = sockets.get(uid);
				if (playerSockets) {
					for (const sid of playerSockets) {
						io.to(sid).emit('game:progression', progression);
					}
				}
			}
		}

		console.log(`[GameRoom] Match saved: ${result.winnerUsername} won ${result.roomId}`);
	} catch (err) {
		console.error('[GameRoom] Failed to save match:', err);
	} finally {
		destroyGameRoom(result.roomId);
	}
}

// ── Matchmaking Queue (inline — mirrors MatchmakingQueue.ts) ──────

const matchQueue = new Map(); // userId → QueueEntry

function resolveQueueSettings(mode, customSettings) {
	if (mode === 'quick') return { speedPreset: 'normal', winScore: 5 };
	if (mode === 'wild') return { speedPreset: 'normal', winScore: 5 }; // placeholder
	return customSettings;
}

function randomWildSettings() {
	const speeds = ['chill', 'normal', 'fast'];
	const scores = [3, 5, 7, 11];
	return {
		speedPreset: speeds[Math.floor(Math.random() * speeds.length)],
		winScore: scores[Math.floor(Math.random() * scores.length)],
	};
}

// Score-based matchmaking: lower score = better compatibility
const SPEED_ORDER = { chill: 0, normal: 1, fast: 2 };

function queueCompatibilityScore(a, b) {
	const speedA = SPEED_ORDER[a.settings.speedPreset] ?? 1;
	const speedB = SPEED_ORDER[b.settings.speedPreset] ?? 1;
	const speedDiff = Math.abs(speedA - speedB);
	const scoreDiff = Math.abs(a.settings.winScore - b.settings.winScore);
	return speedDiff * 2 + scoreDiff;
}

function maxScoreForEntry(entry, now) {
	if (now >= entry.joinedAt + 90000) return Infinity; // wide
	if (now >= entry.flexibleAt) return 4;               // flexible
	return 0;                                             // exact
}

function tryQueueMatch(a, b) {
	const now = Date.now();
	if (a.mode === 'wild' && b.mode === 'wild') return { player1: a, player2: b, settings: randomWildSettings() };
	if (a.mode === 'wild') return { player1: a, player2: b, settings: b.settings };
	if (b.mode === 'wild') return { player1: a, player2: b, settings: a.settings };

	const score = queueCompatibilityScore(a, b);
	const maxA = maxScoreForEntry(a, now);
	const maxB = maxScoreForEntry(b, now);
	const allowed = Math.max(maxA, maxB);
	if (score > allowed) return null;

	const settings = a.joinedAt <= b.joinedAt ? { ...a.settings } : { ...b.settings };
	return { player1: a, player2: b, settings };
}

function addToMatchQueue(userId, username, avatarUrl, displayName, socketId, mode, customSettings) {
	if (matchQueue.has(userId)) return null;
	const now = Date.now();
	const entry = { userId, username, avatarUrl, displayName, socketId, mode, settings: resolveQueueSettings(mode, customSettings), joinedAt: now, flexibleAt: now + 45000 };
	matchQueue.set(userId, entry);

	// Find BEST match (lowest score), not just first
	let bestResult = null;
	let bestScore = Infinity;
	for (const [otherId, other] of matchQueue) {
		if (otherId === userId) continue;
		const result = tryQueueMatch(entry, other);
		if (result) {
			const s = (entry.mode === 'wild' || other.mode === 'wild') ? -1 : queueCompatibilityScore(entry, other);
			if (s < bestScore) { bestScore = s; bestResult = result; }
		}
	}
	if (bestResult) { matchQueue.delete(bestResult.player1.userId); matchQueue.delete(bestResult.player2.userId); return bestResult; }
	return null;
}

function removeFromMatchQueue(userId) { return matchQueue.delete(userId); }
function isInMatchQueue(userId) { return matchQueue.has(userId); }
function getMatchQueueSize() { return matchQueue.size; }
function getMatchQueuePosition(userId) {
	if (!matchQueue.has(userId)) return 0;
	const entries = Array.from(matchQueue.values()).sort((a, b) => a.joinedAt - b.joinedAt);
	return entries.findIndex(e => e.userId === userId) + 1;
}
function getMatchQueueEntries(excludeUserId) {
	const result = [];
	for (const [uid, entry] of matchQueue) { if (uid !== excludeUserId) result.push(entry); }
	return result;
}
function getFriendsInMatchQueue(friendIds) {
	const result = [];
	for (const fid of friendIds) { const e = matchQueue.get(fid); if (e) result.push(e); }
	return result;
}
function scanMatchQueue() {
	const matches = [];
	const matched = new Set();
	const entries = Array.from(matchQueue.values());
	for (let i = 0; i < entries.length; i++) {
		if (matched.has(entries[i].userId)) continue;
		let bestResult = null;
		let bestScore = Infinity;
		for (let j = i + 1; j < entries.length; j++) {
			if (matched.has(entries[j].userId)) continue;
			const result = tryQueueMatch(entries[i], entries[j]);
			if (result) {
				const s = (entries[i].mode === 'wild' || entries[j].mode === 'wild') ? -1 : queueCompatibilityScore(entries[i], entries[j]);
				if (s < bestScore) { bestScore = s; bestResult = result; }
			}
		}
		if (bestResult) {
			matches.push(bestResult);
			matched.add(bestResult.player1.userId);
			matched.add(bestResult.player2.userId);
			matchQueue.delete(bestResult.player1.userId);
			matchQueue.delete(bestResult.player2.userId);
		}
	}
	return matches;
}
function removeExpiredFromQueue() {
	const now = Date.now();
	const expired = [];
	for (const [userId, entry] of matchQueue) {
		if (now - entry.joinedAt > 5 * 60 * 1000) { matchQueue.delete(userId); expired.push(userId); }
	}
	return expired;
}

function startGameFromQueueMatch(match) {
	const roomId = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	createGameRoom(roomId, { userId: match.player1.userId, username: match.player1.username }, { userId: match.player2.userId, username: match.player2.username }, match.settings);
	const gameData = {
		roomId,
		player1: { userId: match.player1.userId, username: match.player1.username, avatarUrl: match.player1.avatarUrl, displayName: match.player1.displayName },
		player2: { userId: match.player2.userId, username: match.player2.username, avatarUrl: match.player2.avatarUrl, displayName: match.player2.displayName },
		settings: match.settings,
	};
	for (const uid of [match.player1.userId, match.player2.userId]) {
		const sockets = userSockets.get(uid);
		if (sockets) { for (const sid of sockets) { io.to(sid).emit('game:start', gameData); } }
	}
}

async function notifyFriendsOfQueueChange(userId, username, mode, action) {
	const friendIds = await getFriendIds(userId);
	for (const fid of friendIds) {
		const sockets = userSockets.get(fid);
		if (sockets) { for (const sid of sockets) { io.to(sid).emit('game:queue-friend-update', { userId, username, mode, action }); } }
	}
}

// Periodic queue scanner
setInterval(() => {
	const matches = scanMatchQueue();
	for (const match of matches) startGameFromQueueMatch(match);
}, 10000);

setInterval(() => {
	const expired = removeExpiredFromQueue();
	for (const userId of expired) {
		const sockets = userSockets.get(userId);
		if (sockets) { for (const sid of sockets) { io.to(sid).emit('game:queue-expired'); } }
	}
}, 30000);

// ── Socket.IO connection handler ──────────────────────────────────
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
	const userId = socket.data.userId;
	const username = socket.data.username;

	socketLog.info({ userId, socketId: socket.id }, 'User connected');

	// Register presence
	if (!userSockets.has(userId)) {
		userSockets.set(userId, new Set());
	}
	userSockets.get(userId).add(socket.id);

	// If first socket, mark online
	if (userSockets.get(userId).size === 1) {
		sql`UPDATE users SET is_online = true WHERE id = ${userId}`
			.then(() => notifyFriends(userId, 'friend:online', { userId, username }))
			.catch(() => {});
	}

	// ── Friend handlers ───────────────────────────────────────────
	// (friend:request, friend:accepted, etc. are emitted from API routes
	//  via server-side socket pushes — they don't need socket handlers here)

	// ── Game Engine (inline — same physics as gameEngine.ts) ─────
	// These constants and functions are copied from src/lib/component/pong/gameEngine.ts
	// because server.js can't import TypeScript/$lib modules.

	// ── Game handlers ─────────────────────────────────────────────
	const activeInvites = globalThis.__activeInvites || (globalThis.__activeInvites = new Map());

	socket.on('game:invite', async (data) => {
		const { friendId, settings } = data;

		if (friendId === userId) return;

		const friendIds = await getFriendIds(userId);
		if (!friendIds.includes(friendId)) {
			socket.emit('game:error', { message: 'You can only challenge friends' });
			return;
		}

		if (!userSockets.has(friendId)) {
			socket.emit('game:error', { message: 'Player is offline' });
			return;
		}

		if (isPlayerInGame(userId)) {
			socket.emit('game:error', { message: 'You are already in a game' });
			return;
		}
		if (isPlayerInGame(friendId)) {
			socket.emit('game:error', { message: 'Player is already in a game' });
			return;
		}

		const inviteId = `${userId}-${friendId}-${Date.now()}`;
		const resolvedSettings = settings ?? { speedPreset: 'normal', winScore: 5 };

		const timeout = setTimeout(() => {
			activeInvites.delete(inviteId);
			socket.emit('game:invite-expired', { inviteId });
			const targetSockets = userSockets.get(friendId);
			if (targetSockets) {
				for (const sid of targetSockets) {
					io.to(sid).emit('game:invite-expired', { inviteId });
				}
			}
		}, 30000);

		activeInvites.set(inviteId, {
			fromUserId: userId,
			fromUsername: username,
			toUserId: friendId,
			settings: resolvedSettings,
			timeout,
		});

		const targetSockets = userSockets.get(friendId);
		if (targetSockets) {
			for (const sid of targetSockets) {
				io.to(sid).emit('game:invite', {
					inviteId,
					fromUserId: userId,
					fromUsername: username,
					fromDisplayName: socket.data.displayName,
					fromAvatarUrl: socket.data.avatarUrl,
					settings: resolvedSettings,
				});
			}
		}
	});

	socket.on('game:invite-accept', (data) => {
		const invite = activeInvites.get(data.inviteId);
		if (!invite || invite.toUserId !== userId) return;

		clearTimeout(invite.timeout);
		activeInvites.delete(data.inviteId);

		const roomId = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		// Create the game room
		createGameRoom(
			roomId,
			{ userId: invite.fromUserId, username: invite.fromUsername },
			{ userId, username },
			invite.settings,
		);

		const gameData = {
			roomId,
			player1: { userId: invite.fromUserId, username: invite.fromUsername },
			player2: { userId, username },
			settings: invite.settings,
		};

		const challengerSockets = userSockets.get(invite.fromUserId);
		if (challengerSockets) {
			for (const sid of challengerSockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}
		const accepterSockets = userSockets.get(userId);
		if (accepterSockets) {
			for (const sid of accepterSockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}
	});

	socket.on('game:invite-decline', (data) => {
		const invite = activeInvites.get(data.inviteId);
		if (!invite || invite.toUserId !== userId) return;

		clearTimeout(invite.timeout);
		activeInvites.delete(data.inviteId);

		const challengerSockets = userSockets.get(invite.fromUserId);
		if (challengerSockets) {
			for (const sid of challengerSockets) {
				io.to(sid).emit('game:invite-declined', { fromUsername: username });
			}
		}
	});

	// ── Join a game room ──────────────────────────────────────────
	socket.on('game:join-room', (data) => {
		const room = getGameRoom(data.roomId);
		if (!room || !room.hasPlayer(userId)) {
			socket.emit('game:error', { message: 'Game room not found' });
			return;
		}

		room.addSocket(userId, socket.id);

		const side = userId === room.player1.userId ? 'left' : 'right';
		socket.emit('game:joined', {
			roomId: data.roomId,
			side,
			player1: { userId: room.player1.userId, username: room.player1.username },
			player2: { userId: room.player2.userId, username: room.player2.username },
		});

		if (room.player1.socketIds.size > 0 && room.player2.socketIds.size > 0) {
			// Clear the join timeout since both players are in
			if (room._joinTimeout) { clearTimeout(room._joinTimeout); room._joinTimeout = null; }
			room.start();
		}
	});

	// ── Paddle input ──────────────────────────────────────────────
	socket.on('game:paddle-move', (data) => {
		const room = getRoomByPlayerId(userId);
		if (!room) return;
		room.handleInput(userId, data.direction);
	});

	// ── Leave / forfeit ───────────────────────────────────────────
	socket.on('game:leave', () => {
		const room = getRoomByPlayerId(userId);
		if (!room) return;
		const roomId = room.roomId;
		const opponentUserId = userId === room.player1.userId ? room.player2.userId : room.player1.userId;
		const opponentUsername = userId === room.player1.userId ? room.player2.username : room.player1.username;
		const settings = room.rawSettings;
		const snapshot = room._getSnapshot();
		const gameNotStarted = snapshot.phase === 'countdown' || snapshot.phase === 'menu';
		const isCancellable = gameNotStarted || (snapshot.score1 === 0 && snapshot.score2 === 0);

		room.forfeitByPlayer(userId);
		if (activeRooms.has(roomId)) destroyGameRoom(roomId);

		// Re-queue the remaining player if game was cancelled
		if (isCancellable && !isInMatchQueue(opponentUserId) && !isPlayerInGame(opponentUserId)) {
			const opponentSockets = userSockets.get(opponentUserId);
			if (opponentSockets && opponentSockets.size > 0) {
				const firstSocketId = opponentSockets.values().next().value;
				const match = addToMatchQueue(opponentUserId, opponentUsername, null, null, firstSocketId, 'custom', settings);
				if (match) {
					startGameFromQueueMatch(match);
				} else {
					for (const sid of opponentSockets) {
						io.to(sid).emit('game:queue-joined', { queueSize: getMatchQueueSize(), position: getMatchQueuePosition(opponentUserId) });
					}
				}
			}
		}
	});

	// ── Queue handlers ───────────────────────────────────────────
	socket.on('game:queue-join', async (data) => {
		if (isPlayerInGame(userId)) { socket.emit('game:error', { message: 'You are already in a game' }); return; }
		if (isInMatchQueue(userId)) { socket.emit('game:error', { message: 'You are already in the queue' }); return; }

		const match = addToMatchQueue(userId, username, socket.data.avatarUrl ?? null, socket.data.displayName ?? null, socket.id, data.mode, data.settings);
		if (match) {
			startGameFromQueueMatch(match);
			notifyFriendsOfQueueChange(match.player1.userId, match.player1.username, match.player1.mode, 'matched');
			notifyFriendsOfQueueChange(match.player2.userId, match.player2.username, match.player2.mode, 'matched');
		} else {
			socket.emit('game:queue-joined', { queueSize: getMatchQueueSize(), position: getMatchQueuePosition(userId) });
			notifyFriendsOfQueueChange(userId, username, data.mode, 'joined');
		}
	});

	socket.on('game:queue-leave', () => {
		const wasInQueue = removeFromMatchQueue(userId);
		if (wasInQueue) {
			socket.emit('game:queue-left');
			notifyFriendsOfQueueChange(userId, username, null, 'left');
		}
	});

	socket.on('game:queue-status', async (callback) => {
		const friendIds = await getFriendIds(userId);
		const friendsInQueue = getFriendsInMatchQueue(friendIds);
		const queueEntries = getMatchQueueEntries(userId);
		const response = {
			queueSize: getMatchQueueSize(),
			myPosition: getMatchQueuePosition(userId),
			friendsInQueue: friendsInQueue.map(f => ({ userId: f.userId, username: f.username, mode: f.mode, settings: f.settings })),
			queuePlayers: queueEntries.filter(e => !friendIds.includes(e.userId)).map(e => ({ id: e.userId, username: e.username, displayName: e.displayName, avatarUrl: e.avatarUrl, wins: 0, queueSettings: e.settings })),
		};
		if (typeof callback === 'function') callback(response);
		else socket.emit('game:queue-status', response);
	});

	socket.on('game:invite-cancel', () => {
		for (const [inviteId, invite] of activeInvites) {
			if (invite.fromUserId === userId) {
				clearTimeout(invite.timeout);
				activeInvites.delete(inviteId);
				const targetSockets = userSockets.get(invite.toUserId);
				if (targetSockets) { for (const sid of targetSockets) { io.to(sid).emit('game:invite-cancelled', { inviteId }); } }
				break;
			}
		}
	});

	// ── Disconnect ────────────────────────────────────────────────
	socket.on('disconnect', () => {
		socketLog.info({ userId, socketId: socket.id }, 'User disconnected');

		const sockets = userSockets.get(userId);
		if (sockets) {
			sockets.delete(socket.id);
			if (sockets.size === 0) {
				userSockets.delete(userId);
			}
		}

		// Queue cleanup
		if (isInMatchQueue(userId)) {
			removeFromMatchQueue(userId);
			notifyFriendsOfQueueChange(userId, username, null, 'left');
		}

		// Clean up game invites
		for (const [inviteId, invite] of activeInvites) {
			if (invite.fromUserId === userId || invite.toUserId === userId) {
				clearTimeout(invite.timeout);
				activeInvites.delete(inviteId);
			}
		}

		// Remove socket from active game room (triggers reconnect timer)
		const room = getRoomByPlayerId(userId);
		if (room) {
			room.removeSocket(userId, socket.id);
		}

		// Grace period before marking offline
		setTimeout(() => {
			const remaining = userSockets.get(userId)?.size ?? 0;
			if (remaining === 0) {
				sql`UPDATE users SET is_online = false WHERE id = ${userId}`
					.then(() => notifyFriends(userId, 'friend:offline', { userId, username }))
					.catch(() => {});
			}
		}, 5000);
	});
});

// Make io and userSockets available globally so SvelteKit server code
// (emitters.ts, page.server.ts) can access them in production
globalThis.__userSockets = userSockets;
globalThis.__socketIO = io;

httpServer.listen(PORT, HOST, () => {
	serverLog.info({ host: HOST, port: PORT }, `Listening on http://${HOST}:${PORT}`);
	socketLog.info('Attached to production server');
});
