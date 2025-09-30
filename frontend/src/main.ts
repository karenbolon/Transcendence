/*
main.ts is the bootstraps app (entry file) -- this runs first in the browser 
and starts things up: the router, registers features (auth, pong, tournament...), 
and mounts the first screen
*/
import "../styles.css";
import { startRouter, navigate} from './router';
import type { Route } from './types';
import { api } from "./client";
import { applySavedTheme, setupDarkModeToggle } from "./ui";
import { renderMenuBar } from "./ui/menubar";
import type { MountCtx } from "./types";

//import modules
import Home from "./modules/home";
import Pong from "./modules/pong";
import Auth from "./modules/auth";
import Leaderboard from "./modules/leaderboard";
import Tournament from "./modules/tournament";

const modules = [ Home, Pong, Tournament, Leaderboard, Auth];

function mountModule(route: Route) {
	console.log('Current route:', route, 'Available:', modules.map(m => m.route));
	//1) render menubar
	const menubar = document.getElementById("game-mode-menu");
	if (menubar) {
		renderMenuBar(menubar);
	}

	//2) Main content
	const main = document.querySelector("main");
	if (!main)
		return;
	main.innerHTML = "";

	// Find the module for current route
	const entry = modules.find(m => m.route === route);
	if (entry) {
		const container = document.createElement("div");
		main.appendChild(container);

		const ctx: MountCtx = {
			container,
			navigate: (r) => navigate(r as Route),
			api,
		};
		entry.mount(ctx);
	} else {
		main.innerHTML = "<h2>Not found</h2>";
	}
}

applySavedTheme();
window.addEventListener("DOMContentLoaded", () => {
	setupDarkModeToggle();
	startRouter(mountModule);
});

