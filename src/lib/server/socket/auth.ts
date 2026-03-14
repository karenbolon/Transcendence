import { lucia } from '$lib/server/auth/lucia';
import type { Socket } from 'socket.io';
import { userSockets } from './index';

/**
 * Parse a cookie string into key-value pairs.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
	const cookies: Record<string, string> = {};
	for (const pair of cookieHeader.split(';')) {
		const [key, ...rest] = pair.trim().split('=');
		if (key) cookies[key] = rest.join('=');
	}
	return cookies;
}

/**
 * Socket.IO middleware that validates Lucia session from cookies.
 * Attaches userId to socket.data if valid.
 * Rejects connection if no valid session.
 */
export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
	try {
		const cookieHeader = socket.handshake.headers.cookie ?? '';
		const cookies = parseCookies(cookieHeader);
		const sessionId = cookies[lucia.sessionCookieName];

		if (!sessionId) {
			return next(new Error('No session cookie'));
		}

		const { session, user } = await lucia.validateSession(sessionId);

		if (!session || !user || user.is_deleted) {
			return next(new Error('Invalid session'));
		}

		// Attach user info to socket
		socket.data.userId = Number(user.id);
		socket.data.username = user.username;
		socket.data.displayName = user.name ?? null;
		socket.data.avatarUrl = user.avatar_url ?? null;

		next();
	} catch (err) {
		next(new Error('Authentication failed'));
	}
}

/**
 * Register connect/disconnect handlers that manage the userSockets map.
 * Call this after auth middleware succeeds (inside io.on('connection')).
 */
export function registerPresence(socket: Socket) {
	const userId: number = socket.data.userId;

	// Add to userSockets map
	if (!userSockets.has(userId)) {
		userSockets.set(userId, new Set());
	}
	userSockets.get(userId)!.add(socket.id);

	// On disconnect, remove from map
	socket.on('disconnect', () => {
		const sockets = userSockets.get(userId);
		if (sockets) {
			sockets.delete(socket.id);
			if (sockets.size === 0) {
				userSockets.delete(userId);
			}
		}
	});
}
