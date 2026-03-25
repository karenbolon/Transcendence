# Multi-Ball Power-Up Implementation Guide

This is a standalone guide for adding the Multi-Ball power-up. It requires refactoring the game engine to support multiple balls, which is why it's separate from the other power-ups.

**Prerequisites:**
- All other power-ups should be working first (all stubs filled in, all types uncommented)
- Online power-ups fix applied (see `guide-powerups-online.md`)
- This guide assumes the power-up system (types, config, engine, renderer) is already in place

---

## Why It's Hard

The entire game engine assumes one ball:

```typescript
// Current — single ball
state.ballX, state.ballY, state.ballVX, state.ballVY
state.currentBallSpeed, state.ballSpin, state.ballRotation
```

Multi-Ball needs an array:

```typescript
// New — multiple balls
state.balls: Ball[]
// where Ball = { x, y, vx, vy, speed, spin, rotation, isExtra }
```

Every function that touches the ball must be updated to loop over all balls. The "real" ball scores points; extra balls just disappear when they pass the goal line.

---

## Architecture

```
Multi-Ball collected
  → Spawn 1-2 extra balls at current ball position
  → Extra balls get random directions (spread from original)
  → All balls bounce independently off paddles and walls
  → Only the original ball (isExtra = false) can score
  → Extra balls disappear when they pass the goal line
  → When Multi-Ball timer expires, remove all extra balls
```

---

## Step 1: Define the Ball Interface

**File: `src/lib/game/powerups/types.ts`**

Add:

```typescript
export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;       // currentBallSpeed equivalent
  spin: number;
  rotation: number;
  isExtra: boolean;    // false = original ball (can score), true = extra (cosmetic)
}
```

Add `'multiBall'` to the `PowerUpType` union:

```typescript
export type PowerUpType =
  | 'bigPaddle'
  | 'smallPaddle'
  // ... existing types ...
  | 'magnet'
  | 'multiBall';
```

Add to `POWERUP_CONFIG` in `src/lib/game/powerups/types.ts` (note: the config uses `Partial<Record>` so you just add the line):

```typescript
  multiBall: { duration: 8, positive: true, spawnWeight: 1 },
```

**Important:** Make sure all other power-up types are also uncommented before adding Multi-Ball — it should be the last power-up implemented.

---

## Step 2: Add balls Array to GameState

**File: `src/lib/game/gameEngine.ts`**

Add to `GameState` interface:

```typescript
  // Multi-ball
  balls: Ball[];  // index 0 = original ball, rest = extras
```

In `createGameState()`, initialize:

```typescript
  balls: [],  // populated when game starts
```

---

## Step 3: Migration Strategy — Keep Both Systems

Don't remove `ballX/ballY/ballVX/ballVY` yet. Instead, sync them:

```typescript
// After updating all balls, sync the "main" ball back to state fields
// This keeps everything else working (rendering, scoring, snapshots)
if (state.balls.length > 0) {
  const main = state.balls[0];
  state.ballX = main.x;
  state.ballY = main.y;
  state.ballVX = main.vx;
  state.ballVY = main.vy;
  state.currentBallSpeed = main.speed;
  state.ballSpin = main.spin;
  state.ballRotation = main.rotation;
}
```

This way you can implement Multi-Ball without breaking everything else.

---

## Step 4: Initialize Balls When Game Starts

In `startPlaying()`, create the initial ball:

```typescript
export function startPlaying(state: GameState, settings: GameSettings): void {
  state.phase = 'playing';
  const direction = Math.random() > 0.5 ? 1 : -1;
  state.ballVX = settings.ballSpeed * direction;
  state.ballVY = settings.ballSpeed * (Math.random() - 0.5);

  // Initialize balls array with the main ball
  state.balls = [{
    x: state.ballX,
    y: state.ballY,
    vx: state.ballVX,
    vy: state.ballVY,
    speed: settings.ballSpeed,
    spin: 0,
    rotation: 0,
    isExtra: false,
  }];
}
```

In `resetBall()`, reset to just the main ball:

```typescript
  // Remove extra balls on score
  state.balls = state.balls.filter(b => !b.isExtra);
  if (state.balls.length > 0) {
    const main = state.balls[0];
    main.x = CANVAS_WIDTH / 2;
    main.y = CANVAS_HEIGHT / 2;
    main.speed = settings.ballSpeed;
    main.spin = 0;
    // ... set vx, vy from settings
  }
```

---

## Step 5: Spawn Extra Balls on Collection

In `collectPowerUp()`, add handling for `multiBall`:

```typescript
if (item.type === 'multiBall') {
  // Spawn 1-2 extra balls at the current ball position
  const extraCount = Math.random() > 0.5 ? 2 : 1;
  const mainBall = state.balls[0];
  if (!mainBall) return;

  for (let i = 0; i < extraCount; i++) {
    // Spread angle from original direction
    const spreadAngle = (Math.random() - 0.5) * 1.2; // +-0.6 radians
    const currentAngle = Math.atan2(mainBall.vy, mainBall.vx);
    const newAngle = currentAngle + spreadAngle;

    state.balls.push({
      x: mainBall.x,
      y: mainBall.y,
      vx: mainBall.speed * Math.cos(newAngle),
      vy: mainBall.speed * Math.sin(newAngle),
      speed: mainBall.speed,
      spin: 0,
      rotation: 0,
      isExtra: true,
    });
  }
}
```

---

## Step 6: Update Physics for All Balls

In `updatePlaying()`, after moving the main ball, update extras:

```typescript
// Update extra balls
for (let i = 1; i < state.balls.length; i++) {
  const ball = state.balls[i];

  // Apply spin
  ball.vy += ball.spin * SPIN_ACCELERATION * dt;
  ball.spin *= SPIN_DECAY;
  if (Math.abs(ball.spin) < 0.001) ball.spin = 0;
  ball.rotation += ball.spin * 15 * dt;

  // Move
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Wall bounce (top/bottom)
  if (ball.y - BALL_RADIUS <= 0) {
    ball.y = BALL_RADIUS;
    ball.vy = Math.abs(ball.vy);
  }
  if (ball.y + BALL_RADIUS >= CANVAS_HEIGHT) {
    ball.y = CANVAS_HEIGHT - BALL_RADIUS;
    ball.vy = -Math.abs(ball.vy);
  }

  // Paddle collision (same logic as main ball)
  checkBallPaddleCollision(state, ball, settings);

  // Extra balls don't score — just disappear past the edges
  if (ball.x + BALL_RADIUS < 0 || ball.x - BALL_RADIUS > CANVAS_WIDTH) {
    state.balls.splice(i, 1);
    i--;
  }
}
```

Create a shared paddle collision function that works with any ball:

```typescript
function checkBallPaddleCollision(
  state: GameState,
  ball: Ball,
  settings: GameSettings,
): void {
  const p1Height = getEffectivePaddleHeight(state, 'player1');
  const p2Height = getEffectivePaddleHeight(state, 'player2');

  // Left paddle
  if (
    ball.vx < 0 &&
    ball.x - BALL_RADIUS <= PADDLE_OFFSET + PADDLE_WIDTH &&
    ball.x + BALL_RADIUS >= PADDLE_OFFSET &&
    ball.y + BALL_RADIUS >= state.paddle1Y &&
    ball.y - BALL_RADIUS <= state.paddle1Y + p1Height
  ) {
    // Bounce (simplified for extra balls — no spin transfer)
    ball.vx = Math.abs(ball.vx);
    ball.x = PADDLE_OFFSET + PADDLE_WIDTH + BALL_RADIUS;
  }

  // Right paddle
  const p2Left = CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
  if (
    ball.vx > 0 &&
    ball.x + BALL_RADIUS >= p2Left &&
    ball.x - BALL_RADIUS <= CANVAS_WIDTH - PADDLE_OFFSET &&
    ball.y + BALL_RADIUS >= state.paddle2Y &&
    ball.y - BALL_RADIUS <= state.paddle2Y + p2Height
  ) {
    ball.vx = -Math.abs(ball.vx);
    ball.x = p2Left - BALL_RADIUS;
  }
}
```

---

## Step 7: Clean Up on Effect Expiry

In `onEffectExpired()`:

```typescript
if (effect.type === 'multiBall') {
  // Remove all extra balls
  state.balls = state.balls.filter(b => !b.isExtra);
}
```

---

## Step 8: Render Extra Balls

In `PongGame.svelte` and `OnlineGame.svelte`, after drawing the main ball:

```typescript
// Draw extra balls
if (game.balls && game.balls.length > 1) {
  for (let i = 1; i < game.balls.length; i++) {
    const ball = game.balls[i];
    // Slightly transparent to distinguish from main ball
    ctx.globalAlpha = 0.7;
    drawBall(ctx, ballSkin, theme, ball.x, ball.y, gameTime, ball.spin, ball.rotation);
  }
  ctx.globalAlpha = 1;
}
```

---

## Step 9: Update GameStateSnapshot

**File: `src/lib/types/game.ts`**

Add to `GameStateSnapshot`:

```typescript
  balls: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    spin: number;
    rotation: number;
    isExtra: boolean;
  }[];
```

**File: `GameRoom.ts`** — Add to `getSnapshot()`:

```typescript
  balls: this.state.balls.map(b => ({
    x: b.x, y: b.y, vx: b.vx, vy: b.vy,
    spin: b.spin, rotation: b.rotation, isExtra: b.isExtra,
  })),
```

---

## Step 10: Update Renderer Config

**File: `src/lib/game/powerups/renderer.ts`**

Add to `POWERUP_COLORS`:

```typescript
  multiBall: '#facc15',  // gold
```

Add to `POWERUP_ICONS`:

```typescript
  multiBall: '🎱',
```

---

## Step 11: Mirror to server.js

Copy:
1. `Ball` interface fields to server game state
2. `balls` array initialization in `createGameState()`
3. Extra ball physics loop in `updateGame()`
4. `checkBallPaddleCollision()` function
5. Multi-ball spawn logic in `collectPowerUp()`
6. Cleanup in `onEffectExpired()`
7. `balls` in snapshot

---

## Implementation Order

1. Add `Ball` interface and `multiBall` to types/config
2. Add `balls: []` to `GameState` + `createGameState()`
3. Initialize `balls[0]` in `startPlaying()`
4. Add sync from `balls[0]` back to `state.ballX/Y/VX/VY` (migration bridge)
5. Spawn extra balls in `collectPowerUp()`
6. Add physics loop for extra balls
7. Add `checkBallPaddleCollision()` for extras
8. Remove extras on score / edge / expiry
9. Render extra balls (slightly transparent)
10. Update snapshot + GameRoom
11. Mirror to server.js
12. Test extensively

---

## Testing Checklist

- [ ] Multi-Ball power-up spawns on court with gold icon
- [ ] Collecting it spawns 1-2 extra balls
- [ ] Extra balls spread in different directions from original
- [ ] Extra balls bounce off paddles and walls
- [ ] Only the original ball can score points
- [ ] Extra balls disappear when they pass the goal line
- [ ] All extra balls removed when timer expires
- [ ] All extra balls removed on score reset
- [ ] Extra balls render slightly transparent (distinguishable)
- [ ] Main ball still works normally with extras on screen
- [ ] No physics glitches when extra ball hits paddle at same time as main
- [ ] Online: both players see all balls in sync
- [ ] Other power-ups still work while Multi-Ball is active

---

## Edge Cases

- **Extra ball hits power-up item** — Only the main ball should collect power-ups. Add a check: `if (ball.isExtra) skip power-up collision`.
- **Multiple Multi-Ball power-ups stacked** — Cap total balls at 4 (1 main + 3 extras max).
- **Invisible Ball + Multi-Ball** — Apply invisible effect to ALL balls or just main? Recommend: all balls, for consistency.
- **Score happens while extras exist** — Remove all extras on `resetBall()`.
- **Game ends while extras exist** — Cleared by `returnToMenu()` or game over state.

