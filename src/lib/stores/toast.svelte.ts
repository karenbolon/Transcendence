export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'friend' | 'game' | 'badge';

type Toast = {
	id: number;
	type: ToastType;
	icon: string;
	title: string;
	message: string;
	duration: number;
	createdAt: number;
	timeoutId: number;
};

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; duration: number }> = {
	success: { icon: '✓', color: '#22c55e', duration: 4000 },
	error:   { icon: '✗', color: '#ef4444', duration: 5000 },
	info:    { icon: 'ℹ', color: '#60a5fa', duration: 4000 },
	warning: { icon: '⚠️', color: '#eab308', duration: 4000 },
	friend:  { icon: '💜', color: '#a855f7', duration: 4000 },
	game:    { icon: '🎮', color: '#f97316', duration: 4000 },
	badge:   { icon: '🏆', color: '#f59e0b', duration: 5000 },
};

const MAX_TOASTS = 5;

export let toasts: Toast[] = $state([]);
export { TOAST_CONFIG };

// Pending queue — toasts waiting for a slot
const pending: { type: ToastType; title: string; message: string }[] = [];


function showToast(type: ToastType, title: string, message: string) {
	const config = TOAST_CONFIG[type];
	const id = Date.now() + Math.random();

	// Dismiss oldest if at max
	// if (toasts.length >= MAX_TOASTS) {
	// 	dismiss(toasts[toasts.length - 1].id);
	// }

	const timeoutId = window.setTimeout(() => {
		dismiss(id);
	}, config.duration);

	toasts.unshift({
		id,
		type,
		icon: config.icon,
		title,
		message,
		duration: config.duration,
		createdAt: Date.now(),
		timeoutId,
	});
}

function addToast(type: ToastType, title: string, message: string = '') {
	if (toasts.length >= MAX_TOASTS) {
		// Queue it — will show when a slot opens
		pending.push({ type, title, message });
	} else {
		showToast(type, title, message);
	}
}


export function dismiss(id: number) {
	const index = toasts.findIndex((t) => t.id === id);
	if (index !== -1) {
			clearTimeout(toasts[index].timeoutId);
			toasts.splice(index, 1);
	}

	// Show next from queue if there's a slot
	if (pending.length > 0 && toasts.length < MAX_TOASTS) {
		const next = pending.shift()!;
		showToast(next.type, next.title, next.message);
	}
}

export const toast = {
	success: (title: string, message: string = '') => addToast('success', title, message),
	error:   (title: string, message: string = '') => addToast('error', title, message),
	info:    (title: string, message: string = '') => addToast('info', title, message),
	warning: (title: string, message: string = '') => addToast('warning', title, message),
	friend:  (title: string, message: string = '') => addToast('friend', title, message),
	game:    (title: string, message: string = '') => addToast('game', title, message),
	badge:   (title: string, message: string = '') => addToast('badge', title, message),
	dismiss,
	clear: () => {
		while (toasts.length > 0) {
			dismiss(toasts[0].id);
		}
	},
};
