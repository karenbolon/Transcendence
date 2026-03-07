import type { Progression } from '$lib/types/progression';

export function mapProgressionRow(row: {
	current_level: number;
	current_xp: number;
	xp_to_next_level: number;
}): Progression {
	return {
			level: row.current_level,
			currentXp: row.current_xp,
			xpToNextLevel: row.xp_to_next_level,
	};
}

export function getDisplayName(user: { displayName?: string | null; username: string }): string {
	return user.displayName || user.username;
}

export async function postJSON(url: string, body: object) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const data = await res.json();
	return { ok: res.ok, data };
}

export async function fetchJSON(url: string, method: string, body: object) {
	const res = await fetch(url, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const data = await res.json();
	return { ok: res.ok, data };
}

/**
 * Handles a form submission with validation, API call, and state management.
 * Reduces boilerplate for settings forms that all follow the same pattern.
 */
export async function handleFormSubmit(opts: {
	url: string;
	body: object;
	method?: string;
	errorMessage?: string;
	validate?: () => string | undefined;
	onSuccess: (data: Record<string, unknown>) => void;
	onError: (msg: string) => void;
	onLoading: (loading: boolean) => void;
}) {
	const fallback = opts.errorMessage ?? 'Something went wrong.';
	const error = opts.validate?.();
	if (error) {
		opts.onError(error);
		return;
	}

	opts.onLoading(true);
	try {
		const { ok, data } = await fetchJSON(opts.url, opts.method ?? 'POST', opts.body);
		if (!ok) {
			opts.onError((data as Record<string, string>).error ?? fallback);
		} else {
			opts.onSuccess(data as Record<string, unknown>);
		}
	} catch {
		opts.onError(fallback);
	} finally {
		opts.onLoading(false);
	}
}