import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

// Map userId → Set of socketIds (one user can have multiple tabs)
export const userSockets = new Map<number, Set<string>>();

export function getIO(): SocketIOServer {
	if (!io) throw new Error('Socket.IO server not initialized');
	return io;
}

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
	io = new SocketIOServer(httpServer, {
		cors: {
			origin: true,
			credentials: true,
		},
		path: '/socket.io'
	});
	return io;
}
