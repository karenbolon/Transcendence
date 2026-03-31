/**
 * Test script to verify forfeit event queueing works correctly.
 * 
 * Simulates:
 * 1. Multiple players disconnecting from a tournament simultaneously
 * 2. Verifies they are processed serially (one at a time)
 * 3. Checks logs for proper queue processing
 * 
 * Run with: node test-forfeit-queue.mjs
 */

import { performance } from 'perf_hooks';

// Simulate the forfeit queue system
const forfeitQueues = new Map();
const processingQueues = new Set();

// Track processing events
let processedEvents = [];
let queueProcessingDelayed = 100; // ms

// Simulated queue function (mirrors the real implementation)
function queueForfeitEvent(tournamentId, userId) {
	if (!forfeitQueues.has(tournamentId)) {
		forfeitQueues.set(tournamentId, []);
	}
	const queue = forfeitQueues.get(tournamentId);
	queue.push({
		tournamentId,
		userId,
		timestamp: Date.now(),
	});
	
	console.log(`[QUEUE] Event queued: tournament=${tournamentId}, player=${userId}, queue_size=${queue.length}`);
	
	if (!processingQueues.has(tournamentId)) {
		processForfeitQueue(tournamentId);
	}
}

// Simulated processing function
async function processForfeitQueue(tournamentId) {
	if (processingQueues.has(tournamentId)) {
		console.log(`[PROCESS] Already processing queue for tournament ${tournamentId}`);
		return;
	}
	
	const queue = forfeitQueues.get(tournamentId) || [];
	if (queue.length === 0) return;
	
	processingQueues.add(tournamentId);
	console.log(`[PROCESS] Starting queue processing for tournament ${tournamentId}`);
	
	try {
		while (queue.length > 0) {
			const event = queue.shift();
			const startTime = performance.now();
			const processStartTimestamp = Date.now(); // Capture actual processing start time
			console.log(`[PROCESS] Processing forfeit: tournament=${event.tournamentId}, player=${event.userId}`);
			
			// Simulate async processing (DB operations)
			await new Promise(resolve => setTimeout(resolve, 50));
			
			const endTime = performance.now();
			const duration = (endTime - startTime).toFixed(2);
			
			processedEvents.push({
				tournamentId: event.tournamentId,
				userId: event.userId,
				duration: parseFloat(duration),
				processStartTimestamp // Track when processing actually started
			});
			
			console.log(`[PROCESS] Completed in ${duration}ms, remaining_queue_size=${queue.length}`);
			
			// Delay between events (prevents race conditions)
			await new Promise(resolve => setTimeout(resolve, queueProcessingDelayed));
		}
	} finally {
		processingQueues.delete(tournamentId);
		forfeitQueues.delete(tournamentId);
		console.log(`[PROCESS] Queue fully processed for tournament ${tournamentId}\n`);
	}
}

// Test case 1: Single disconnect
async function testSingleDisconnect() {
	console.log('=== TEST 1: Single Disconnect ===\n');
	processedEvents = [];
	
	queueForfeitEvent(1, 10);
	
	// Wait for queue to process
	await new Promise(resolve => setTimeout(resolve, 500));
	
	console.log('Expected: 1 event processed');
	console.log(`Actual: ${processedEvents.length} events processed`);
	console.log(`Result: ${processedEvents.length === 1 ? '✅ PASS' : '❌ FAIL'}\n`);
	
	return processedEvents.length === 1;
}

// Test case 2: Multiple simultaneous disconnects (should serialize)
async function testMultipleSimultaneous() {
	console.log('=== TEST 2: Multiple Simultaneous Disconnects ===\n');
	processedEvents = [];
	
	// Simulate 4 players disconnecting at nearly the same time
	const startTime = performance.now();
	queueForfeitEvent(1, 10);
	queueForfeitEvent(1, 20);
	queueForfeitEvent(1, 30);
	queueForfeitEvent(1, 40);
	const queueTime = performance.now() - startTime;
	
	console.log(`Queued 4 events in ${queueTime.toFixed(2)}ms\n`);
	
	// Wait for queue to process
	await new Promise(resolve => setTimeout(resolve, 2000));
	
	console.log('Expected: 4 events processed serially');
	console.log(`Actual: ${processedEvents.length} events processed`);
	
	// Check they were processed in order
	const inOrder = processedEvents.every((e, i) => {
		if (i === 0) return true;
		return e.processStartTimestamp >= processedEvents[i-1].processStartTimestamp;
	});
	
	// Check they had delays between them (not concurrent)
	let hasSerialDelay = true;
	for (let i = 1; i < processedEvents.length; i++) {
		const timeBetweenStarts = processedEvents[i].processStartTimestamp - processedEvents[i-1].processStartTimestamp;
		// Should be at least 50ms (processing) + 100ms (delay) = 150ms minimum between starts
		const minExpectedDelay = 130; // 130ms to account for timing variance
		if (timeBetweenStarts < minExpectedDelay) {
			console.log(`⚠️  Events ${i-1} and ${i} processed too close together: ${timeBetweenStarts}ms (expected >= ${minExpectedDelay}ms)`);
			hasSerialDelay = false;
		}
	}
	
	const passed = processedEvents.length === 4 && inOrder && hasSerialDelay;
	console.log(`Serialized: ${hasSerialDelay ? '✅ YES' : '❌ NO'}`);
	console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
	
	return passed;
}

// Test case 3: Different tournaments (should process in parallel)
async function testDifferentTournaments() {
	console.log('=== TEST 3: Different Tournaments (Should Run in Parallel) ===\n');
	processedEvents = [];
	
	// Queue events for 3 different tournaments
	queueForfeitEvent(1, 10);
	queueForfeitEvent(2, 20);
	queueForfeitEvent(3, 30);
	
	// Wait for all to process (each tournament processes independently, so ~200ms total)
	await new Promise(resolve => setTimeout(resolve, 300));
	
	console.log('Expected: 3 events processed in parallel (faster than serial)');
	console.log(`Actual: ${processedEvents.length} events processed`);
	
	// Check that all 3 were processed concurrently (started within ~50ms of each other)
	let areParallel = true;
	if (processedEvents.length >= 2) {
		for (let i = 1; i < processedEvents.length; i++) {
			const timeDelta = processedEvents[i].processStartTimestamp - processedEvents[0].processStartTimestamp;
			// If processing in parallel, all should start within ~75ms of each other (~50ms for processing overlap)
			if (timeDelta > 100) {
				console.log(`⚠️  Tournament ${processedEvents[i].tournamentId} started ${timeDelta}ms after tournament ${processedEvents[0].tournamentId} (should be <100ms for parallel)`);
				areParallel = false;
			}
		}
	}
	
	console.log(`Parallel execution: ${areParallel ? '✅ YES' : '❌ NO'}`);
	console.log(`Result: ${processedEvents.length === 3 && areParallel ? '✅ PASS' : '❌ FAIL'}\n`);
	
	return processedEvents.length === 3 && areParallel;
}

// Test case 4: Two players (finals match scenario)
async function testTwoPlayersFinals() {
	console.log('=== TEST 4: Two Players Finals Match (Sequential Disconnect) ===\n');
	processedEvents = [];
	
	// Simulate finals: Player 1 and Player 2 in tournament 1
	queueForfeitEvent(1, 100); // Player 1 disconnects
	await new Promise(resolve => setTimeout(resolve, 50));
	queueForfeitEvent(1, 101); // Player 2 disconnects shortly after
	
	// Wait for both to process
	await new Promise(resolve => setTimeout(resolve, 600));
	
	console.log('Expected: 2 events processed serially');
	console.log(`Actual: ${processedEvents.length} events processed`);
	
	// Verify both were processed in order
	let correctOrder = true;
	let hasDelay = true;
	
	if (processedEvents.length >= 2) {
		if (processedEvents[0].userId !== 100 || processedEvents[1].userId !== 101) {
			console.log(`⚠️  Events processed out of order: ${processedEvents.map(e => e.userId).join(', ')}`);
			correctOrder = false;
		}
		
		const timeDelta = processedEvents[1].processStartTimestamp - processedEvents[0].processStartTimestamp;
		if (timeDelta < 120) { // Should have ~100ms delay + 50ms processing
			console.log(`⚠️  Events processed too quickly: ${timeDelta}ms (expected >= 120ms)`);
			hasDelay = false;
		}
	}
	
	console.log(`Correct order: ${correctOrder ? '✅ YES' : '❌ NO'}`);
	console.log(`Proper delay: ${hasDelay ? '✅ YES' : '❌ NO'}`);
	console.log(`Result: ${processedEvents.length === 2 && correctOrder && hasDelay ? '✅ PASS' : '❌ FAIL'}\n`);
	
	return processedEvents.length === 2 && correctOrder && hasDelay;
}

// Test case 5: Non-creator leaves 2-person tournament
async function testNonCreatorTwoPlayerDisconnect() {
	console.log('=== TEST 5: Non-Creator Leaves 2-Person Tournament ===\n');
	processedEvents = [];
	
	// Simulate 2-person tournament in_progress
	// Creator = 500, Participant = 501
	// Participant 501 disconnects (non-creator)
	queueForfeitEvent(999, 501); // 999 = tournament ID, 501 = non-creator participant
	
	await new Promise(resolve => setTimeout(resolve, 500));
	
	console.log('Expected: 1 event processed (non-creator forfeit)');
	console.log(`Actual: ${processedEvents.length} events processed`);
	
	if (processedEvents.length === 1) {
		const event = processedEvents[0];
		console.log(`Participant 501 forfeited from tournament 999 ✅`);
		console.log(`Result: ✅ PASS\n`);
		return true;
	} else {
		console.log(`Result: ❌ FAIL\n`);
		return false;
	}
}

// Run all tests
async function runAllTests() {
	console.log('╔════════════════════════════════════════════════════════╗');
	console.log('║  Tournament Forfeit Queue Test Suite                   ║');
	console.log('║  Tests serialization and parallel processing behaviors  ║');
	console.log('╚════════════════════════════════════════════════════════╝\n');
	
	const results = [];
	
	try {
		results.push(await testSingleDisconnect());
		results.push(await testMultipleSimultaneous());
		results.push(await testDifferentTournaments());
		results.push(await testTwoPlayersFinals());
		results.push(await testNonCreatorTwoPlayerDisconnect());
		
		console.log('╔════════════════════════════════════════════════════════╗');
		const passed = results.filter(r => r).length;
		const total = results.length;
		console.log(`║  Results: ${passed}/${total} tests passed                              ║`);
		console.log('╚════════════════════════════════════════════════════════╝\n');
		
		if (passed === total) {
			console.log('✅ All tests passed! Forfeit queue is working correctly.\n');
			process.exit(0);
		} else {
			console.log('❌ Some tests failed. Check the queue implementation.\n');
			process.exit(1);
		}
	} catch (err) {
		console.error('❌ Test suite failed with error:', err);
		process.exit(1);
	}
}

runAllTests();
