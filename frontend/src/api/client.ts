const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function getHello() {
	const res = await fetch(`${API_BASE}/api/hello`, { credentials: 'include' });
	if (!res.ok) throw new Error(`API error ${res.status}`);
	return res.json() as Promise<{ msg: string }>;
}