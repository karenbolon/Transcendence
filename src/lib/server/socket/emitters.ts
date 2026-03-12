import { getIO, userSockets } from './index';

/**
 * Emit an event to a specific user (all their connected tabs).
 * Silently does nothing if Socket.IO is not initialized or user is offline.
 */
export function emitToUser(userId: number, event: string, data: Record<string, unknown>) {
	try {
		const io = getIO();
		const socketIds = userSockets.get(userId);
		if (!socketIds) return;

		for (const socketId of socketIds) {
			io.to(socketId).emit(event, data);
		}
	} catch {
		// Socket.IO not initialized (e.g., during tests) — silently skip
	}
}
