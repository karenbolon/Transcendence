//client.ts

import { authState } from "./modules/auth/state";
import type { ApiClient } from "./types";

//const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE = import.meta.env.VITE_API_URL || "";
const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE || "session") as "session" | "jwt";

async function request(method: string, path: string, body?: unknown) {
	const headers: HeadersInit = { "Content-Type": "application/json" };
	const init: RequestInit = { method, headers, credentials: "include" };

	if (AUTH_MODE === "jwt" && authState.accessToken) {
		headers["Auhtorization"] = 'Bearer ${authState.accessToken}';
	}
	if (body !== undefined) init.body = JSON.stringify(body);

	const res = await fetch('${API_BASE}/api${path}', init);

	//optional refresh (JWT mode)
	if (AUTH_MODE === 'jwt' && res.status === 401 && !authState.justRefreshed) {
		authState.justRefreshed = true;
		const r = await fetch('${API_BASE}/api$/auth/refresh', { method: "POST", credentials: "include" });
		if (r.ok) {
			const { accessToken } = await r.json();
			authState.accessToken = accessToken;
			return request(method, path, body);
		}
	}
	authState.justRefreshed = false;

	if (!res.ok) throw new Error(await res.text());
	const ct = res.headers.get("content-type") || "";
	return ct.includes("application/json") ? res.json() : (res.text() as any);
}

export const api: ApiClient = {
	get: (p) => request("GET", p),
	post: (p, b) => request("POST", p , b),
};