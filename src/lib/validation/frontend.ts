// src/lib/validation/frontend.ts
export function validateUsername(value: string): string {
	if (value.length < 3) return 'Username must be at least 3 characters';
	if (value.length > 50) return 'Username must be at most 50 characters';
	if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Only letters, numbers, and underscores or hyphens allowed';
	return '';
}


// ═══════════════════════════════════════════════════════════════════════════
// EMAIL VALIDATION
// Rules: must look like an email (basic check — server does thorough check)
// ═══════════════════════════════════════════════════════════════════════════
export function validateEmail(value: string): string {
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
	return '';
}


// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD VALIDATION
// Rules: 8+ chars, at least one uppercase, one lowercase, one number
// ═══════════════════════════════════════════════════════════════════════════
export function validatePassword(value: string): string {
	if (value.length < 8) return 'Must be at least 8 characters';
	if (value.length > 64) return 'Must be at most 64 characters';
	if (!/[A-Z]/.test(value)) return 'Must include an uppercase letter';
	if (!/[a-z]/.test(value)) return 'Must include a lowercase letter';
	if (!/[0-9]/.test(value)) return 'Must include a number';
	return '';
}


// ═══════════════════════════════════════════════════════════════════════════
// CONFIRM PASSWORD VALIDATION
// Rules: must match the original password
// ═══════════════════════════════════════════════════════════════════════════
export function validateConfirmPassword(password: string, confirmPassword: string): string {
	if (password !== confirmPassword) return 'Passwords do not match';
	return '';
}


// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD STRENGTH CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════
// Returns a strength level from 0 to 4:
//
//   0 = empty (no bar)
//   1 = weak (red)       → too short
//   2 = fair (orange)    → meets length but missing requirements
//   3 = good (yellow)    → meets most requirements
//   4 = strong (green)   → meets all requirements + extra length or special chars
//
// Think of it like a video game health bar:
//   🔴 = one hit and you're dead (easily cracked)
//   🟠 = you can take a hit or two
//   🟡 = decent armor
//   🟢 = full shield + armor (very hard to crack)
// ═══════════════════════════════════════════════════════════════════════════

export type PasswordStrength = {
	score: 0 | 1 | 2 | 3 | 4;
	label: string;
	color: string;       // Tailwind text color class
	barColor: string;    // Tailwind background color class
};

export function getPasswordStrength(password: string): PasswordStrength {
	// Empty password = no strength
	if (!password) {
		return { score: 0, label: '', color: '', barColor: '' };
	}

	// Count how many criteria are met
	let criteria = 0;
	if (password.length >= 8) criteria++;    // Minimum length
	if (/[A-Z]/.test(password)) criteria++;   // Has uppercase
	if (/[a-z]/.test(password)) criteria++;   // Has lowercase
	if (/[0-9]/.test(password)) criteria++;   // Has number

	// Bonus points for extra security
	let bonus = 0;
	if (password.length >= 12) bonus++;       // Extra long
	if (/[^a-zA-Z0-9]/.test(password)) bonus++; // Has special character (!@#$%^&*)

	// Calculate score
	//   criteria 0-1 → weak (they barely started)
	//   criteria 2   → fair (getting there)
	//   criteria 3   → good (almost complete)
	//   criteria 4   → strong (all met), or 3 + bonus → also strong
	let score: 0 | 1 | 2 | 3 | 4;

	if (criteria <= 1) {
		score = 1;   // Weak
	} else if (criteria === 2) {
		score = 2;   // Fair
	} else if (criteria === 3) {
		score = bonus > 0 ? 3 : 3; // Good
	} else {
		// All 4 criteria met
		score = bonus > 0 ? 4 : 3; // Strong if bonus, Good if just basic
	}

	// Map score to display values
	const levels: Record<number, Omit<PasswordStrength, 'score'>> = {
		1: { label: 'Weak',   color: 'text-red-400',    barColor: 'bg-red-400' },
		2: { label: 'Fair',   color: 'text-orange-400',  barColor: 'bg-orange-400' },
		3: { label: 'Good',   color: 'text-yellow-400',  barColor: 'bg-yellow-400' },
		4: { label: 'Strong', color: 'text-green-400',   barColor: 'bg-green-400' }
	};

	return { score, ...levels[score] };
}