//client.ts
//handles API requests and communicats with backend
//need to add the JWT and AUTHENTICATION here

//import { authState } from "./modules/auth/state";
import type { ApiClient } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(method: string, path: string, body?: unknown) {
	const headers: HeadersInit = { "Content-Type": "application/json" };
	const init: RequestInit = { method, headers, credentials: "include" };

	if (body !== undefined)
		init.body = JSON.stringify(body);

	const res = await fetch(`${API_BASE}/api${path}`, init);

	if (!res.ok)
		throw new Error(await res.text());
	
	const ct = res.headers.get("content-type") || "";
	return ct.includes("application/json") ? res.json() : (res.text() as any);
}

export const api: ApiClient = {
	get: (p) => request("GET", p),
	post: (p, b) => request("POST", p , b),
};