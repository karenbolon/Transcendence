import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = $state(null);
let connected = $state(false);

export function connectSocket() {
	if (socket?.connected) return;

	socket = io({
		path: '/socket.io',
		withCredentials: true,
		autoConnect: true,
	});

	socket.on('connect', () => {
		connected = true;
		console.log('[Socket] Connected:', socket?.id);
	});

	socket.on('disconnect', () => {
		connected = false;
		console.log('[Socket] Disconnected');
	});

	socket.on('connect_error', (err) => {
		console.warn('[Socket] Connection error:', err.message);
		connected = false;
	});

	socket.on('reconnect', (attempt: number) => {
		console.log(`[Socket] Reconnected after ${attempt} attempt(s)`);
	});

}

export function disconnectSocket() {
	if (socket) {
		socket.disconnect();
		socket = null;
		connected = false;
	}
}

/** Force a fresh socket connection (e.g. after login/register when auth state changed) */
export function reconnectSocket() {
	disconnectSocket();
	connectSocket();
}

export function getSocket(): Socket | null {
	return socket;
}

export function isConnected(): boolean {
	return connected;
}

/** Reactive object — use `socketState.connected` in templates for reliable reactivity */
// export const socketState = {
// 	get connected() { return connected; }
// };
