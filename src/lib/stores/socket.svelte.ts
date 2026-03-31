import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = $state(null);
let connected = $state(false);

// Callback to re-register listeners when socket connects
let onConnectCallback: (() => void) | null = null;

export function setOnConnectCallback(callback: () => void) {
	onConnectCallback = callback;
}

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
		// Re-register listeners when socket connects
		if (onConnectCallback) onConnectCallback();
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
		// Re-register listeners on reconnect
		if (onConnectCallback) onConnectCallback();
	});
}

export function disconnectSocket() {
	if (socket) {
		socket.io.opts.reconnection = false;
		socket.removeAllListeners();
		socket.disconnect();
		socket.close();
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
