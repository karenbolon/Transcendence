
/*
main.ts is the bootstraps app (entry file) -- this runs first in the browser 
and starts things up: the router, registers features (auth, pong, tournament...), 
and mounts the first screen
*/
import "../styles.css";
import Pong from "./modules/pong";
import Auth from "./modules/auth";
import Leaderboard from "./modules/leaderboard";
import { api } from "./client";
import type { MountCtx } from "./types";

const modules = [Pong, Auth, Leaderboard];

function mountModule() {
	let path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
	if (path === "" || path === "/")
		path = "/pong";

	const main = document.querySelector("main");
	if (!main) return;

	// Clear main content
	main.innerHTML = "";

	// Find the module for current route
	const mod = modules.find(m => m.route.toLowerCase() === path);
	if (mod) {
		// Create a container for the module
		const container = document.createElement("div");
		main.appendChild(container);

		const ctx: MountCtx = {
			container, 
			navigate: (p) => { window.history.pushState({}, "", p); mountModule(); },
			api,
		};
		mod.mount(ctx);
	} else {
		main.innerHTML = "<h2>Not found</h2>";
	}
}

window.addEventListener("DOMContentLoaded", mountModule);
window.addEventListener("popstate", mountModule); 
