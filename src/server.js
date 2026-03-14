import { createServer } from 'http';
import { handler } from '../build/handler.js';
import { initSocketIO } from './lib/server/socket/index.js';
import { socketAuthMiddleware, registerPresence } from './lib/server/socket/auth.js';
import { registerFriendHandlers } from './lib/server/socket/handlers/friends.js';
import { registerGameHandlers } from './lib/server/socket/handlers/game.js';

const PORT = process.env.PORT || 3000;

const httpServer = createServer(handler);
const io = initSocketIO(httpServer);

// Auth middleware — runs before connection is established
io.use(socketAuthMiddleware);

// Connection handler
io.on('connection', (socket) => {
	console.log(`[Socket.IO] User ${socket.data.userId} connected (${socket.id})`);

	// Register presence tracking (online/offline)
	registerPresence(socket);

	// Register friend handlers (notifications + status)
	registerFriendHandlers(socket);
	// Register game handlers (invites, matches, etc.)
	registerGameHandlers(socket);

	socket.on('disconnect', () => {
			console.log(`[Socket.IO] User ${socket.data.userId} disconnected (${socket.id})`);
	});
});

httpServer.listen(PORT, () => {
	console.log(`[Server] Running on http://localhost:${PORT}`);
});
