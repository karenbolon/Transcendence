export type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
	id: number;
	message: string;
	type: ToastType;
};

export let toasts: Toast[] = $state([]);

export function addToast(message: string, type: ToastType = 'info', duration = 3000) {
	const id = Date.now() + Math.random();
	toasts.push({ id, message, type });

	setTimeout(() => {
			removeToast(id);
	}, duration);
}

export function removeToast(id: number) {
	const index = toasts.findIndex((t) => t.id === id);
	if (index !== -1) {
			toasts.splice(index, 1);
	}
}
