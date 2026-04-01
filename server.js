import { createServer } from 'http';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join, extname } from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { handler } from './build/handler.js';
import { createMatchQueue } from './server.matchmaking.js';
import { createInviteManager } from './server.invites.js';
import { registerChatHandlers } from './server.chat.js';
import { registerGameHandlers } from './server.game-handlers.js';
import { registerTournamentHandlers } from './server.tournament-handlers.js';
import { createTournamentRuntime } from './server.tournament-runtime.js';
import { createProgressionRuntime } from './server.progression-runtime.js';
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
const sql = postgres(DATABASE_URL, { prepare: false });

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
const inviteManager = createInviteManager();

function emitToSocketIds(socketIds, event, data) {
	if (!socketIds) return;
	for (const socketId of socketIds) {
		io.to(socketId).emit(event, data);
	}
}

function emitToUser(userId, event, data) {
	emitToSocketIds(userSockets.get(userId), event, data);
}

function emitToUsers(userIds, event, data) {
	for (const userId of userIds) emitToUser(userId, event, data);
}

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

async function hasFriendshipStatus(userId, otherUserId, relationshipStatus) {
	const [row] = await sql`
		SELECT id FROM friendships
		WHERE status = ${relationshipStatus}
		  AND (
			(user_id = ${userId} AND friend_id = ${otherUserId})
			OR
			(user_id = ${otherUserId} AND friend_id = ${userId})
		  )
		LIMIT 1
	`;
	return Boolean(row);
}

function areFriends(userId, otherUserId) {
	return hasFriendshipStatus(userId, otherUserId, 'accepted');
}

function isBlocked(userId, otherUserId) {
	return hasFriendshipStatus(userId, otherUserId, 'blocked');
}

// ── Helper: notify all online friends ─────────────────────────────
async function notifyFriends(userId, event, data) {
	const friendIds = await getFriendIds(userId);
	emitToUsers(friendIds, event, data);
}

function registerSocketForUser(userId, socketId) {
	if (!userSockets.has(userId)) userSockets.set(userId, new Set());
	const sockets = userSockets.get(userId);
	const wasOffline = sockets.size === 0;
	sockets.add(socketId);
	return wasOffline;
}

function unregisterSocketForUser(userId, socketId) {
	const sockets = userSockets.get(userId);
	if (!sockets) return true;
	sockets.delete(socketId);
	if (sockets.size > 0) return false;
	userSockets.delete(userId);
	return true;
}

function setUserOnlineStatus(userId, username, isOnline) {
	const event = isOnline ? 'friend:online' : 'friend:offline';
	return sql`UPDATE users SET is_online = ${isOnline} WHERE id = ${userId}`
		.then(() => notifyFriends(userId, event, { userId, username }))
		.catch(() => {});
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

// ── Power-Up System (mirrors src/lib/game/powerups/) ────────────────

const POWERUP_CONFIG = {
	bigPaddle:       { duration: 10, positive: true,  spawnWeight: 3 },
	smallPaddle:     { duration: 10, positive: false, spawnWeight: 3 },
	reverseControls: { duration: 8,  positive: false, spawnWeight: 1 },
	freeze:          { duration: 3,  positive: false, spawnWeight: 1 },
	invisibleBall:   { duration: 8,  positive: false, spawnWeight: 1 },
	wall:            { duration: 10, positive: true,  spawnWeight: 1 },
	magnet:          { duration: 8,  positive: true,  spawnWeight: 1 },
	speedBall:       { duration: 8,  positive: false, spawnWeight: 2 },
	slowBall:        { duration: 8,  positive: true,  spawnWeight: 2 },
};

const POWERUP_RADIUS = 15;
const POWERUP_SPAWN_X_MIN = CANVAS_WIDTH * 0.25;
const POWERUP_SPAWN_X_MAX = CANVAS_WIDTH * 0.75;
const POWERUP_SPAWN_Y_MIN = 40;
const POWERUP_SPAWN_Y_MAX = CANVAS_HEIGHT - 40;
const POWERUP_COOLDOWN_MIN = 4;
const POWERUP_COOLDOWN_MAX = 4;
const WALL_WIDTH = 8;
const WALL_HEIGHT = 100;

function spawnPowerUp(state) {
	const types = Object.entries(POWERUP_CONFIG);
	const totalWeight = types.reduce((sum, [, cfg]) => sum + cfg.spawnWeight, 0);
	let roll = Math.random() * totalWeight;
	let chosenType = types[0][0];
	for (const [type, cfg] of types) {
		roll -= cfg.spawnWeight;
		if (roll <= 0) { chosenType = type; break; }
	}
	state.powerUpItem = {
		type: chosenType,
		x: POWERUP_SPAWN_X_MIN + Math.random() * (POWERUP_SPAWN_X_MAX - POWERUP_SPAWN_X_MIN),
		y: POWERUP_SPAWN_Y_MIN + Math.random() * (POWERUP_SPAWN_Y_MAX - POWERUP_SPAWN_Y_MIN),
		radius: POWERUP_RADIUS,
		active: true,
	};
}

function collectPowerUp(state, item) {
	const collector = state.lastBallHitter ?? 'player1';
	const opponent = collector === 'player1' ? 'player2' : 'player1';
	const config = POWERUP_CONFIG[item.type];
	if (!config) return;
	const target = config.positive ? collector : opponent;
	const existing = state.activeEffects.find(e => e.type === item.type && e.target === target);
	if (existing) { existing.remainingTime = config.duration; return; }
	state.activeEffects.push({ type: item.type, target, remainingTime: config.duration, duration: config.duration });
	if (item.type === 'speedBall' || item.type === 'slowBall') {
		const multiplier = item.type === 'speedBall' ? 1.5 : 0.6;
		state.currentBallSpeed *= multiplier;
		const currentSpeed = Math.sqrt(state.ballVX ** 2 + state.ballVY ** 2);
		if (currentSpeed > 0) {
			const scale = state.currentBallSpeed / currentSpeed;
			state.ballVX *= scale;
			state.ballVY *= scale;
		}
	}
}

function onEffectExpired(state, effect, settings) {
	if (effect.type === 'speedBall' || effect.type === 'slowBall') {
		const multiplier = effect.type === 'speedBall' ? 1.5 : 0.6;
		state.currentBallSpeed /= multiplier;
		const currentSpeed = Math.sqrt(state.ballVX ** 2 + state.ballVY ** 2);
		if (currentSpeed > 0) {
			const scale = state.currentBallSpeed / currentSpeed;
			state.ballVX *= scale;
			state.ballVY *= scale;
		}
	}
}

function applyContinuousEffects(state, dt) {
	for (const effect of state.activeEffects) {
		if (effect.type === 'wall') {
			const wallX = effect.target === 'player1'
				? PADDLE_OFFSET + PADDLE_WIDTH + 60
				: CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH - 68;
			const wallY = CANVAS_HEIGHT / 2 - WALL_HEIGHT / 2;
			if (
				state.ballX + BALL_RADIUS >= wallX &&
				state.ballX - BALL_RADIUS <= wallX + WALL_WIDTH &&
				state.ballY + BALL_RADIUS >= wallY &&
				state.ballY - BALL_RADIUS <= wallY + WALL_HEIGHT
			) {
				state.ballVX = -state.ballVX;
				if (state.ballVX > 0) { state.ballX = wallX + WALL_WIDTH + BALL_RADIUS; }
				else { state.ballX = wallX - BALL_RADIUS; }
			}
		}
		if (effect.type === 'magnet') {
			const approaching =
				(effect.target === 'player1' && state.ballVX < 0) ||
				(effect.target === 'player2' && state.ballVX > 0);
			if (approaching) {
				const paddleCenterY = effect.target === 'player1'
					? state.paddle1Y + PADDLE_HEIGHT / 2
					: state.paddle2Y + PADDLE_HEIGHT / 2;
				const dy = paddleCenterY - state.ballY;
				state.ballVY += Math.sign(dy) * 250 * dt;
			}
		}
	}
}

function updatePowerUps(state, dt, settings) {
	if (!state.powerUpItem) {
		state.powerUpCooldown -= dt;
		if (state.powerUpCooldown <= 0) spawnPowerUp(state);
	}
	if (state.powerUpItem && state.powerUpItem.active) {
		const dx = state.ballX - state.powerUpItem.x;
		const dy = state.ballY - state.powerUpItem.y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < BALL_RADIUS + state.powerUpItem.radius) {
			collectPowerUp(state, state.powerUpItem);
			state.powerUpItem = null;
			state.powerUpCooldown = POWERUP_COOLDOWN_MIN + Math.random() * (POWERUP_COOLDOWN_MAX - POWERUP_COOLDOWN_MIN);
		}
	}
	const effects = state.activeEffects;
	for (let i = effects.length - 1; i >= 0; i--) {
		effects[i].remainingTime -= dt;
		if (effects[i].remainingTime <= 0) {
			onEffectExpired(state, effects[i], settings);
			effects.splice(i, 1);
		}
	}
	applyContinuousEffects(state, dt);
}

function getEffectivePaddleHeight(state, player) {
	let height = PADDLE_HEIGHT;
	for (const effect of state.activeEffects) {
		if (effect.target !== player) continue;
		if (effect.type === 'bigPaddle') height *= 2;
		if (effect.type === 'smallPaddle') height *= 0.5;
	}
	return height;
}

function isFrozen(state, player) {
	return state.activeEffects.some(e => e.type === 'freeze' && e.target === player);
}

function isReversed(state, player) {
	return state.activeEffects.some(e => e.type === 'reverseControls' && e.target === player);
}

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
		// Power-ups
		powerUpsEnabled: false,
		powerUpItem: null,
		activeEffects: [],
		powerUpCooldown: 4,
		lastBallHitter: null,
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
	// Re-apply any still-active speed modifiers so they persist across the point
	for (const effect of state.activeEffects) {
		if (effect.type === 'speedBall') state.currentBallSpeed *= 1.5;
		if (effect.type === 'slowBall') state.currentBallSpeed *= 0.6;
	}
	state.ballSpin = 0;
	const direction = Math.random() > 0.5 ? 1 : -1;
	// state.ballVX = settings.ballSpeed * direction;
	// state.ballVY = settings.ballSpeed * (Math.random() - 0.5);
	state.ballVX = state.currentBallSpeed * direction;
	state.ballVY = state.currentBallSpeed * (Math.random() - 0.5);
	state.powerUpItem = null;
	state.powerUpCooldown = POWERUP_COOLDOWN_MIN + Math.random() * (POWERUP_COOLDOWN_MAX - POWERUP_COOLDOWN_MIN);
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
	const p1Frozen = isFrozen(state, 'player1');
	const p2Frozen = isFrozen(state, 'player2');
	const p1Reversed = isReversed(state, 'player1');
	const p2Reversed = isReversed(state, 'player2');
	if (!p1Frozen) {
		const up = p1Reversed ? input.paddle1Down : input.paddle1Up;
		const down = p1Reversed ? input.paddle1Up : input.paddle1Down;
		if (up)   state.paddle1Y -= PADDLE_SPEED * dt;
		if (down) state.paddle1Y += PADDLE_SPEED * dt;
	}
	if (!p2Frozen) {
		const up = p2Reversed ? input.paddle2Down : input.paddle2Up;
		const down = p2Reversed ? input.paddle2Up : input.paddle2Down;
		if (up)   state.paddle2Y -= PADDLE_SPEED * dt;
		if (down) state.paddle2Y += PADDLE_SPEED * dt;
	}
	const p1Height = getEffectivePaddleHeight(state, 'player1');
	const p2Height = getEffectivePaddleHeight(state, 'player2');
	state.paddle1Y = Math.max(0, Math.min(CANVAS_HEIGHT - p1Height, state.paddle1Y));
	state.paddle2Y = Math.max(0, Math.min(CANVAS_HEIGHT - p2Height, state.paddle2Y));
	state.paddle1VY = dt > 0 ? (state.paddle1Y - prevP1Y) / dt : 0;
	state.paddle2VY = dt > 0 ? (state.paddle2Y - prevP2Y) / dt : 0;
}

function handlePaddleBounce(state, paddleY, direction, settings, paddleVY, paddleHeight) {
	if (paddleHeight === undefined) paddleHeight = PADDLE_HEIGHT;
	const paddleCenter = paddleY + paddleHeight / 2;
	const offset = (state.ballY - paddleCenter) / (paddleHeight / 2);
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
	const p1Height = getEffectivePaddleHeight(state, 'player1');
	const p2Height = getEffectivePaddleHeight(state, 'player2');
	if (state.ballVX < 0 &&
		state.ballX - BALL_RADIUS <= PADDLE_OFFSET + PADDLE_WIDTH &&
		state.ballX + BALL_RADIUS >= PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle1Y &&
		state.ballY - BALL_RADIUS <= state.paddle1Y + p1Height) {
		state.ballReturns++;
		state.lastBallHitter = 'player1';
		handlePaddleBounce(state, state.paddle1Y, 1, settings, state.paddle1VY, p1Height);
	}
	const p2Left = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
	if (state.ballVX > 0 &&
		state.ballX + BALL_RADIUS >= p2Left &&
		state.ballX - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle2Y &&
		state.ballY - BALL_RADIUS <= state.paddle2Y + p2Height) {
		state.ballReturns++;
		state.lastBallHitter = 'player2';
		handlePaddleBounce(state, state.paddle2Y, -1, settings, state.paddle2VY, p2Height);
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
		if (settings.powerUps) {
			updatePowerUps(state, dt, settings);
		}
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
	// Only delete playerRoomMap entries if they still point to THIS room.
	// In tournaments, advanceWinner → createRoom may have already reassigned
	// the winner to a new room — we must not delete that new mapping.
	if (playerRoomMap.get(room.player1.userId) === roomId) {
		playerRoomMap.delete(room.player1.userId);
	}
	if (playerRoomMap.get(room.player2.userId) === roomId) {
		playerRoomMap.delete(room.player2.userId);
	}
	activeRooms.delete(roomId);
}

function broadcastRoomState(roomId, state) {
	const room = getGameRoom(roomId);
	if (!room) return;
	emitToSocketIds(room.player1.socketIds, 'game:state', state);
	emitToSocketIds(room.player2.socketIds, 'game:state', state);
}

function broadcastRoomEvent(roomId, event, data) {
	const room = getGameRoom(roomId);
	if (!room) return;
	emitToSocketIds(room.player1.socketIds, event, data);
	emitToSocketIds(room.player2.socketIds, event, data);
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
			powerUps: settings.powerUps ?? true,
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
			powerUpItem: this.state.powerUpItem ? {
				type: this.state.powerUpItem.type,
				x: this.state.powerUpItem.x,
				y: this.state.powerUpItem.y,
				radius: this.state.powerUpItem.radius,
			} : null,
			activeEffects: (this.state.activeEffects || []).map(e => ({
				type: e.type,
				target: e.target,
				remainingTime: e.remainingTime,
				duration: e.duration,
			})),
			lastBallHitter: this.state.lastBallHitter,
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
			socketLog.warn({ roomId }, 'Game room timed out before both players joined');
			destroyGameRoom(roomId);
		}
	}, 30000);

	return room;
}

// ── Matchmaking Queue ─────────────────────────────────────────────
const matchmaking = createMatchQueue();

function startGameFromQueueMatch(match) {
	const roomId = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	createGameRoom(roomId, { userId: match.player1.userId, username: match.player1.username }, { userId: match.player2.userId, username: match.player2.username }, match.settings);
	const gameData = {
		roomId,
		player1: { userId: match.player1.userId, username: match.player1.username, avatarUrl: match.player1.avatarUrl, displayName: match.player1.displayName },
		player2: { userId: match.player2.userId, username: match.player2.username, avatarUrl: match.player2.avatarUrl, displayName: match.player2.displayName },
		settings: match.settings,
	};
	emitToUsers([match.player1.userId, match.player2.userId], 'game:start', gameData);
}

async function notifyFriendsOfQueueChange(userId, username, mode, action) {
	const friendIds = await getFriendIds(userId);
	emitToUsers(friendIds, 'game:queue-friend-update', { userId, username, mode, action });
}

// Periodic queue scanner
setInterval(() => {
	const matches = matchmaking.scan();
	for (const match of matches) startGameFromQueueMatch(match);
}, 10000);

setInterval(() => {
	const expired = matchmaking.removeExpired();
	for (const userId of expired) {
		emitToUser(userId, 'game:queue-expired');
	}
}, 30000);

// ── Tournament Manager (inline — mirrors TournamentManager.ts) ────

const activeTournaments = new Map(); // tournamentId → tournament state

function emitToTournamentParticipants(tournamentId, event, data) {
	const tourney = activeTournaments.get(tournamentId);
	if (!tourney) return;
	emitToUsers(tourney.playerMap.keys(), event, data);
}

const tournamentRuntime = createTournamentRuntime({
	activeTournaments,
	emitToUser,
	emitToUsers,
	emitToTournamentParticipants,
	createGameRoom,
	getGameRoom,
	destroyGameRoom,
	sql,
	io,
	logger: logger.child({ component: 'tournament-runtime' }),
});
const {
	generateBracketJS,
	startTournamentRoundMatches,
	advanceTournamentWinner,
} = tournamentRuntime;

const progressionRuntime = createProgressionRuntime({
	sql,
	emitToUser,
	advanceTournamentWinner,
	destroyGameRoom,
	logger: logger.child({ component: 'progression-runtime' }),
});
const { saveOnlineMatch } = progressionRuntime;

// ── Socket.IO connection handler ──────────────────────────────────
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
	const userId = socket.data.userId;
	const username = socket.data.username;

	socketLog.info({ userId, socketId: socket.id }, 'User connected');

	// Register presence, and if this is the first socket mark user online.
	const becameOnline = registerSocketForUser(userId, socket.id);
	if (becameOnline) setUserOnlineStatus(userId, username, true);

	// ── Friend handlers ───────────────────────────────────────────
	// (friend:request, friend:accepted, etc. are emitted from API routes
	//  via server-side socket pushes — they don't need socket handlers here)

	// ── Game Engine (inline — same physics as gameEngine.ts) ─────
	// These constants and functions are copied from src/lib/component/pong/gameEngine.ts
	// because server.js can't import TypeScript/$lib modules.

	// ── Game handlers ─────────────────────────────────────────────
	registerGameHandlers({
		socket,
		userId,
		username,
		getFriendIds,
		areFriends,
		userSockets,
		emitToUser,
		inviteManager,
		isPlayerInGame,
		createGameRoom,
		getGameRoom,
		getRoomByPlayerId,
		activeRooms,
		destroyGameRoom,
		matchmaking,
		startGameFromQueueMatch,
		notifyFriendsOfQueueChange,
	});

	// ═══════════════════════════════════════════════════════════════
	// CHAT HANDLERS
	// ═══════════════════════════════════════════════════════════════
	registerChatHandlers({
		socket,
		userId,
		username,
		sql,
		emitToUser,
		areFriends,
		isBlocked,
	});

	// ═══════════════════════════════════════════════════════════════
	// TOURNAMENT HANDLERS
	// ═══════════════════════════════════════════════════════════════

	registerTournamentHandlers({
		socket,
		io,
		sql,
		logger: logger.child({ component: 'tournament-handlers' }),
		userId,
		username,
		activeTournaments,
		emitToUser,
		emitToTournamentParticipants,
		generateBracketJS,
		startTournamentRoundMatches,
	});

	// ── Disconnect ────────────────────────────────────────────────
	socket.on('disconnect', () => {
		socketLog.info({ userId, socketId: socket.id }, 'User disconnected');

		unregisterSocketForUser(userId, socket.id);

		// Queue cleanup
		if (matchmaking.has(userId)) {
			matchmaking.remove(userId);
			notifyFriendsOfQueueChange(userId, username, null, 'left');
		}

		// Clean up game invites
		inviteManager.removeByUser(userId);

		// Remove socket from active game room (triggers reconnect timer)
		const room = getRoomByPlayerId(userId);
		if (room) {
			room.removeSocket(userId, socket.id);
		}

		// Grace period before marking offline
		setTimeout(() => {
			const remaining = userSockets.get(userId)?.size ?? 0;
			if (remaining === 0) {
				setUserOnlineStatus(userId, username, false);
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
