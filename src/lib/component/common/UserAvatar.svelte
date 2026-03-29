<script lang="ts">
	type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
	type StatusState = 'online' | 'playing' | 'away' | 'offline' | null;

	type Props = {
		username: string;
		displayName?: string | null;
		avatarUrl?: string | null;
		size?: AvatarSize;
		status?: StatusState;
	};

	let { username, displayName = null, avatarUrl = null, size = 'md', status = null }: Props = $props();

	const sizeMap: Record<AvatarSize, number> = {
		xs: 24,
		sm: 28,
		md: 44,
		lg: 56,
		xl: 80,
		xxl: 110,
	};

	let px = $derived(sizeMap[size]);
	let initials = $derived.by(() => {
		const source = displayName?.trim() || username;
		const parts = source.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
		}
		return parts[0]?.charAt(0).toUpperCase() ?? '?';
	});

	const AVATAR_COLORS = [
		['#ff6b9d', '#c084fc'],  // pink-purple (original)
		['#4ade80', '#2dd4bf'],  // green-teal
		['#60a5fa', '#818cf8'],  // blue-indigo
		['#facc15', '#f97316'],  // yellow-orange
		['#c084fc', '#6366f1'],  // purple-indigo
		['#f97316', '#ef4444'],  // orange-red
		['#2dd4bf', '#06b6d4'],  // teal-cyan
		['#f472b6', '#e879f9'],  // rose-fuchsia
	];

	let colorPair = $derived.by(() => {
		let hash = 0;
		for (let i = 0; i < username.length; i++) {
			hash = username.charCodeAt(i) + ((hash << 5) - hash);
		}
		return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
	});
</script>

<div class="avatar-wrap" class:has-status={!!status} style="width:{px}px;height:{px}px">
	{#if avatarUrl}
		<img src={avatarUrl} alt="{username}'s avatar" class="avatar-img" />
	{:else}
		<span class="avatar-initial" style="--avatar-gradient: linear-gradient(135deg, {colorPair[0]}, {colorPair[1]})" class:text-xs={size === 'xs'} class:text-sm={size === 'sm'} class:text-md={size === 'md'} class:text-lg={size === 'lg'} class:text-xl={size === 'xl'} class:text-xxl={size === 'xxl'}>
			{initials}
		</span>
	{/if}

	{#if status}
		<span
			class="status-dot"
			class:online={status === 'online'}
			class:playing={status === 'playing'}
			class:away={status === 'away'}
			class:small={size === 'xs' || size === 'sm'}
			class:large={size === 'lg' || size === 'xl' || size === 'xxl'}
		></span>
	{/if}
</div>

<style>
	.avatar-wrap {
		position: relative;
		flex-shrink: 0;
		border-radius: 50%;
		overflow: hidden;
	}

	.avatar-wrap.has-status {
		overflow: visible;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		display: block;
	}

	.avatar-initial {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--avatar-gradient);
		color: #fff;
		font-weight: 700;
		line-height: 1;
	}

	.text-xs { font-size: 0.6rem; }
	.text-sm { font-size: 0.7rem; }
	.text-md { font-size: 0.85rem; }
	.text-lg { font-size: 1.3rem; }
	.text-xl { font-size: 2rem; }
	.text-xxl { font-size: 2.5rem; }

	/* ── Status dot ────────────────────── */
	.status-dot {
		position: absolute;
		bottom: -1px;
		right: -1px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background-color: #6b7280;
		border: 2.5px solid var(--dot-border, #1a1a2e);
	}

	.status-dot.small {
		width: 9px;
		height: 9px;
		border-width: 2px;
	}

	/* Large dot for lg/xl avatars — bigger, bolder, glowy */
	.status-dot.large {
		width: 20px;
		height: 20px;
		border-width: 3px;
		bottom: 0;
		right: 0;
	}

	.status-dot.online {
		background-color: #4ade80;
	}

	.status-dot.playing {
		background-color: #ff6b9d;
		/* box-shadow: 0 0 6px rgba(255, 107, 157, 0.6); */
	}

	.status-dot.away {
		background-color: #facc15;
	}
</style>
