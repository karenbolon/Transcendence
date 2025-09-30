//router.ts

import type { Route } from './types';

const DEFAULT_ROUTE: Route = '#/home';
const ALLOWED: Route[] = ['#/home', '#/pong', '#/tournament', '#/leaderboard', '#/auth'];

export function navigate(route: Route) {
	if (location.hash !== route)
		//trigger hash change
		location.hash = route;
	else
		//if already on that hash, still force it to render
		window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function currentRoute(): Route {
	const h = (location.hash || DEFAULT_ROUTE) as Route;
	return (ALLOWED.includes(h) ? h : DEFAULT_ROUTE) as Route;
}

export function startRouter(onChange: (route: Route) => void) {
	if (!location.hash)
		location.hash = DEFAULT_ROUTE;
	const handler = () => onChange(currentRoute());
	window.addEventListener('hashchange', handler);
	//initial render
	handler();
}