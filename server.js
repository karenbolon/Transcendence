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

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
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
	chill:  { ballSpeed: 200, maxBallSpeed: 400 },
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
		handlePaddleBounce(state, state.paddle1Y, 1, settings, state.paddle1VY);
	}
	const p2Left = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
	if (state.ballVX > 0 &&
		state.ballX + BALL_RADIUS >= p2Left &&
		state.ballX - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle2Y &&
		state.ballY - BALL_RADIUS <= state.paddle2Y + PADDLE_HEIGHT) {
		handlePaddleBounce(state, state.paddle2Y, -1, settings, state.paddle2VY);
	}
}

function checkScoring(state, settings) {
	if (state.ballX + BALL_RADIUS < 0) {
		state.score2++;
		state.scoreFlash = 'right';
		state.scoreFlashTimer = 0.5;
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
		endGameState(this.state, winner.username);
		const result = {
			roomId: this.roomId,
			player1: { userId: this.player1.userId, username: this.player1.username, score: this.state.score1 },
			player2: { userId: this.player2.userId, username: this.player2.username, score: this.state.score2 },
			winnerId: winner.userId, winnerUsername: winner.username,
			loserId: loser.userId, loserUsername: loser.username,
			durationSeconds: Math.round(this.state.playTime),
			settings: this.rawSettings,
		};
		broadcastRoomEvent(this.roomId, 'game:forfeit', result);
		// Clear playerRoomMap immediately so players can challenge again
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

/** Save online match result to database */
async function saveOnlineMatch(result) {
	try {
		const finishedAt = new Date();
		const startedAt = new Date(finishedAt.getTime() - result.durationSeconds * 1000);
		const p1Won = result.winnerId === result.player1.userId;
		const p2Won = result.winnerId === result.player2.userId;

		await sql`
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

		// Update player 1 stats
		await sql`
			UPDATE users SET
				games_played = games_played + 1,
				wins = wins + ${p1Won ? 1 : 0},
				losses = losses + ${p1Won ? 0 : 1},
				updated_at = ${finishedAt}
			WHERE id = ${result.player1.userId}
		`;

		// Update player 2 stats
		await sql`
			UPDATE users SET
				games_played = games_played + 1,
				wins = wins + ${p2Won ? 1 : 0},
				losses = losses + ${p2Won ? 0 : 1},
				updated_at = ${finishedAt}
			WHERE id = ${result.player2.userId}
		`;

		console.log(`[GameRoom] Match saved: ${result.winnerUsername} won ${result.roomId}`);
	} catch (err) {
		console.error('[GameRoom] Failed to save match:', err);
	} finally {
		destroyGameRoom(result.roomId);
	}
}

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
		room.forfeitByPlayer(userId);
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
