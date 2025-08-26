import { API_BASE } from '../env';

export async function getHello() {
	const res = await fetch(`${API_BASE}/api/hello`, { credentials: 'include' });
	if (!res.ok) throw new Error(`API error ${res.status}`);
	return res.json() as Promise<{ msg: string }>;
}