import { createServer } from 'http';
import { handler } from '../build/handler.js';
import { initSocketIO } from './lib/server/socket/index.js';
import { socketAuthMiddleware, registerPresence } from './lib/server/socket/auth.js';
import { registerFriendHandlers } from './lib/server/socket/handlers/friends.js';
import { registerGameHandlers } from './lib/server/socket/handlers/game.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const socketLog = logger.child({ component: 'socket.io' });
const serverLog = logger.child({ component: 'server' });

const PORT = process.env.PORT || 3000;

const httpServer = createServer(handler);
const io = initSocketIO(httpServer);

// Auth middleware — runs before connection is established
io.use(socketAuthMiddleware);

// Connection handler
io.on('connection', (socket) => {
	socketLog.info({ userId: socket.data.userId, socketId: socket.id }, 'User connected');

	// Register presence tracking (online/offline)
	registerPresence(socket);

	// Register friend handlers (notifications + status)
	registerFriendHandlers(socket);
	// Register game handlers (invites, matches, etc.)
	registerGameHandlers(socket);

	socket.on('disconnect', () => {
			socketLog.info({ userId: socket.data.userId, socketId: socket.id }, 'User disconnected');
	});
});

httpServer.listen(PORT, () => {
	serverLog.info({ port: PORT }, `Running on http://localhost:${PORT}`);
});
