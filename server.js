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
