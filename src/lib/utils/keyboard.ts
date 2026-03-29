/** Create a keydown handler that calls `fn` when Escape is pressed. */
export function onEscape(fn: () => void) {
	return (e: KeyboardEvent) => {
		if (e.key === 'Escape') fn();
	};
}
