// welcome/homepage
// must export it so it can be used in index.ts

export function renderHome(container: HTMLElement) {
	container.innerHTML = `
	<div class="flex flex-col items-center justify-center min-h-[400px]">
		<h1 class="text-3xl font-bold mb-6">Welcome to Pong!</h1>
		<p class="mb-8 text-lg">Choose your game mode from the menubar.</p>
	</div>
	`;
}
