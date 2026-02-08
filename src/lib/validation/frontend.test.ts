// src/lib/validation/frontend.test.ts
// ══════════════════════════════════════════════════════════════════════════════
// 🧪 Frontend Validation Tests
// ══════════════════════════════════════════════════════════════════════════════
// These test the shared validation functions used by register + login pages.
// No database needed — these are pure functions (input → output).
//
// Run with: npx vitest src/lib/validation/frontend.test.ts
// Or just: npx vitest (runs all tests)
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
	validateUsername,
	validateEmail,
	validatePassword,
	validateConfirmPassword,
	getPasswordStrength
} from './frontend';

// ══════════════════════════════════════════════════════════════════════════════
// 🔤 USERNAME VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
describe('validateUsername', () => {
	describe('valid usernames', () => {
		it('should accept a simple username', () => {
			expect(validateUsername('alice')).toBe('');
		});

		it('should accept username with numbers', () => {
			expect(validateUsername('alice123')).toBe('');
		});

		it('should accept username with underscores', () => {
			expect(validateUsername('alice_smith')).toBe('');
		});

		it('should accept minimum length (3 chars)', () => {
			expect(validateUsername('bob')).toBe('');
		});

		it('should accept maximum length (50 chars)', () => {
			expect(validateUsername('a'.repeat(50))).toBe('');
		});

		it('should accept all uppercase', () => {
			expect(validateUsername('ALICE')).toBe('');
		});

		it('should accept mixed case with numbers and underscore', () => {
			expect(validateUsername('Player_42')).toBe('');
		});
	});

	describe('invalid usernames', () => {
		it('should reject empty string', () => {
			expect(validateUsername('')).not.toBe('');
		});

		it('should reject too short (1 char)', () => {
			expect(validateUsername('a')).toBe('Username must be at least 3 characters');
		});

		it('should reject too short (2 chars)', () => {
			expect(validateUsername('ab')).toBe('Username must be at least 3 characters');
		});

		it('should reject too long (51 chars)', () => {
			expect(validateUsername('a'.repeat(51))).toBe('Username must be at most 50 characters');
		});

		it('should reject spaces', () => {
			expect(validateUsername('alice smith')).toBe('Only letters, numbers, and underscores or hyphens allowed');
		});

		it('should reject special characters (@)', () => {
			expect(validateUsername('alice@home')).toBe('Only letters, numbers, and underscores or hyphens allowed');
		});

		it('should reject special characters (#)', () => {
			expect(validateUsername('alice#1')).toBe('Only letters, numbers, and underscores or hyphens allowed');
		});

		it('should reject dots', () => {
			expect(validateUsername('alice.smith')).toBe('Only letters, numbers, and underscores or hyphens allowed');
		});

		it('should accept hyphens', () => {
			expect(validateUsername('alice-smith')).toBe('');
		});

		it('should reject emojis', () => {
			expect(validateUsername('alice🎮')).toBe('Only letters, numbers, and underscores or hyphens allowed');
		});
	});
});

// ══════════════════════════════════════════════════════════════════════════════
// 📧 EMAIL VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
describe('validateEmail', () => {
	describe('valid emails', () => {
		it('should accept simple email', () => {
			expect(validateEmail('alice@example.com')).toBe('');
		});

		it('should accept email with dots in local part', () => {
			expect(validateEmail('bob.smith@company.co.uk')).toBe('');
		});

		it('should accept email with plus tag', () => {
			expect(validateEmail('charlie+test@domain.org')).toBe('');
		});

		it('should accept email with underscore', () => {
			expect(validateEmail('diana_jones@sub.domain.com')).toBe('');
		});

		it('should accept email with numbers', () => {
			expect(validateEmail('eve123@test.io')).toBe('');
		});

		it('should accept email with hyphen in domain', () => {
			expect(validateEmail('alice@my-company.com')).toBe('');
		});

		it('should accept email with multiple subdomains', () => {
			expect(validateEmail('user@mail.sub.domain.co.uk')).toBe('');
		});

		it('should accept email with numbers in domain', () => {
			expect(validateEmail('user@123.456.com')).toBe('');
		});

		it('should accept short TLD', () => {
			expect(validateEmail('user@example.io')).toBe('');
		});

		it('should accept long TLD', () => {
			expect(validateEmail('user@example.museum')).toBe('');
		});
	});

	describe('invalid emails', () => {
		it('should reject empty string', () => {
			expect(validateEmail('')).not.toBe('');
		});

		it('should reject missing @', () => {
			expect(validateEmail('aliceexample.com')).not.toBe('');
		});

		it('should reject missing domain', () => {
			expect(validateEmail('alice@')).not.toBe('');
		});

		it('should reject missing local part', () => {
			expect(validateEmail('@example.com')).not.toBe('');
		});

		it('should reject missing dot in domain', () => {
			expect(validateEmail('alice@examplecom')).not.toBe('');
		});

		it('should reject spaces', () => {
			expect(validateEmail('alice @example.com')).not.toBe('');
		});

		it('should reject double @', () => {
			expect(validateEmail('alice@@example.com')).not.toBe('');
		});

		it('should reject just a word', () => {
			expect(validateEmail('notanemail')).not.toBe('');
		});
	});
});

// ══════════════════════════════════════════════════════════════════════════════
// 🔒 PASSWORD VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
describe('validatePassword', () => {
	describe('valid passwords', () => {
		it('should accept password meeting all criteria', () => {
			expect(validatePassword('Abcdefg1')).toBe('');
		});

		it('should accept long password', () => {
			expect(validatePassword('MySecurePassword123')).toBe('');
		});

		it('should accept password with special characters', () => {
			expect(validatePassword('P@ssw0rd!')).toBe('');
		});

		it('should accept password with spaces', () => {
			// Passwords CAN have spaces — that's fine for security
			expect(validatePassword('My Pass 1A')).toBe('');
		});

		it('should accept minimum valid password (8 chars)', () => {
			expect(validatePassword('Abcdefg1')).toBe('');
		});
	});

	describe('invalid passwords — too short', () => {
		it('should reject 1 character', () => {
			expect(validatePassword('A')).toBe('Must be at least 8 characters');
		});

		it('should reject 7 characters', () => {
			expect(validatePassword('Abcdef1')).toBe('Must be at least 8 characters');
		});

		it('should reject empty string', () => {
			expect(validatePassword('')).toBe('Must be at least 8 characters');
		});
	});

	describe('invalid passwords — missing criteria', () => {
		it('should reject no uppercase', () => {
			expect(validatePassword('abcdefg1')).toBe('Must include an uppercase letter');
		});

		it('should reject no lowercase', () => {
			expect(validatePassword('ABCDEFG1')).toBe('Must include a lowercase letter');
		});

		it('should reject no number', () => {
			expect(validatePassword('Abcdefgh')).toBe('Must include a number');
		});

		it('should reject all lowercase', () => {
			expect(validatePassword('abcdefghij')).toBe('Must include an uppercase letter');
		});

		it('should reject all numbers', () => {
			expect(validatePassword('12345678')).toBe('Must include an uppercase letter');
		});
	});

	describe('validation order — checks in correct priority', () => {
		// When multiple things are wrong, only the FIRST error shows.
		// This tests that the order makes sense for the user.

		it('should check length before uppercase', () => {
			// "abc1" is short AND missing uppercase
			// Should show length error first (more useful)
			expect(validatePassword('abc1')).toBe('Must be at least 8 characters');
		});

		it('should check uppercase before lowercase', () => {
			// "abcdefg1" has 8+ chars, has lowercase, has number, but no uppercase
			expect(validatePassword('abcdefg1')).toBe('Must include an uppercase letter');
		});

		it('should check lowercase before number', () => {
			// "ABCDEFGH" has 8+ chars, has uppercase, but no lowercase and no number
			// Should show lowercase error first
			expect(validatePassword('ABCDEFGH')).toBe('Must include a lowercase letter');
		});
	});
});

// ══════════════════════════════════════════════════════════════════════════════
// 🔁 CONFIRM PASSWORD VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
describe('validateConfirmPassword', () => {
	it('should accept matching passwords', () => {
		expect(validateConfirmPassword('Abcdefg1', 'Abcdefg1')).toBe('');
	});

	it('should reject different passwords', () => {
		expect(validateConfirmPassword('Abcdefg1', 'Abcdefg2')).toBe('Passwords do not match');
	});

	it('should reject when confirm is empty', () => {
		expect(validateConfirmPassword('Abcdefg1', '')).toBe('Passwords do not match');
	});

	it('should reject case mismatch', () => {
		expect(validateConfirmPassword('Abcdefg1', 'abcdefg1')).toBe('Passwords do not match');
	});

	it('should reject extra whitespace', () => {
		expect(validateConfirmPassword('Abcdefg1', 'Abcdefg1 ')).toBe('Passwords do not match');
	});

	it('should accept when both are empty', () => {
		// Both empty = they match (the "required" check is done elsewhere)
		expect(validateConfirmPassword('', '')).toBe('');
	});
});

// ══════════════════════════════════════════════════════════════════════════════
// 💪 PASSWORD STRENGTH
// ══════════════════════════════════════════════════════════════════════════════
describe('getPasswordStrength', () => {
	describe('score 0 — empty password', () => {
		it('should return score 0 for empty string', () => {
			const result = getPasswordStrength('');
			expect(result.score).toBe(0);
			expect(result.label).toBe('');
		});
	});

	describe('score 1 — weak passwords', () => {
		it('should be weak for short lowercase only', () => {
			const result = getPasswordStrength('abc');
			expect(result.score).toBe(1);
			expect(result.label).toBe('Weak');
		});

		it('should be weak for just numbers', () => {
			const result = getPasswordStrength('1234');
			expect(result.score).toBe(1);
			expect(result.label).toBe('Weak');
		});

		it('should be weak for single character type even if long-ish', () => {
			// "abcde" = only lowercase, only 1 criterion met (none, actually — not 8+ chars)
			const result = getPasswordStrength('abcde');
			expect(result.score).toBe(1);
			expect(result.label).toBe('Weak');
		});
	});

	describe('score 2 — fair passwords', () => {
		it('should be fair with lowercase + number but short', () => {
			// "abc123" = lowercase ✅, number ✅, but <8 chars ❌, no uppercase ❌
			// That's 2 criteria → score 2
			const result = getPasswordStrength('abc123');
			expect(result.score).toBe(2);
			expect(result.label).toBe('Fair');
		});

		it('should be fair with uppercase + lowercase but short', () => {
			const result = getPasswordStrength('Abcdef');
			expect(result.score).toBe(2);
			expect(result.label).toBe('Fair');
		});
	});

	describe('score 3 — good passwords', () => {
		it('should be good with 3 criteria met', () => {
			// "Abcdefg1" = 8+ chars ✅, uppercase ✅, lowercase ✅, number ✅ = 4 criteria
			// But no bonus → score 3
			const result = getPasswordStrength('Abcdefg1');
			expect(result.score).toBe(3);
			expect(result.label).toBe('Good');
		});

		it('should be good for 8+ chars with 3 types', () => {
			// "abcdefg1" = 8+ ✅, lowercase ✅, number ✅, no uppercase ❌ = 3 criteria
			const result = getPasswordStrength('abcdefg1');
			expect(result.score).toBe(3);
			expect(result.label).toBe('Good');
		});
	});

	describe('score 4 — strong passwords', () => {
		it('should be strong with all criteria + special character', () => {
			const result = getPasswordStrength('Abcdefg1!');
			expect(result.score).toBe(4);
			expect(result.label).toBe('Strong');
		});

		it('should be strong with all criteria + long password', () => {
			const result = getPasswordStrength('Abcdefghijk1');
			expect(result.score).toBe(4);
			expect(result.label).toBe('Strong');
		});

		it('should be strong with everything', () => {
			const result = getPasswordStrength('MyStr0ng!Password123');
			expect(result.score).toBe(4);
			expect(result.label).toBe('Strong');
		});
	});

	describe('color properties', () => {
		it('should have red color for weak', () => {
			const result = getPasswordStrength('abc');
			expect(result.barColor).toContain('red');
		});

		it('should have orange color for fair', () => {
			const result = getPasswordStrength('abc123');
			expect(result.barColor).toContain('orange');
		});

		it('should have yellow color for good', () => {
			const result = getPasswordStrength('Abcdefg1');
			expect(result.barColor).toContain('yellow');
		});

		it('should have green color for strong', () => {
			const result = getPasswordStrength('Abcdefg1!');
			expect(result.barColor).toContain('green');
		});
	});

	describe('edge cases', () => {
		it('should handle very long passwords', () => {
			const result = getPasswordStrength('A'.repeat(100) + 'a1!');
			expect(result.score).toBe(4);
		});

		it('should handle unicode characters', () => {
			// Unicode counts as characters but not as any specific type
			const result = getPasswordStrength('Abc1🎮🎮🎮🎮');
			expect(result.score).toBeGreaterThanOrEqual(3);
		});

		it('should handle only special characters', () => {
			const result = getPasswordStrength('!@#$');
			expect(result.score).toBe(1);
			expect(result.label).toBe('Weak');
		});
	});
});