// import { writable } from 'svelte/store';


// export interface User {
// 	username: string;
// 	email: string;
// 	avatar: string;
// }

// export const user = writable<User | null>(null);
// export const isAuthenticated = writable<boolean>(false);

// export function login(username: string, email: string) {
// 	if (!username.trim()) {
// 		throw new Error('Invalid username or password');
// 	}

// 	const userData: User = {
// 		username,
// 		email,
// 		avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
// 	};

// 	user.set(userData);
// 	isAuthenticated.set(true);

// 	// localStorage.setItem('user', JSON.stringify(userData));
// 	// Save to localStorage
// 	try {
// 		localStorage.setItem('user', JSON.stringify(userData));
// 	} catch (e) {
// 		// Do nothing if it fails
// 	}
// }

// export function logout() {
// 	user.set(null);
// 	isAuthenticated.set(false);
// 	localStorage.removeItem('user');
// }

// export function checkAuth() {
// 	const savedUser = localStorage.getItem('user');
// 	if (savedUser) {
// 		const userData = JSON.parse(savedUser);
// 		user.set(userData);
// 		isAuthenticated.set(true);
// 	}
// }

// export function register(username: string, email: string, password: string) {
// 	const userData: User = {
// 		username: username,           // Their chosen username
// 		email: email,                 // Their email
// 		avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
// 	};

// 	user.set(userData);

// 	isAuthenticated.set(true);

// 	localStorage.setItem('user', JSON.stringify(userData));
// }
