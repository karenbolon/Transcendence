// @ts-nocheck
export function createInviteManager({ ttlMs = 30000 } = {}) {
	const invites = new Map();

	/**
	 * @param {{
	 *   fromUserId: number,
	 *   fromUsername: string,
	 *   toUserId: number,
	 *   settings: any,
	 *   onExpire?: (inviteId: string, invite: any) => void
	 * }} params
	 */
	function create(params) {
		const { fromUserId, fromUsername, toUserId, settings, onExpire } = params;
		const inviteId = `${fromUserId}-${toUserId}-${Date.now()}`;
		const timeout = setTimeout(() => {
			const invite = invites.get(inviteId);
			if (!invite) return;
			invites.delete(inviteId);
			onExpire?.(inviteId, invite);
		}, ttlMs);

		invites.set(inviteId, {
			fromUserId,
			fromUsername,
			toUserId,
			settings,
			timeout,
		});

		return { inviteId };
	}

	function accept(inviteId, byUserId) {
		const invite = invites.get(inviteId);
		if (!invite || invite.toUserId !== byUserId) return null;
		clearTimeout(invite.timeout);
		invites.delete(inviteId);
		return invite;
	}

	function decline(inviteId, byUserId) {
		return accept(inviteId, byUserId);
	}

	function cancelBySender(fromUserId) {
		for (const [inviteId, invite] of invites) {
			if (invite.fromUserId !== fromUserId) continue;
			clearTimeout(invite.timeout);
			invites.delete(inviteId);
			return { inviteId, invite };
		}
		return null;
	}

	function removeByUser(userId) {
		for (const [inviteId, invite] of invites) {
			if (invite.fromUserId === userId || invite.toUserId === userId) {
				clearTimeout(invite.timeout);
				invites.delete(inviteId);
			}
		}
	}

	return {
		create,
		accept,
		decline,
		cancelBySender,
		removeByUser,
	};
}
