import { describe, it, expect } from 'vitest';
import { formatDate, formatDuration, formatJoinDate } from '../format_date';

describe('formatDate', () => {
	it('should return "Just now" for recent dates', () => {
		expect(formatDate(new Date())).toBe('Just now');
	});

	it('should return minutes ago', () => {
		const fiveMinAgo = new Date(Date.now() - 5 * 60000);
		expect(formatDate(fiveMinAgo)).toBe('5m ago');
	});

	it('should return hours ago', () => {
		const threeHoursAgo = new Date(Date.now() - 3 * 3600000);
		expect(formatDate(threeHoursAgo)).toBe('3h ago');
	});

	it('should return days ago', () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
		expect(formatDate(twoDaysAgo)).toBe('2d ago');
	});

	it('should return formatted date for 7+ days', () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
		const result = formatDate(tenDaysAgo);
		// Should be something like "Feb 28"
		expect(result).not.toContain('ago');
	});

	it('should accept string dates', () => {
		const result = formatDate(new Date().toISOString());
		expect(result).toBe('Just now');
	});
});

describe('formatDuration', () => {
	it('should format minutes and seconds', () => {
		expect(formatDuration(90)).toBe('1m 30s');
		expect(formatDuration(125)).toBe('2m 5s');
	});

	it('should format seconds only when under a minute', () => {
		expect(formatDuration(45)).toBe('45s');
	});

	it('should return dash for null', () => {
		expect(formatDuration(null)).toBe('—');
	});

	it('should return dash for 0', () => {
		expect(formatDuration(0)).toBe('—');
	});
});

describe('formatJoinDate', () => {
	it('should format as full date', () => {
		const result = formatJoinDate('2025-01-15');
		expect(result).toContain('January');
		expect(result).toContain('2025');
		expect(result).toContain('15');
	});

	it('should accept Date objects', () => {
		const result = formatJoinDate(new Date('2024-06-01'));
		expect(result).toContain('June');
		expect(result).toContain('2024');
	});
});
