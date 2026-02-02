import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { messages } from '../schema';
import { eq } from 'drizzle-orm';
import { cleanDatabase, createTestUsers, createTestGame } from './test-utils';

describe('Messages Schema - Integration Tests', () => {
	beforeEach(async () => {
		await cleanDatabase();
	});

	describe('CREATE operations', () => {
		it('should create a message with defaults', async () => {
			const [sender, recipient] = await createTestUsers(2);
			const game = await createTestGame(sender.id, recipient.id, { status: 'active' });

			const [message] = await db
				.insert(messages)
				.values({
					sender_id: sender.id,
					recipient_id: recipient.id,
					game_id: game.id,
					content: 'Hello there'
				})
				.returning();

			expect(message.sender_id).toBe(sender.id);
			expect(message.recipient_id).toBe(recipient.id);
			expect(message.game_id).toBe(game.id);
			expect(message.type).toBe('chat');
			expect(message.is_read).toBe(false);
			expect(message.created_at).toBeInstanceOf(Date);
		});
	});

	describe('READ operations', () => {
		it('should read messages by sender', async () => {
			const [sender, recipient] = await createTestUsers(2);

			await db
				.insert(messages)
				.values({
					sender_id: sender.id,
					recipient_id: recipient.id,
					content: 'Ping'
				})
				.returning();

			const found = await db.select().from(messages).where(eq(messages.sender_id, sender.id));

			expect(found).toHaveLength(1);
		});
	});

	describe('UPDATE operations', () => {
		it('should mark a message as read', async () => {
			const [sender, recipient] = await createTestUsers(2);

			const [message] = await db
				.insert(messages)
				.values({
					sender_id: sender.id,
					recipient_id: recipient.id,
					content: 'Read me'
				})
				.returning();

			const readAt = new Date();
			await db
				.update(messages)
				.set({ is_read: true, read_at: readAt })
				.where(eq(messages.id, message.id));

			const [updated] = await db.select().from(messages).where(eq(messages.id, message.id));

			expect(updated.is_read).toBe(true);
			expect(updated.read_at).toBeInstanceOf(Date);
		});
	});

	describe('FOREIGN KEY constraints', () => {
		it('should require valid sender_id', async () => {
			await expect(
				db.insert(messages).values({
					sender_id: 999999,
					content: 'Invalid sender'
				})
			).rejects.toThrow();
		});
	});
});
