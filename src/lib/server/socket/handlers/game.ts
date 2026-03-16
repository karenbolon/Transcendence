import type { Socket } from 'socket.io';
import { getIO, userSockets } from '../index';
import { getFriendIds } from '$lib/server/db/helpers_queries';
import {
	createRoom,
	getRoom,
	getRoomByPlayer,
	isPlayerInGame,
} from '../game/RoomManager';
import type { GameStateSnapshot } from '$lib/types/game';

// Track active game invites: inviteId → invite data
const activeInvites = new Map<string, {
	fromUserId: number;
	fromUsername: string;
	toUserId: number;
	settings: { speedPreset: string; winScore: number };
	timeout: ReturnType<typeof setTimeout>;
}>();

// Track which users are currently in a game
// export const usersInGame = new Set<number>();

/** Broadcast game state to all sockets of both players in a room */
function broadcastState(roomId: string, state: GameStateSnapshot): void {
	const io = getIO();
	const room = getRoom(roomId);
	if (!room) return;

	//const snapshot = state;
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
	socket.on('game:invite', async (data: { friendId: number; settings?: { speedPreset: string; winScore: number } }) => {
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

		const resolvedSettings = settings ?? { speedPreset: 'normal', winScore: 5 };

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
	});

	// Accept an invite
	socket.on('game:invite-accept', (data: { inviteId: string }) => {
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
		createRoom(
			roomId,
			{ userId: invite.fromUserId, username: invite.fromUsername },
			{ userId, username },
			invite.settings,
			broadcastState,
			broadcastEvent,
		);

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
		if (challengerSockets) {
			for (const sid of challengerSockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}

		// Notify accepter
		const accepterSockets = userSockets.get(userId);
		if (accepterSockets) {
			for (const sid of accepterSockets) {
				io.to(sid).emit('game:start', gameData);
			}
		}
	});

	// ── Join a game room (called when player navigates to game page) ─
	socket.on('game:join-room', (data: { roomId: string }) => {
		const room = getRoom(data.roomId);
		if (!room || !room.hasPlayer(userId)) {
			socket.emit('game:error', { message: 'Game room not found' });
			return;
		}

		// Register this socket in the room
		room.addSocket(userId, socket.id);

		// Tell the client which side they play (left paddle or right paddle)
		const side = userId === room.player1.userId ? 'left' : 'right';
		socket.emit('game:joined', {
			roomId: data.roomId,
			side,
			player1: { userId: room.player1.userId, username: room.player1.username },
			player2: { userId: room.player2.userId, username: room.player2.username },
		});

		// If both players now have at least one socket connected, start the game
		if (room.player1.socketIds.size > 0 && room.player2.socketIds.size > 0) {
			room.start();
		}
	});

	// ── Paddle input during game ────────────────────────────────
	socket.on('game:paddle-move', (data: { direction: 'up' | 'down' | 'stop' }) => {
		const room = getRoomByPlayer(userId);
		if (!room) return;
		room.handleInput(userId, data.direction);
	});

	// Decline an invite
	socket.on('game:invite-decline', (data: { inviteId: string }) => {
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
	});

	// ── Leave / forfeit a game (immediate, no reconnect timer) ─
	socket.on('game:leave', () => {
		const room = getRoomByPlayer(userId);
		if (!room) return;
		room.forfeitByPlayer(userId);
	});

	// Clean up on disconnect
	socket.on('disconnect', () => {
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
}
