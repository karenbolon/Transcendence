// Menubar UI component

import { navigate } from "../router";
import type { Route } from "../types";

export function renderMenuBar(container: HTMLElement) {
	container.innerHTML = `
		<aside class="fixed top-0 right-0 h-full w-64 bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 shadow-lg z-40 flex flex-col items-start gap-4 p-4">
		  <nav class="w-full flex flex-col gap-2">
			<h2 class="text-xl font-semibold mb-2">Menu</h2>
			<div id="app-nav" class="flex flex-col gap-2 w-full">
				<button data-route="#/home" 
				  class="text-left rounded px-3 py-2 bg-gray-100 dark:hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors w-full">Home
				</button>
				<button data-route="#/pong" 
				  class="text-left rounded px-3 py-2 bg-gray-100 dark:hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors w-full">Pong
				</button>
				<button data-route="#/tournament" 
				  class="text-left rounded px-3 py-2 bg-gray-100 dark:hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors w-full">Tournament
				</button>
				<button data-route="#/leaderboard" 
				  class="text-left rounded px-3 py-2 bg-gray-100 dark:hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors w-full">Leaderboard
				</button>
				<button data-route="#/login" 
				  class="text-left rounded px-3 py-2 bg-gray-100 dark:hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors w-full">Login
				</button>
			</div>
		  </nav>
		</aside>
	`;

		// Always re-attach event listeners after rendering
		setTimeout(() => {
			const nav = container.querySelector('#app-nav');
			if (nav) {
				nav.addEventListener('click', (e) => {
					const btn = (e.target as HTMLElement).closest('button[data-route]') as HTMLButtonElement | null;
					if (!btn) return;
					e.preventDefault();
					navigate(btn.dataset.route as Route);
				});
			}
		}, 0);
}