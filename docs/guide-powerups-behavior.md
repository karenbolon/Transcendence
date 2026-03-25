# Power-Ups: Behavior Logic (Your Part)

The base setup is already done — types, state, config, rendering, spawn logic, and settings toggle are all in place. Your job is to fill in the stub functions that make the power-ups actually DO something.

All stubs are in `src/lib/game/powerups/engine.ts` — search for `// TODO: Implement` to find them.

---

## Prerequisites

Before starting, make sure:
- You can run the project (`npm run dev`)
- Power-ups toggle exists in game settings
- Power-up items spawn on the court (pulsing circles)
- Ball collides with power-ups (they disappear)
- HUD shows under each player's score (bars appear when effects are active)
- The stub functions exist and are called (just do nothing yet)
- Only `bigPaddle` and `smallPaddle` are enabled in `POWERUP_CONFIG` — the rest are commented out. Uncomment each type in `src/lib/game/powerups/types.ts` as you implement its behavior.

**NOTE:** Power-ups currently only work in local/computer games. Online games need a separate fix — see `guide-powerups-online.md`.

---

## How It All Connects

```
Ball hits power-up item
  → updatePowerUps() detects collision
  → calls collectPowerUp()          ← YOU IMPLEMENT THIS (Step 1)
  → effect added to activeEffects[]
  → every frame: movePaddles() checks isFrozen() / isReversed()  ← Steps 5-6
  → every frame: checkPaddleCollision() uses getEffectivePaddleHeight()  ← Step 3
  → every frame: applyContinuousEffects() runs wall/magnet  ← Step 4
  → timer expires → onEffectExpired() cleans up  ← Step 2
```

---

## Step 1: collectPowerUp() — PARTIALLY DONE

This function is already implemented. It handles effect assignment and timer refresh.

**What's missing:** The speed/slow ball immediate effects. Add the `rescaleBallVelocity` helper and the speed modification code.

The current code in `engine.ts` has a `// TODO` where the speed changes go. Replace it with:

```typescript
function collectPowerUp(state: GameState, item: PowerUpItem): void {
  const collector = state.lastBallHitter ?? 'player1';
  const opponent = collector === 'player1' ? 'player2' : 'player1';
  const config = POWERUP_CONFIG[item.type];

  // Positive effects help the collector, negative effects hurt the opponent
  const target = config.positive ? collector : opponent;

  // Same effect on same target? Refresh timer instead of stacking
  const existing = state.activeEffects.find(
    e => e.type === item.type && e.target === target
  );
  if (existing) {
    existing.remainingTime = config.duration;
    return;
  }

  // Add the effect
  state.activeEffects.push({
    type: item.type,
    target,
    remainingTime: config.duration,
    duration: config.duration,
  });

  // Immediate effects that change ball speed on collection:
  if (item.type === 'speedBall') {
    state.currentBallSpeed *= 1.5;
    rescaleBallVelocity(state);
  }
  if (item.type === 'slowBall') {
    state.currentBallSpeed *= 0.6;
    rescaleBallVelocity(state);
  }
}

/** Helper: rescale ballVX/ballVY to match currentBallSpeed */
function rescaleBallVelocity(state: GameState): void {
  const speed = Math.sqrt(state.ballVX ** 2 + state.ballVY ** 2);
  if (speed > 0) {
    const scale = state.currentBallSpeed / speed;
    state.ballVX *= scale;
    state.ballVY *= scale;
  }
}
```

### How to test:
1. Enable power-ups in settings
2. Play a local game
3. Hit a power-up with the ball
4. Check the browser console — add `console.log('Collected:', item.type, 'target:', target)` temporarily
5. The HUD should now show the effect with a timer bar

---

## Step 2: onEffectExpired()

Called when an effect's timer reaches 0. Undo any persistent changes.

Replace the stub with:

```typescript
function onEffectExpired(state: GameState, effect: ActiveEffect, settings: GameSettings): void {
  // Speed/slow ball: restore original speed
  if (effect.type === 'speedBall') {
    // Undo the 1.5x multiplier
    state.currentBallSpeed /= 1.5;
    rescaleBallVelocity(state);
  }
  if (effect.type === 'slowBall') {
    // Undo the 0.6x multiplier
    state.currentBallSpeed /= 0.6;
    // Cap at max speed to prevent bugs
    state.currentBallSpeed = Math.min(state.currentBallSpeed, settings.maxBallSpeed);
    rescaleBallVelocity(state);
  }
  // All other effects (bigPaddle, smallPaddle, freeze, reverse, wall, magnet, invisible)
  // are checked every frame via active effects list — removing from the list is enough
}
```

### How to test:
1. Collect a speed ball power-up
2. Ball should go faster
3. Wait for the timer to expire
4. Ball should return to normal speed

---

## Step 3: getEffectivePaddleHeight() — DONE

Already implemented. Handles bigPaddle (2x) and smallPaddle (0.5x).

For reference, the current code:

```typescript
export function getEffectivePaddleHeight(state: GameState, player: 'player1' | 'player2'): number {
  let height = PADDLE_HEIGHT;

  for (const effect of state.activeEffects) {
    if (effect.target !== player) continue;

    if (effect.type === 'bigPaddle') {
      height *= 2;
    }
    if (effect.type === 'smallPaddle') {
      height *= 0.5;
    }
  }

  return height;
}
```

### How to test:
1. Collect a bigPaddle power-up
2. Your paddle should visually double in height
3. The collision area should also be bigger (you can hit the ball with the extended area)
4. Collect a smallPaddle — opponent's paddle should shrink
5. When timer expires, paddles return to normal

---

## Step 4: applyContinuousEffects()

Called every frame. Handles effects that need ongoing physics (wall collision, magnet attraction).

Replace the stub with:

```typescript
function applyContinuousEffects(state: GameState, dt: number): void {
  for (const effect of state.activeEffects) {
    // ── Wall Barrier ──
    if (effect.type === 'wall') {
      const wallX = effect.target === 'player1'
        ? PADDLE_OFFSET + PADDLE_WIDTH + 60
        : CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH - 68;
      const wallWidth = 8;
      const wallHeight = 100;
      const wallY = CANVAS_HEIGHT / 2 - wallHeight / 2;

      // Check ball collision with wall
      if (
        state.ballX + BALL_RADIUS >= wallX &&
        state.ballX - BALL_RADIUS <= wallX + wallWidth &&
        state.ballY + BALL_RADIUS >= wallY &&
        state.ballY - BALL_RADIUS <= wallY + wallHeight
      ) {
        // Bounce
        state.ballVX = -state.ballVX;
        // Push ball out of wall
        if (state.ballVX > 0) {
          state.ballX = wallX + wallWidth + BALL_RADIUS;
        } else {
          state.ballX = wallX - BALL_RADIUS;
        }
      }
    }

    // ── Magnet ──
    if (effect.type === 'magnet') {
      const paddleHeight = getEffectivePaddleHeight(state, effect.target);
      const paddleCenterY = effect.target === 'player1'
        ? state.paddle1Y + paddleHeight / 2
        : state.paddle2Y + paddleHeight / 2;

      // Only attract when ball is heading toward the magnet paddle
      const attracting =
        (effect.target === 'player1' && state.ballVX < 0) ||
        (effect.target === 'player2' && state.ballVX > 0);

      if (attracting) {
        const dy = paddleCenterY - state.ballY;
        const attraction = 200; // px/s² — tune this for balance
        state.ballVY += Math.sign(dy) * attraction * dt;
      }
    }
  }
}
```

### How to test Wall:
1. Collect a wall power-up
2. A barrier should appear in front of your goal
3. Ball should bounce off the barrier
4. When timer expires, barrier disappears

### How to test Magnet:
1. Collect a magnet power-up
2. When the ball is heading toward your paddle, it should curve toward your paddle center
3. The effect should be noticeable but not overpowering
4. If too strong: lower `attraction` to 120. If too weak: raise to 300.

---

## Step 5: isReversed()

Checks if a player has reversed controls.

Replace the stub with:

```typescript
export function isReversed(state: GameState, player: 'player1' | 'player2'): boolean {
  return state.activeEffects.some(
    e => e.type === 'reverseControls' && e.target === player
  );
}
```

### How to test:
1. Collect a reverseControls power-up
2. Opponent's up key should move their paddle down, and vice versa
3. After timer expires, controls return to normal

---

## Step 6: isFrozen()

Checks if a player's paddle is frozen.

Replace the stub with:

```typescript
export function isFrozen(state: GameState, player: 'player1' | 'player2'): boolean {
  return state.activeEffects.some(
    e => e.type === 'freeze' && e.target === player
  );
}
```

### How to test:
1. Collect a freeze power-up
2. Opponent's paddle should stop moving completely for 2 seconds
3. Their paddle should have a cyan tint while frozen (base setup handles this)
4. After 2 seconds, they can move again

---

## Step 7: isInvisibleBallActive()

Checks if the invisible ball effect is active.

Replace the stub with:

```typescript
export function isInvisibleBallActive(state: GameState): boolean {
  return state.activeEffects.some(e => e.type === 'invisibleBall');
}
```

### How to test:
1. Collect an invisibleBall power-up
2. Ball should become nearly invisible when it's in the middle ~60% of the court
3. Ball is still visible near the paddles (edges of the court)
4. Ball still exists in physics — it still bounces and scores, just hard to see
5. After timer expires, ball is fully visible again

---

## Step 8: Mirror Everything to server.js

This is the last step. Every function you implemented needs to be copied to `server.js` in plain JavaScript (no TypeScript types).

### What to copy:
1. `collectPowerUp(state, item)` function
2. `rescaleBallVelocity(state)` helper
3. `onEffectExpired(state, effect, settings)` function
4. `getEffectivePaddleHeight(state, player)` function
5. `applyContinuousEffects(state, dt)` function
6. `isReversed(state, player)` function
7. `isFrozen(state, player)` function
8. `isInvisibleBallActive(state)` function (not needed server-side, but keep for consistency)

### How to convert:
- Remove TypeScript types: `(state: GameState, item: PowerUpItem)` → `(state, item)`
- Remove `export` keywords
- Keep the logic identical

### Where in server.js:
- Add the functions near the other game engine functions (after `checkScoring`, before the `ServerGameRoom` class)
- The base setup already added `updatePowerUps()`, `spawnPowerUp()`, and the config to server.js — you just need the behavior functions

---

## Summary: All Stubs and Where They Go

| Stub | What It Does | Difficulty | Status |
|------|-------------|-----------|--------|
| `collectPowerUp()` | Applies power-up effect when ball hits item | Medium | PARTIAL — needs speedBall/slowBall + `rescaleBallVelocity` helper |
| `onEffectExpired()` | Undoes speed/slow changes when timer runs out | Easy | TODO |
| `getEffectivePaddleHeight()` | Returns modified paddle height for big/small effects | Easy | DONE |
| `applyContinuousEffects()` | Runs wall collision + magnet attraction every frame | Medium | TODO |
| `isReversed()` | Checks for reverse controls effect | Easy — one line | TODO |
| `isFrozen()` | Checks for freeze effect | Easy — one line | TODO |
| `isInvisibleBallActive()` | Checks for invisible ball effect | Easy — one line | TODO |
| Mirror to `server.js` | Copy all functions as plain JS | Easy — remove types, paste | TODO |

---

## Testing Checklist

- [ ] Big Paddle: paddle grows, collision area grows, expires correctly
- [ ] Small Paddle: opponent paddle shrinks, expires correctly
- [ ] Speed Ball: ball speeds up on collection, slows back on expiry
- [ ] Slow Ball: ball slows on collection, speeds back on expiry
- [ ] Freeze: opponent can't move for 2s, paddle shows cyan
- [ ] Reverse Controls: opponent's up/down swapped, paddle shows purple
- [ ] Invisible Ball: ball nearly invisible in mid-court, visible near paddles
- [ ] Wall: barrier appears, ball bounces off it, disappears on expiry
- [ ] Magnet: ball curves toward paddle when approaching, not too strong
- [ ] Same power-up collected twice: refreshes timer (doesn't double-stack)
- [ ] Different power-ups stack (e.g., big paddle + freeze at same time)
- [ ] Speed + Slow at same time: they partially cancel (this is fine)
- [ ] Effects clear when game ends
- [ ] Online: both players see correct effects (after server.js mirror)
- [ ] No physics glitches when effects expire mid-rally

---

## Balance Tips

If playtesting reveals issues:

| Problem | Fix |
|---------|-----|
| Freeze too long | Reduce duration from 3 to 2s |
| Magnet too strong | Lower `attraction` from 200 to 120 |
| Speed ball too chaotic | Reduce multiplier from 1.5 to 1.3 |
| Wall too powerful | Reduce wallHeight from 100 to 70 |
| Power-ups spawn too often | Increase `POWERUP_COOLDOWN_MIN/MAX` |
| One power-up dominates | Lower its `spawnWeight` in `POWERUP_CONFIG` |
| Big paddle + magnet combo too OP | Add rule: max 2 active effects per player |
