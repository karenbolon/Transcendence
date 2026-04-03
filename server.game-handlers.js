import { z } from 'zod';

const gameSettingsSchema = z.object({
	speedPreset: z.enum(['chill', 'normal', 'fast']).optional(),
	winScore: z.number().int().positive().optional(),
	powerUps: z.boolean().optional(),
});

const gameInviteSchema = z.object({
	friendId: z.number().int().positive(),
	settings: gameSettingsSchema.optional(),
});

const inviteActionSchema = z.object({
	inviteId: z.string().min(1),
});

const gameJoinRoomSchema = z.object({
	roomId: z.string().min(1),
});

const gamePaddleMoveSchema = z.object({
	direction: z.enum(['up', 'down', 'stop']),
});

const queueJoinSchema = z.object({
	mode: z.enum(['quick', 'wild', 'custom']),
	settings: gameSettingsSchema.optional(),
});

export function registerGameHandlers({
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
}) {
	function emitGameError(message) {
		socket.emit('game:error', { message });
	}

	function emitQueueJoined(targetUserId) {
		emitToUser(targetUserId, 'game:queue-joined', {
			queueSize: matchmaking.size(),
			position: matchmaking.position(targetUserId),
		});
	}

	function resolveGameSettings(settings) {
		return {
			speedPreset: settings?.speedPreset || 'normal',
			winScore: Number(settings?.winScore || 5),
			powerUps: settings?.powerUps ?? true,
		};
	}

	function parseOrGameError(schema, data, message = 'Invalid game request') {
		const parsed = schema.safeParse(data);
		if (!parsed.success) {
			emitGameError(message);
			return null;
		}
		return parsed.data;
	}

	socket.on('game:invite', async (data) => {
		const payload = parseOrGameError(gameInviteSchema, data);
		if (!payload) return;
		const { friendId, settings } = payload;

		if (friendId === userId) return;

		if (!(await areFriends(userId, friendId))) {
			emitGameError('You can only challenge friends');
			return;
		}

		if (!userSockets.has(friendId)) {
			emitGameError('Player is offline');
			return;
		}

		if (isPlayerInGame(userId)) {
			emitGameError('You are already in a game');
			return;
		}
		if (isPlayerInGame(friendId)) {
			emitGameError('Player is already in a game');
			return;
		}

		const resolvedSettings = resolveGameSettings(settings);

		const { inviteId } = inviteManager.create({
			fromUserId: userId,
			fromUsername: username,
			toUserId: friendId,
			settings: resolvedSettings,
			onExpire: (expiredInviteId) => {
				socket.emit('game:invite-expired', { inviteId: expiredInviteId });
				emitToUser(friendId, 'game:invite-expired', { inviteId: expiredInviteId });
			},
		});

		emitToUser(friendId, 'game:invite', {
			inviteId,
			fromUserId: userId,
			fromUsername: username,
			fromDisplayName: socket.data.displayName,
			fromAvatarUrl: socket.data.avatarUrl,
			settings: resolvedSettings,
		});
	});

	socket.on('game:invite-accept', (data) => {
		const payload = parseOrGameError(inviteActionSchema, data);
		if (!payload) return;
		const invite = inviteManager.accept(payload.inviteId, userId);
		if (!invite) return;

		const roomId = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		// Create the game room
		createGameRoom(
			roomId,
			{ userId: invite.fromUserId, username: invite.fromUsername },
			{ userId, username },
			invite.settings,
		);

		const gameData = {
			roomId,
			player1: { userId: invite.fromUserId, username: invite.fromUsername },
			player2: { userId, username },
			settings: invite.settings,
		};

		emitToUser(invite.fromUserId, 'game:start', gameData);
		emitToUser(userId, 'game:start', gameData);
	});

	socket.on('game:invite-decline', (data) => {
		const payload = parseOrGameError(inviteActionSchema, data);
		if (!payload) return;
		const invite = inviteManager.decline(payload.inviteId, userId);
		if (!invite) return;

		emitToUser(invite.fromUserId, 'game:invite-declined', { fromUsername: username });
	});

	// ── Join a game room ──────────────────────────────────────────
	socket.on('game:join-room', (data) => {
		const payload = parseOrGameError(gameJoinRoomSchema, data);
		if (!payload) return;
		const room = getGameRoom(payload.roomId);
		if (!room || !room.hasPlayer(userId)) {
			emitGameError('Game room not found');
			return;
		}

		room.addSocket(userId, socket.id);

		const side = userId === room.player1.userId ? 'left' : 'right';
		socket.emit('game:joined', {
			roomId: payload.roomId,
			side,
			player1: { userId: room.player1.userId, username: room.player1.username },
			player2: { userId: room.player2.userId, username: room.player2.username },
		});

		if (room.player1.socketIds.size > 0 && room.player2.socketIds.size > 0) {
			// Clear the join timeout since both players are in
			if (room._joinTimeout) { clearTimeout(room._joinTimeout); room._joinTimeout = null; }
			room.start();
		}
	});

	// ── Paddle input ──────────────────────────────────────────────
	socket.on('game:paddle-move', (data) => {
		const payload = parseOrGameError(gamePaddleMoveSchema, data);
		if (!payload) return;
		const room = getRoomByPlayerId(userId);
		if (!room) return;
		room.handleInput(userId, payload.direction);
	});

	// ── Leave / forfeit ───────────────────────────────────────────
	socket.on('game:leave', () => {
		const room = getRoomByPlayerId(userId);
		if (!room) return;
		const roomId = room.roomId;
		const opponentUserId = userId === room.player1.userId ? room.player2.userId : room.player1.userId;
		const opponentUsername = userId === room.player1.userId ? room.player2.username : room.player1.username;
		const settings = room.rawSettings;
		const snapshot = room._getSnapshot();
		const gameNotStarted = snapshot.phase === 'countdown' || snapshot.phase === 'menu';
		const isCancellable = gameNotStarted || (snapshot.score1 === 0 && snapshot.score2 === 0);

		room.forfeitByPlayer(userId);
		if (activeRooms.has(roomId)) destroyGameRoom(roomId);

		// Re-queue the remaining player if game was cancelled
		if (isCancellable && !matchmaking.has(opponentUserId) && !isPlayerInGame(opponentUserId)) {
			const opponentSockets = userSockets.get(opponentUserId);
			if (opponentSockets && opponentSockets.size > 0) {
				const firstSocketId = opponentSockets.values().next().value;
				const match = matchmaking.add(opponentUserId, opponentUsername, null, null, firstSocketId, 'custom', settings);
				if (match) {
					startGameFromQueueMatch(match);
				} else {
					emitQueueJoined(opponentUserId);
				}
			}
		}
	});

	// ── Queue handlers ───────────────────────────────────────────
	socket.on('game:queue-join', async (data) => {
		const payload = parseOrGameError(queueJoinSchema, data);
		if (!payload) return;
		if (isPlayerInGame(userId)) { emitGameError('You are already in a game'); return; }
		if (matchmaking.has(userId)) { emitGameError('You are already in the queue'); return; }

		const match = matchmaking.add(
			userId,
			username,
			socket.data.avatarUrl ?? null,
			socket.data.displayName ?? null,
			socket.id,
			payload.mode,
			payload.settings,
		);
		if (match) {
			startGameFromQueueMatch(match);
			notifyFriendsOfQueueChange(match.player1.userId, match.player1.username, match.player1.mode, 'matched');
			notifyFriendsOfQueueChange(match.player2.userId, match.player2.username, match.player2.mode, 'matched');
		} else {
			socket.emit('game:queue-joined', {
				queueSize: matchmaking.size(),
				position: matchmaking.position(userId),
			});
			notifyFriendsOfQueueChange(userId, username, payload.mode, 'joined');
		}
	});

	socket.on('game:queue-leave', () => {
		const wasInQueue = matchmaking.remove(userId);
		if (wasInQueue) {
			socket.emit('game:queue-left');
			notifyFriendsOfQueueChange(userId, username, null, 'left');
		}
	});

	socket.on('game:queue-status', async (callback) => {
		const friendIds = await getFriendIds(userId);
		const friendsInQueue = matchmaking.friendsInQueue(friendIds);
		const queueEntries = matchmaking.entries(userId);
		const friendIdSet = new Set(friendIds);
		const response = {
			queueSize: matchmaking.size(),
			myPosition: matchmaking.position(userId),
			friendsInQueue: friendsInQueue.map(f => ({ userId: f.userId, username: f.username, mode: f.mode, settings: f.settings })),
			queuePlayers: queueEntries.filter(e => !friendIdSet.has(e.userId)).map(e => ({ id: e.userId, username: e.username, displayName: e.displayName, avatarUrl: e.avatarUrl, wins: 0, queueSettings: e.settings })),
		};
		if (typeof callback === 'function') callback(response);
		else socket.emit('game:queue-status', response);
	});

	socket.on('game:invite-cancel', () => {
		const cancelled = inviteManager.cancelBySender(userId);
		if (!cancelled) return;
		emitToUser(cancelled.invite.toUserId, 'game:invite-cancelled', {
			inviteId: cancelled.inviteId,
		});
	});
}
