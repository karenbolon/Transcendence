# Power-Ups: server.js Mirror Guide

The production server (`server.js`) has its own copy of the game engine in plain JavaScript. Every power-up change in the TypeScript engine must be mirrored here. This guide tells you exactly what to add and where.

**Prerequisite:** All power-up behavior stubs should be filled in and tested in the TypeScript code first (`src/lib/game/powerups/engine.ts`). Only mirror to server.js once everything works in dev mode.

---

## How server.js is Organized

The game engine functions are between lines ~179-358. Here's the order:

```
Line ~179: createGameState()
Line ~201: resetPositions()
Line ~211: resetBall()
Line ~221: startCountdown()
Line ~230: startPlaying()
Line ~237: endGameState()
Line ~244: movePaddles()
Line ~257: handlePaddleBounce()
Line ~273: checkPaddleCollision()
Line ~293: checkScoring()
Line ~329: updateGame()           ← main game loop
Line ~400: ServerGameRoom class   ← creates settings, runs tick()
Line ~501: _getSnapshot()         ← sends state to clients
```

---

## Step 1: Add Power-Up Config

Add AFTER the existing constants (after `SPIN_DECAY`, around line ~178) and BEFORE `createGameState()`:

```javascript
// ── Power-Up Configuration ──────────────────────────────────
const POWERUP_CONFIG = {
	bigPaddle:       { duration: 10, positive: true,  spawnWeight: 3 },
	smallPaddle:     { duration: 10, positive: false, spawnWeight: 3 },
	speedBall:       { duration: 8,  positive: false, spawnWeight: 2 },
	slowBall:        { duration: 8,  positive: true,  spawnWeight: 2 },
	reverseControls: { duration: 8,  positive: false, spawnWeight: 1 },
	freeze:          { duration: 3,  positive: false, spawnWeight: 1 },
	invisibleBall:   { duration: 8,  positive: false, spawnWeight: 1 },
	wall:            { duration: 10, positive: true,  spawnWeight: 1 },
	magnet:          { duration: 8,  positive: true,  spawnWeight: 1 },
};

const POWERUP_RADIUS = 15;
const POWERUP_SPAWN_X_MIN = CANVAS_WIDTH * 0.25;
const POWERUP_SPAWN_X_MAX = CANVAS_WIDTH * 0.75;
const POWERUP_SPAWN_Y_MIN = 40;
const POWERUP_SPAWN_Y_MAX = CANVAS_HEIGHT - 40;
const POWERUP_COOLDOWN_MIN = 4;
const POWERUP_COOLDOWN_MAX = 6;
```

**NOTE:** Keep these durations in sync with `src/lib/game/powerups/types.ts`. If you change one, change the other.

---

## Step 2: Add Power-Up Fields to createGameState()

Find `createGameState()` (line ~179). Add these fields to the return object:

```javascript
function createGameState() {
	return {
		// ... existing fields (keep all of them) ...
		ballReturns: 0,
		maxDeficit: 0,
		reachedDeuce: false,
		// Power-ups — ADD THESE:
		powerUpsEnabled: false,
		powerUpItem: null,
		activeEffects: [],
		powerUpCooldown: 5,
		lastBallHitter: null,
	};
}
```

---

## Step 3: Add Power-Up Reset to resetBall()

Find `resetBall()` (line ~211). Add at the end:

```javascript
function resetBall(state, settings) {
	// ... existing code ...
	state.ballVY = settings.ballSpeed * (Math.random() - 0.5);
	// ADD:
	state.powerUpItem = null;
	state.powerUpCooldown = POWERUP_COOLDOWN_MIN
		+ Math.random() * (POWERUP_COOLDOWN_MAX - POWERUP_COOLDOWN_MIN);
}
```

---

## Step 4: Add Power-Up Functions

Add ALL of these functions AFTER `checkScoring()` (line ~327) and BEFORE `updateGame()` (line ~329):

```javascript
// ── Power-Up Engine ─────────────────────────────────────────

function spawnPowerUp(state) {
	const types = Object.entries(POWERUP_CONFIG);
	const totalWeight = types.reduce((sum, [, cfg]) => sum + cfg.spawnWeight, 0);
	let roll = Math.random() * totalWeight;
	let chosenType = types[0]?.[0] ?? 'bigPaddle';

	for (const [type, cfg] of types) {
		roll -= cfg.spawnWeight;
		if (roll <= 0) {
			chosenType = type;
			break;
		}
	}

	state.powerUpItem = {
		type: chosenType,
		x: POWERUP_SPAWN_X_MIN + Math.random() * (POWERUP_SPAWN_X_MAX - POWERUP_SPAWN_X_MIN),
		y: POWERUP_SPAWN_Y_MIN + Math.random() * (POWERUP_SPAWN_Y_MAX - POWERUP_SPAWN_Y_MIN),
		radius: POWERUP_RADIUS,
		active: true,
	};
}

function rescaleBallVelocity(state) {
	const speed = Math.sqrt(state.ballVX ** 2 + state.ballVY ** 2);
	if (speed > 0) {
		const scale = state.currentBallSpeed / speed;
		state.ballVX *= scale;
		state.ballVY *= scale;
	}
}

function collectPowerUp(state, item) {
	const collector = state.lastBallHitter ?? 'player1';
	const opponent = collector === 'player1' ? 'player2' : 'player1';
	const config = POWERUP_CONFIG[item.type];
	if (!config) return;

	const target = config.positive ? collector : opponent;

	// Same effect on same target? Refresh timer
	const existing = state.activeEffects.find(
		e => e.type === item.type && e.target === target
	);
	if (existing) {
		existing.remainingTime = config.duration;
		return;
	}

	state.activeEffects.push({
		type: item.type,
		target,
		remainingTime: config.duration,
		duration: config.duration,
	});

	// Immediate speed effects
	if (item.type === 'speedBall') {
		state.currentBallSpeed *= 1.5;
		rescaleBallVelocity(state);
	}
	if (item.type === 'slowBall') {
		state.currentBallSpeed *= 0.6;
		rescaleBallVelocity(state);
	}
}

function onEffectExpired(state, effect, settings) {
	if (effect.type === 'speedBall') {
		state.currentBallSpeed /= 1.5;
		rescaleBallVelocity(state);
	}
	if (effect.type === 'slowBall') {
		state.currentBallSpeed /= 0.6;
		state.currentBallSpeed = Math.min(state.currentBallSpeed, settings.maxBallSpeed);
		rescaleBallVelocity(state);
	}
}

function getEffectivePaddleHeight(state, player) {
	let height = PADDLE_HEIGHT;
	for (const effect of state.activeEffects) {
		if (effect.target !== player) continue;
		if (effect.type === 'bigPaddle') height *= 2;
		if (effect.type === 'smallPaddle') height *= 0.5;
	}
	return height;
}

function isFrozen(state, player) {
	return state.activeEffects.some(e => e.type === 'freeze' && e.target === player);
}

function isReversed(state, player) {
	return state.activeEffects.some(e => e.type === 'reverseControls' && e.target === player);
}

function applyContinuousEffects(state, dt) {
	for (const effect of state.activeEffects) {
		// Wall barrier
		if (effect.type === 'wall') {
			const wallX = effect.target === 'player1'
				? PADDLE_OFFSET + PADDLE_WIDTH + 60
				: CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH - 68;
			const wallWidth = 8;
			const wallHeight = 100;
			const wallY = CANVAS_HEIGHT / 2 - wallHeight / 2;

			if (
				state.ballX + BALL_RADIUS >= wallX &&
				state.ballX - BALL_RADIUS <= wallX + wallWidth &&
				state.ballY + BALL_RADIUS >= wallY &&
				state.ballY - BALL_RADIUS <= wallY + wallHeight
			) {
				state.ballVX = -state.ballVX;
				if (state.ballVX > 0) {
					state.ballX = wallX + wallWidth + BALL_RADIUS;
				} else {
					state.ballX = wallX - BALL_RADIUS;
				}
			}
		}

		// Magnet
		if (effect.type === 'magnet') {
			const paddleHeight = getEffectivePaddleHeight(state, effect.target);
			const paddleCenterY = effect.target === 'player1'
				? state.paddle1Y + paddleHeight / 2
				: state.paddle2Y + paddleHeight / 2;

			const attracting =
				(effect.target === 'player1' && state.ballVX < 0) ||
				(effect.target === 'player2' && state.ballVX > 0);

			if (attracting) {
				const dy = paddleCenterY - state.ballY;
				const attraction = 200;
				state.ballVY += Math.sign(dy) * attraction * dt;
			}
		}
	}
}

function updatePowerUps(state, dt, settings) {
	// Spawn
	if (!state.powerUpItem) {
		state.powerUpCooldown -= dt;
		if (state.powerUpCooldown <= 0) {
			spawnPowerUp(state);
		}
	}

	// Ball ↔ power-up collision
	if (state.powerUpItem?.active) {
		const dx = state.ballX - state.powerUpItem.x;
		const dy = state.ballY - state.powerUpItem.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < BALL_RADIUS + state.powerUpItem.radius) {
			collectPowerUp(state, state.powerUpItem);
			state.powerUpItem = null;
			state.powerUpCooldown = POWERUP_COOLDOWN_MIN
				+ Math.random() * (POWERUP_COOLDOWN_MAX - POWERUP_COOLDOWN_MIN);
		}
	}

	// Tick effects
	for (let i = state.activeEffects.length - 1; i >= 0; i--) {
		state.activeEffects[i].remainingTime -= dt;
		if (state.activeEffects[i].remainingTime <= 0) {
			onEffectExpired(state, state.activeEffects[i], settings);
			state.activeEffects.splice(i, 1);
		}
	}

	// Continuous effects
	applyContinuousEffects(state, dt);
}
```

---

## Step 5: Modify movePaddles()

Find `movePaddles()` (line ~244). Replace the ENTIRE function:

```javascript
function movePaddles(state, dt, input) {
	const prevP1Y = state.paddle1Y;
	const prevP2Y = state.paddle2Y;

	const p1Frozen = isFrozen(state, 'player1');
	const p2Frozen = isFrozen(state, 'player2');
	const p1Reversed = isReversed(state, 'player1');
	const p2Reversed = isReversed(state, 'player2');

	if (!p1Frozen) {
		const up = p1Reversed ? input.paddle1Down : input.paddle1Up;
		const down = p1Reversed ? input.paddle1Up : input.paddle1Down;
		if (up)   state.paddle1Y -= PADDLE_SPEED * dt;
		if (down) state.paddle1Y += PADDLE_SPEED * dt;
	}
	if (!p2Frozen) {
		const up = p2Reversed ? input.paddle2Down : input.paddle2Up;
		const down = p2Reversed ? input.paddle2Up : input.paddle2Down;
		if (up)   state.paddle2Y -= PADDLE_SPEED * dt;
		if (down) state.paddle2Y += PADDLE_SPEED * dt;
	}

	const p1Height = getEffectivePaddleHeight(state, 'player1');
	const p2Height = getEffectivePaddleHeight(state, 'player2');
	state.paddle1Y = Math.max(0, Math.min(CANVAS_HEIGHT - p1Height, state.paddle1Y));
	state.paddle2Y = Math.max(0, Math.min(CANVAS_HEIGHT - p2Height, state.paddle2Y));

	state.paddle1VY = dt > 0 ? (state.paddle1Y - prevP1Y) / dt : 0;
	state.paddle2VY = dt > 0 ? (state.paddle2Y - prevP2Y) / dt : 0;
}
```

---

## Step 6: Modify handlePaddleBounce()

Find `handlePaddleBounce()` (line ~257). Add `paddleHeight` parameter:

```javascript
function handlePaddleBounce(state, paddleY, direction, settings, paddleVY, paddleHeight) {
	paddleHeight = paddleHeight ?? PADDLE_HEIGHT;
	const paddleCenter = paddleY + paddleHeight / 2;
	const offset = (state.ballY - paddleCenter) / (paddleHeight / 2);
	// ... rest stays the same
```

---

## Step 7: Modify checkPaddleCollision()

Find `checkPaddleCollision()` (line ~273). Replace the ENTIRE function:

```javascript
function checkPaddleCollision(state, settings) {
	const p1Height = getEffectivePaddleHeight(state, 'player1');
	const p2Height = getEffectivePaddleHeight(state, 'player2');

	if (state.ballVX < 0 &&
		state.ballX - BALL_RADIUS <= PADDLE_OFFSET + PADDLE_WIDTH &&
		state.ballX + BALL_RADIUS >= PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle1Y &&
		state.ballY - BALL_RADIUS <= state.paddle1Y + p1Height) {
		state.ballReturns++;
		state.lastBallHitter = 'player1';
		handlePaddleBounce(state, state.paddle1Y, 1, settings, state.paddle1VY, p1Height);
	}
	const p2Left = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
	if (state.ballVX > 0 &&
		state.ballX + BALL_RADIUS >= p2Left &&
		state.ballX - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_OFFSET &&
		state.ballY + BALL_RADIUS >= state.paddle2Y &&
		state.ballY - BALL_RADIUS <= state.paddle2Y + p2Height) {
		state.ballReturns++;
		state.lastBallHitter = 'player2';
		handlePaddleBounce(state, state.paddle2Y, -1, settings, state.paddle2VY, p2Height);
	}
}
```

---

## Step 8: Modify updateGame()

Find `updateGame()` (line ~329). Add the power-up call AFTER `checkPaddleCollision` and BEFORE `checkScoring`:

```javascript
	// ... existing code ...
	checkPaddleCollision(state, settings);
	// ADD THIS:
	if (settings.powerUps) {
		updatePowerUps(state, dt, settings);
	}
	checkScoring(state, settings);
```

---

## Step 9: Add Power-Up Data to _getSnapshot()

Find `_getSnapshot()` (line ~501). Add power-up fields:

```javascript
_getSnapshot() {
	return {
		// ... existing fields (keep all of them) ...
		scoreFlash: this.state.scoreFlash,
		scoreFlashTimer: this.state.scoreFlashTimer,
		timestamp: Date.now(),
		// ADD THESE:
		powerUpItem: this.state.powerUpItem ? {
			type: this.state.powerUpItem.type,
			x: this.state.powerUpItem.x,
			y: this.state.powerUpItem.y,
			radius: this.state.powerUpItem.radius,
		} : null,
		activeEffects: this.state.activeEffects.map(e => ({
			type: e.type,
			target: e.target,
			remainingTime: e.remainingTime,
			duration: e.duration,
		})),
		lastBallHitter: this.state.lastBallHitter,
	};
}
```

---

## Step 10: Pass powerUps Setting to GameRoom

Find the `ServerGameRoom` constructor (line ~400). Change `powerUps: false` to read from settings:

```javascript
this.settings = {
	winScore: settings.winScore,
	ballSpeed: speedConfig.ballSpeed,
	maxBallSpeed: speedConfig.maxBallSpeed,
	gameMode: 'local',
	powerUps: settings.powerUps ?? false,  // ← READ FROM SETTINGS
};
```

---

## Quick Checklist

After making all changes, verify:

- [ ] `node --check server.js` — no syntax errors
- [ ] Power-up items spawn in online games (when powerUps enabled)
- [ ] Both players see power-up items at same position
- [ ] Collecting a power-up applies the effect
- [ ] Big/Small paddle changes collision area
- [ ] Freeze/Reverse affect paddle movement
- [ ] Speed/Slow ball changes velocity
- [ ] Wall barrier bounces ball
- [ ] Magnet curves ball toward paddle
- [ ] Effects expire correctly
- [ ] HUD shows on both clients
- [ ] Power-ups reset between points
- [ ] Game over clears all power-ups

---

## Troubleshooting

| Problem | Likely Cause |
|---------|-------------|
| Power-ups never spawn | `settings.powerUps` is false — check Step 10 |
| Power-ups spawn but have no effect | Missing `collectPowerUp()` or it's not called in `updatePowerUps()` |
| Paddles don't change size | `getEffectivePaddleHeight()` not called in `checkPaddleCollision()` |
| Freeze/Reverse don't work | `movePaddles()` not updated (Step 5) |
| Client shows power-ups but server doesn't sync | `_getSnapshot()` missing power-up fields (Step 9) |
| `node --check` syntax error | Probably a missing comma or bracket — check the line number |
| Ball goes through wall barrier | `applyContinuousEffects()` not called in `updatePowerUps()` |
