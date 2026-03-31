import type { Socket } from 'socket.io';
import { db } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { getIO, userSockets } from '../index';
import { getFriendIds } from '$lib/server/db/helpers_queries';
import {
	createRoom,
	getRoom,
	getRoomByPlayer,
	destroyRoom,
	isPlayerInGame,
} from '../game/RoomManager';
import { advanceWinner } from '../../tournament/TournamentManager';
import type { GameStateSnapshot } from '$lib/types/game';
import {
	addToQueue,
	removeFromQueue,
	isInQueue,
	getQueueSize,
	getQueueEntries,
	getQueuePosition,
	getFriendsInQueue,
	scanForMatches,
	removeExpired,
	type QueueMode,
	type MatchResult,
} from '../game/MatchmakingQueue';


/** Emit a system message into both parties' chat panels in real-time */
function pushSystemMessage(senderId: number, recipientId: number, content: string, msgId: number, gameId: number | null = null) {
	const io = getIO();
	const payload = {
		id: msgId,
		senderId,
		senderUsername: '',
		senderAvatar: null,
		recipientId,
		content,
		createdAt: new Date().toISOString(),
		gameId,
		type: 'system',
	};
	// Recipient keyed by senderId in receiveMessage
	const recipientSockets = userSockets.get(recipientId);
	if (recipientSockets) {
		for (const sid of recipientSockets) io.to(sid).emit('chat:message', payload);
	}
	// Sender keyed by recipientId in onMessageSent
	const senderSockets = userSockets.get(senderId);
	if (senderSockets) {
		for (const sid of senderSockets) io.to(sid).emit('chat:sent', payload);
	}
}

// Track active game invites: inviteId → invite data
const activeInvites = new Map<string, {
	fromUserId: number;
	fromUsername: string;
	toUserId: number;
	settings: { speedPreset: string; winScore: number; powerUps?: boolean };
	timeout: ReturnType<typeof setTimeout>;
}>();

// Track which users are currently in a game
// export const usersInGame = new Set<number>();

/** Broadcast game state to all sockets of both players in a room */
function broadcastState(roomId: string, state: GameStateSnapshot): void {
	const io = getIO();
	const room = getRoom(roomId);
	if (!room) return;

	// Uncomment the line below to trace state broadcasts (verbose — 60/s!)
	// console.log(`[broadcastState] room=${roomId} phase=${state.phase} p1_sockets=${room.player1.socketIds.size} p2_sockets=${room.player2.socketIds.size}`);

	for (const sid of room.player1.socketIds) {
		io.to(sid).emit('game:state', state);
	}
	for (const sid of room.player2.socketIds) {
		io.to(sid).emit('game:state', state);
	}
}
/** Broadcast a game event to all sockets of both players */
function broadcastEvent(roomId: string, event: string, data: any): void {
	const io = getIO();
	const room = getRoom(roomId);
	if (!room) return;
	for (const sid of room.player1.socketIds) {
		io.to(sid).emit(event, data);
	}
	for (const sid of room.player2.socketIds) {
		io.to(sid).emit(event, data);
	}
}

export function registerGameHandlers(socket: Socket) {
	const userId: number = socket.data.userId;
	const username: string = socket.data.username;

	// Send a game invite to a friend
	socket.on('game:invite', async (data: { friendId: number; settings?: { speedPreset: string; winScore: number; powerUps?: boolean } }) => {
		const { friendId, settings } = data;

		// Validate: can't invite yourself
		if (friendId === userId) return;

		// Validate: must be friends
		const friendIds = await getFriendIds(userId);
		if (!friendIds.includes(friendId)) {
			socket.emit('game:error', { message: 'You can only challenge friends' });
			return;
		}

		// Validate: target must be online
		if (!userSockets.has(friendId)) {
			socket.emit('game:error', { message: 'Player is offline' });
			return;
		}

		// Validate: neither player is already in a game
		if (isPlayerInGame(userId)) {
			socket.emit('game:error', { message: 'You are already in a game' });
			return;
		}
		if (isPlayerInGame(friendId)) {
			socket.emit('game:error', { message: 'Player is already in a game' });
			return;
		}

		const inviteId = `${userId}-${friendId}-${Date.now()}`;

		// Auto-expire after 30 seconds
		const timeout = setTimeout(() => {
			activeInvites.delete(inviteId);
			socket.emit('game:invite-expired', { inviteId });
			// Notify target too
			const targetSockets = userSockets.get(friendId);
			if (targetSockets) {
				const io = getIO();
				for (const sid of targetSockets) {
					io.to(sid).emit('game:invite-expired', { inviteId });
				}
			}
		}, 30000);

		const resolvedSettings = {
			speedPreset: data?.settings?.speedPreset || 'normal',
			winScore: Number(data?.settings?.winScore || 5),
			powerUps: data?.settings?.powerUps ?? true,
		};

		activeInvites.set(inviteId, {
			fromUserId: userId,
			fromUsername: username,
			toUserId: friendId,
			settings: resolvedSettings,
			timeout,
		});

		// Send invite to target
		const targetSockets = userSockets.get(friendId);
		if (targetSockets) {
			const io = getIO();
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
		// Save system message and push into both chat panels
		const speed = resolvedSettings.speedPreset.charAt(0).toUpperCase() + resolvedSettings.speedPreset.slice(1);
		const pwr = resolvedSettings.powerUps ? 'Power-ups: On' : 'Power-ups: Off';
		const content = `🎮 Game invite sent (${speed}, first to ${resolvedSettings.winScore}, ${pwr})`;
		const [saved] = await db.insert(messages).values({
			sender_id: userId,
			recipient_id: friendId,
			type: 'system',
			content,
		}).returning({ id: messages.id });
		pushSystemMessage(userId, friendId, content, saved.id);
	});

	// Accept an invite
	socket.on('game:invite-accept', async (data: { inviteId: string }) => {
		const invite = activeInvites.get(data.inviteId);
		if (!invite || invite.toUserId !== userId) return;

		// Clear the timeout
		clearTimeout(invite.timeout);
		activeInvites.delete(data.inviteId);

		// Create a game room
		const roomId = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		// Mark both as in game
		// usersInGame.add(invite.fromUserId);
		// usersInGame.add(userId);
		// CREATE THE GAME ROOM — this is where GameRoom gets instantiated
		const room = createRoom(
			roomId,
			{ userId: invite.fromUserId, username: invite.fromUsername },
			{ userId, username },
			invite.settings,
			broadcastState,
			broadcastEvent,
		);
		console.log(`[game:invite-accept] Room created: ${roomId} | P1=${invite.fromUsername}(${invite.fromUserId}) P2=${username}(${userId}) | settings=${JSON.stringify(invite.settings)}`);
		console.log(`[game:invite-accept] Challenger sockets: ${userSockets.get(invite.fromUserId)?.size ?? 0}, Accepter sockets: ${userSockets.get(userId)?.size ?? 0}`);

		const gameData = {
			roomId,
			player1: { userId: invite.fromUserId, username: invite.fromUsername },
			player2: { userId, username },
			settings: invite.settings,
		};


		// Notify both players to go to the game
		const io = getIO();

		// Notify challenger
		const challengerSockets = userSockets.get(invite.fromUserId);
		console.log(`[game:invite-accept] Notifying challenger ${invite.fromUsername} on ${challengerSockets?.size ?? 0} socket(s)`);
		if (challengerSockets) {
			for (const sid of challengerSockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}

		// Notify accepter
		const accepterSockets = userSockets.get(userId);
		console.log(`[game:invite-accept] Notifying accepter ${username} on ${accepterSockets?.size ?? 0} socket(s)`);
		if (accepterSockets) {
			for (const sid of accepterSockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}

		// System message: challenge accepted
		const [acceptSaved] = await db.insert(messages).values({
			sender_id: invite.fromUserId,
			recipient_id: userId,
			type: 'system',
			content: '✅ Challenge accepted — match starting!',
		}).returning({ id: messages.id });
		pushSystemMessage(invite.fromUserId, userId, '✅ Challenge accepted — match starting!', acceptSaved.id);
	});

	// ── Join a game room (called when player navigates to game page) ─
	socket.on('game:join-room', (data: { roomId: string }) => {
		const room = getRoom(data.roomId);

		console.log(`[game:join-room] userId=${userId} (${username}) attempting to join roomId=${data.roomId} | room exists=${!!room} | isPlayer=${room?.hasPlayer(userId)}`);

		if (!room || !room.hasPlayer(userId)) {
			socket.emit('game:error', { message: 'Game room not found' });
			console.warn(`[game:join-room] REJECTED: room not found or user not a player. roomId=${data.roomId}, userId=${userId}`);
			return;
		}

		// Register this socket in the room
		room.addSocket(userId, socket.id);

		console.log(`[game:join-room] After addSocket: P1(${room.player1.username}) sockets=${room.player1.socketIds.size}, P2(${room.player2.username}) sockets=${room.player2.socketIds.size}`);

		// Tell the client which side they play (left paddle or right paddle)
		const side = userId === room.player1.userId ? 'left' : 'right';
		socket.emit('game:joined', {
			roomId: data.roomId,
			side,
			player1: { userId: room.player1.userId, username: room.player1.username },
			player2: { userId: room.player2.userId, username: room.player2.username },
		});

		// Send initial state immediately so the player sees the court before game starts
		socket.emit('game:state', room.getState());

		// If both players now have at least one socket connected, start the game
		const p1Ready = room.player1.socketIds.size > 0;
		const p2Ready = room.player2.socketIds.size > 0;
		if (p1Ready && p2Ready) {
			console.log(`[game:join-room] ✅ Both players present. Starting room ${data.roomId}...`);
			room.start();
		} else {
			console.log(`[game:join-room] ⏳ Waiting: P1 ready=${p1Ready}, P2 ready=${p2Ready}`);
		}
	});

	// ── Paddle input during game ────────────────────────────────
	socket.on('game:paddle-move', (data: { direction: 'up' | 'down' | 'stop' }) => {
		const room = getRoomByPlayer(userId);
		if (!room) return;
		room.handleInput(userId, data.direction);
	});

	// Decline an invite
	socket.on('game:invite-decline', async (data: { inviteId: string }) => {
		const invite = activeInvites.get(data.inviteId);
		if (!invite || invite.toUserId !== userId) return;

		clearTimeout(invite.timeout);
		activeInvites.delete(data.inviteId);

		// Notify challenger
		const challengerSockets = userSockets.get(invite.fromUserId);
		if (challengerSockets) {
			const io = getIO();
			for (const sid of challengerSockets) {
				io.to(sid).emit('game:invite-declined', { fromUsername: username });
			}
		}

		// System message: challenge declined
		const [declineSaved] = await db.insert(messages).values({
			sender_id: invite.fromUserId,
			recipient_id: userId,
			type: 'system',
			content: '❌ Challenge declined',
		}).returning({ id: messages.id });
		pushSystemMessage(invite.fromUserId, userId, '❌ Challenge declined', declineSaved.id);
	});

	// Cancel an invite (challenger changed their mind from waiting room)
	socket.on('game:invite-cancel', async () => {
		for (const [inviteId, invite] of activeInvites) {
			if (invite.fromUserId === userId) {
				clearTimeout(invite.timeout);
				activeInvites.delete(inviteId);

				// Notify the target so their invite modal disappears
				const targetSockets = userSockets.get(invite.toUserId);
				if (targetSockets) {
					const io = getIO();
					for (const sid of targetSockets) {
						io.to(sid).emit('game:invite-cancelled', { inviteId });
					}
				}

				// System message: invite cancelled
				const [cancelSaved] = await db.insert(messages).values({
					sender_id: userId,
					recipient_id: invite.toUserId,
					type: 'system',
					content: '🚫 Game invite cancelled',
				}).returning({ id: messages.id });
				pushSystemMessage(userId, invite.toUserId, '🚫 Game invite cancelled', cancelSaved.id);
				break;
			}
		}
	});

	// ── Leave / forfeit a game (immediate, no reconnect timer) ─
	socket.on('game:leave', async () => {
		const room = getRoomByPlayer(userId);
		if (!room) return;
		const roomId = room.roomId;

		// Guard: if game already ended (e.g., due to disconnect timeout), don't process again
		if (room.hasGameEnded) {
			socket.emit('game:error', { message: 'Game has already ended' });
			return;
		}

		// Grab opponent info BEFORE forfeit destroys the room state
		const opponentUserId = userId === room.player1.userId
			? room.player2.userId : room.player1.userId;
		const opponentUsername = userId === room.player1.userId
			? room.player2.username : room.player1.username;
		const settings = room.matchSettings;
		const snapshot = room.getState();
		const gameNotStarted = snapshot.phase === 'countdown' || snapshot.phase === 'menu';
		const isCancellable = gameNotStarted || (snapshot.score1 === 0 && snapshot.score2 === 0);
		const isTournamentMatch = roomId.startsWith('tournament-');

		console.log(`[DEBUG game:leave] roomId=${roomId} isTournamentMatch=${isTournamentMatch} isCancellable=${isCancellable} score=${snapshot.score1}-${snapshot.score2} phase=${snapshot.phase}`);

		// For tournament matches, trigger opponent's advancement even if forfeit at 0-0
		if (isTournamentMatch && isCancellable) {
			try {
				const parts = roomId.split('-');
				const tournamentId = Number(parts[1]);
				const round = Number(parts[2].replace('r', ''));
				const matchIndex = Number(parts[3].replace('m', ''));
				console.log(`[DEBUG game:leave] calling advanceWinner(tournamentId=${tournamentId}, round=${round}, matchIndex=${matchIndex}, winner=${opponentUserId}, loser=${userId})`);
				// Advance opponent with 1-0 forfeit score
				await advanceWinner(tournamentId, round, matchIndex, opponentUserId, userId, 1, 0);
				console.log(`[DEBUG game:leave] advanceWinner completed`);
			} catch (err) {
				console.error('[Tournament] Forfeit advancement failed:', err);
			}
		}

		console.log(`[DEBUG game:leave] calling forfeitByPlayer for userId=${userId}`);
		room.forfeitByPlayer(userId);

		// If the game was cancelled (0-0 or not started), onGameEnd wasn't called
		// so destroyRoom wasn't triggered — clean up here
		if (getRoom(roomId)) {
			destroyRoom(roomId);
		}

		// Re-queue the remaining player so they don't lose their spot
		// (Only for non-tournament matches; tournament advancement already handled above)
		if (isCancellable && !isTournamentMatch && !isInQueue(opponentUserId) && !isPlayerInGame(opponentUserId)) {
			const opponentSockets = userSockets.get(opponentUserId);
			if (opponentSockets && opponentSockets.size > 0) {
				const firstSocketId = opponentSockets.values().next().value;
				const opponentSocket = userSockets.get(opponentUserId);
				const match = addToQueue(
					opponentUserId,
					opponentUsername,
					null, null,
					firstSocketId!,
					'custom',
					settings as any,
				);
				if (match) {
					startGameFromMatch(match);
				} else {
					// Notify the opponent they're back in queue
					const io = getIO();
					for (const sid of opponentSockets) {
						io.to(sid).emit('game:queue-joined', { queueSize: getQueueSize(), position: getQueuePosition(opponentUserId) });
					}
				}
			}
		}
	});

	// Clean up on disconnect
	socket.on('disconnect', () => {
		// ── Queue cleanup ──
		if (isInQueue(userId)) {
			removeFromQueue(userId);
			notifyFriendsOfQueueChange(userId, username, null, 'left');
		}
		// Cancel any pending invites from this user
		for (const [inviteId, invite] of activeInvites) {
			if (invite.fromUserId === userId || invite.toUserId === userId) {
				clearTimeout(invite.timeout);
				activeInvites.delete(inviteId);
			}
		}
		// Remove socket from active game room (triggers reconnect timer)
		const room = getRoomByPlayer(userId);
		if (room) {
			room.removeSocket(userId, socket.id);
		}
	});
	// ══════════════════════════════════════════════════════════
	// PUBLIC QUEUE
	// ══════════════════════════════════════════════════════════

	// Join the queue
	socket.on('game:queue-join', async (data: {
		mode: QueueMode;
		settings?: { speedPreset: 'chill' | 'normal' | 'fast'; winScore: number; powerUps: boolean };
	}) => {
		// Validate: not already in a game
		if (isPlayerInGame(userId)) {
			socket.emit('game:error', { message: 'You are already in a game' });
			return;
		}
		// Validate: not already in queue
		if (isInQueue(userId)) {
			socket.emit('game:error', { message: 'You are already in the queue' });
			return;
		}

		// Try to add and find an instant match
		const match = addToQueue(
			userId,
			username,
			socket.data.avatarUrl ?? null,
			socket.data.displayName ?? null,
			socket.id,
			data.mode,
			data.settings,
		);

		if (match) {
			// Instant match found! Create the game room.
			startGameFromMatch(match);
			// Notify both players' friends
			notifyFriendsOfQueueChange(match.player1.userId, match.player1.username, match.player1.mode, 'matched');
			notifyFriendsOfQueueChange(match.player2.userId, match.player2.username, match.player2.mode, 'matched');
		} else {
			// No match yet — tell the client they're in queue
			socket.emit('game:queue-joined', { queueSize: getQueueSize(), position: getQueuePosition(userId) });
			// Tell friends this user is searching
			notifyFriendsOfQueueChange(userId, username, data.mode, 'joined');
		}
	});

	// Leave the queue
	socket.on('game:queue-leave', () => {
		const wasInQueue = removeFromQueue(userId);
		if (wasInQueue) {
			socket.emit('game:queue-left');
			notifyFriendsOfQueueChange(userId, username, null, 'left');
		}
	});

	// Get current queue status (called when play page loads)
	socket.on('game:queue-status', async (callback?: (data: any) => void) => {
		const friendIds = await getFriendIds(userId);
		const friendsInQueue = getFriendsInQueue(friendIds);
		const queueEntries = getQueueEntries(userId);

		const response = {
			queueSize: getQueueSize(),
			myPosition: getQueuePosition(userId),
			friendsInQueue: friendsInQueue.map(f => ({
				userId: f.userId,
				username: f.username,
				mode: f.mode,
				settings: f.settings,
			})),
			queuePlayers: queueEntries
				.filter(e => !friendIds.includes(e.userId))
				.map(e => ({
					id: e.userId,
					username: e.username,
					displayName: e.displayName,
					avatarUrl: e.avatarUrl,
					wins: 0,
					queueSettings: e.settings,
				})),
		};

		// Support both callback and emit patterns
		if (typeof callback === 'function') {
			callback(response);
		} else {
			socket.emit('game:queue-status', response);
		}
	});
}

export function startGameFromMatch(match: MatchResult): void {
	const io = getIO();
	const roomId = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	createRoom(
		roomId,
		{ userId: match.player1.userId, username: match.player1.username },
		{ userId: match.player2.userId, username: match.player2.username },
		match.settings,
		broadcastState,
		broadcastEvent,
	);

	const gameData = {
		roomId,
		player1: {
			userId: match.player1.userId,
			username: match.player1.username,
			avatarUrl: match.player1.avatarUrl,
			displayName: match.player1.displayName,
		},
		player2: {
			userId: match.player2.userId,
			username: match.player2.username,
			avatarUrl: match.player2.avatarUrl,
			displayName: match.player2.displayName,
		},
		settings: match.settings,
	};

	// Send game:start to ALL sockets of both players (they might have multiple tabs)
	for (const uid of [match.player1.userId, match.player2.userId]) {
		const sockets = userSockets.get(uid);
		if (sockets) {
			for (const sid of sockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}
	}
}

// ── Helper: notify expired queue players ──
export function notifyExpiredPlayers(expiredUserIds: number[]): void {
	const io = getIO();
	for (const uid of expiredUserIds) {
		const sockets = userSockets.get(uid);
		if (sockets) {
			for (const sid of sockets) {
				io.to(sid).emit('game:queue-expired');
			}
		}
	}
}

// ── Helper: notify a user's friends that their queue status changed ──
export async function notifyFriendsOfQueueChange(
	userId: number,
	username: string,
	mode: QueueMode | null,
	action: 'joined' | 'left' | 'matched'
): Promise<void> {
	const io = getIO();
	const friendIds = await getFriendIds(userId);

	for (const fid of friendIds) {
		const sockets = userSockets.get(fid);
		if (sockets) {
			for (const sid of sockets) {
				io.to(sid).emit('game:queue-friend-update', {
					userId,
					username,
					mode,
					action,
				});
			}
		}
	}
}
