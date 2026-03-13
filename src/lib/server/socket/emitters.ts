import { getIO, userSockets } from './index';

/**
 * Emit an event to a specific user (all their connected tabs).
 * Silently does nothing if Socket.IO is not initialized or user is offline.
 *
 * In dev: uses Vite-loaded module state (getIO/userSockets).
 * In production: uses globalThis set by server.js.
 */
export function emitToUser(userId: number, event: string, data: Record<string, unknown>) {
	try {
		// Production: Socket.IO lives in server.js, exposed via globalThis
		const prodIO = (globalThis as any).__socketIO;
		const prodSockets = (globalThis as any).__userSockets as Map<number, Set<string>> | undefined;

		const io = prodIO ?? getIO();
		const socketMap = prodSockets ?? userSockets;
		const socketIds = socketMap.get(userId);
		if (!socketIds) return;

		for (const socketId of socketIds) {
			io.to(socketId).emit(event, data);
		}
	} catch {
		// Socket.IO not initialized (e.g., during tests) — silently skip
	}
}
