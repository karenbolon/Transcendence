# Transcendence Game Architecture and Conciseness Review

## 1) Executive Summary

This codebase already has strong modular pieces (`src/lib/game/*`, `src/lib/server/socket/*`, `src/routes/*`), but it currently carries a large amount of duplicated logic and mixed responsibilities.

The largest bloat source is **dual server implementations**:
- A monolithic production server in `server.js` (~2183 lines)
- A modular TypeScript socket/game stack in `src/lib/server/socket/*`

Both implement auth, presence, invites, matchmaking, room lifecycle, chat, and tournaments. This creates drift risk and maintenance cost.

## 2) Stack and Runtime

- Framework: **SvelteKit 2** with **Svelte 5**
- Language: **TypeScript** (app code), plus one large JS runtime entry (`server.js`)
- Build/dev: **Vite**
- Realtime: **Socket.IO**
- Auth: **Lucia**
- DB: **PostgreSQL** + **Drizzle ORM**
- Testing: **Vitest** + **Playwright**

Source: `package.json`

## 3) High-Level Architecture

### Frontend (Svelte)

- Route UI in `src/routes/**/+page.svelte`
- Shared shell in `src/routes/+layout.svelte`
- State stores in `src/lib/stores/*.svelte.ts`
- Game rendering in:
  - `src/lib/component/pong/PongGame.svelte` (local/computer)
  - `src/lib/component/pong/OnlineGame.svelte` (online snapshot rendering)

### Backend (SvelteKit + Socket server)

- HTTP API endpoints in `src/routes/api/**/+server.ts`
- Session validation in `src/hooks.server.ts`
- DB layer in `src/lib/server/db/*` and `src/db/schema/*`
- Socket domain logic in `src/lib/server/socket/*`

### Data and domain

- Core entities: users, friendships, sessions, games, tournaments, messages, progression tables
- Game progression pipeline: match result -> XP/achievements (`src/lib/server/progression/*`)

## 4) Gameplay System Documentation

## 4.1 Game engine (`src/lib/game/gameEngine.ts`)

The engine is state-driven and shared conceptually across local and server-authoritative online modes.

Key concepts:
- `GameState`: paddles, ball kinematics, score, phase, timers, progression counters, power-up state
- `GameSettings`: win score, speed preset outputs, mode, AI difficulty, power-up toggle
- `update(state, dt, input, settings)`: phase dispatcher (`countdown`, `playing`)

Core transitions:
- `menu -> countdown` (`startCountdown`)
- `countdown -> playing` (`startPlaying`)
- `playing -> gameover` (`endGame`)
- `gameover -> menu` (`returnToMenu`)

Physics/features:
- Spin transfer from paddle velocity
- Progressive ball speed increase capped by preset
- AI opponent logic with difficulty profiles
- Power-up integration via `src/lib/game/powerups/engine.ts`

## 4.2 Local/computer gameplay UI (`PongGame.svelte`)

Responsibilities currently bundled in one large component:
- Input handling (keyboard + touch)
- Render loop (`requestAnimationFrame`)
- Effects + sound orchestration
- Canvas drawing and overlays
- Touch control UI

This component is feature-rich but oversized (~699 lines).

## 4.3 Online gameplay UI (`OnlineGame.svelte`)

Responsibilities:
- Send paddle input over socket
- Receive `game:state` snapshots
- Interpolate/extrapolate snapshots for smooth rendering
- Detect score/hit transitions for SFX/FX
- Render nearly the same canvas visuals as `PongGame.svelte`

This component duplicates a large amount of local rendering and control UI logic (~503 lines).

## 4.4 Server-authoritative online rooms

Main modules:
- `src/lib/server/socket/game/GameRoom.ts`
- `src/lib/server/socket/game/RoomManager.ts`
- `src/lib/server/socket/game/MatchmakingQueue.ts`
- `src/lib/server/socket/handlers/game.ts`

Behavior:
- Server ticks at 60Hz
- Merges both players' inputs
- Broadcasts snapshots/events
- Handles reconnect-forfeit timers
- Persists match result + progression + optional tournament advancement

## 5) Svelte/SvelteKit Framework Documentation

## 5.1 Route organization

The app uses SvelteKit route groups:
- `(api)` for auth/data endpoints
- `(game)/(pong)` for gameplay routes
- `(users_profile)` for profile/history/achievements
- `(legal)` for terms/privacy

## 5.2 Layout orchestration

`src/routes/+layout.svelte` is the global runtime coordinator:
- Connect/disconnect socket
- Register global listeners (friends, invites, chat, tournament notifications)
- Manage invite modal/toasts/chat panel
- Reconnect on auth state change

## 5.3 Server-side loading pattern

- `+layout.server.ts` loads current user, friend profiles, notification preferences
- route-level `+page.server.ts` files load domain-specific data

## 5.4 Stores

Notable stores:
- `socket.svelte.ts`: singleton socket lifecycle
- `chat.svelte.ts`: chat state/event handling
- `matchmaking.svelte.ts`: challenge/match start transition state
- `toast.svelte.ts`: user notifications

## 6) Bloat and Conciseness Findings

## Critical (architecture-level)

1. Dual implementation of core realtime backend
- `server.js` duplicates auth, friend lookup, game engine logic, room manager, matchmaking queue, tournament logic.
- Evidence:
  - Duplicate auth + cookie parser: `server.js:66-130` vs `src/lib/server/socket/auth.ts:22-48`
  - Duplicate game engine block: `server.js:156-548` vs `src/lib/game/gameEngine.ts`
  - Duplicate room logic: `server.js:550+` vs `src/lib/server/socket/game/GameRoom.ts`
  - Duplicate matchmaking: `server.js:1184+` vs `src/lib/server/socket/game/MatchmakingQueue.ts`
  - Duplicate tournament handlers in both server paths
- Impact: High drift risk, difficult debugging, high change cost.

2. Production bridging through globals indicates split runtime model
- `server.js` exports socket internals via globals (`globalThis.__socketIO`, `globalThis.__userSockets`) at `server.js:2175-2178`.
- `emitters.ts` then branches between globals and modular socket state (`src/lib/server/socket/emitters.ts:10-27`).
- Impact: hidden coupling and fragile environment behavior.

## High (logic/performance)

3. Dashboard load does heavy in-memory aggregation and N+1 tournament count queries
- `src/routes/+page.server.ts` loads all users + all games, aggregates in JS (`:21-74`, `:37-58`, `:107-145`).
- Per-tournament participant count query in a loop (`:213-228`).
- Impact: scales poorly as data grows.

4. Inconsistent `game_mode` values likely break feed filtering
- Match save uses `game_mode: 'online'` (`src/lib/server/socket/game/RoomManager.ts:140`)
- Feed filters for `'remote'` (`src/routes/+page.server.ts:112`)
- Impact: online matches can be omitted from activity feed.

## Medium (component-level bloat)

5. Canvas rendering duplicated across local and online components
- `PongGame.svelte` and `OnlineGame.svelte` share large drawing/effects/control sections.
- Example overlap: score flash, paddles, trail/particles, overlays, touch controls.
- Impact: bug fixes and visual changes require editing both files.

6. Root layout owns too many concerns
- `src/routes/+layout.svelte` combines socket listener registration, chat event handling, invite state machine, tournament notifications, navigation control.
- Impact: hard to test and reason about global behavior.

7. Large socket handler modules
- `src/lib/server/socket/handlers/game.ts` (~629 lines) mixes invites, join flow, queue flow, disconnect flow, system chat side-effects.
- Impact: difficult to maintain and validate behavior changes.

## 7) Concision Refactor Plan (Recommended)

## Phase 1: remove dual runtime drift

1. Make `src/lib/server/socket/*` the single source of truth.
2. Reduce `server.js` to bootstrap + static uploads + attach built handler + initialize modular socket stack.
3. Remove duplicated inline game/matchmaking/tournament logic from `server.js`.
4. Remove `globalThis` bridge and use one explicit socket module context.

## Phase 2: extract shared game presentation

1. Create shared canvas renderer utility module (draw background, paddles, ball, effects HUD, overlays).
2. Reuse shared touch-control component between local and online game views.
3. Keep mode-specific responsibilities only:
   - Local: own simulation tick
   - Online: snapshot interpolation + input emit

## Phase 3: split handlers by use-case

1. In `handlers/game.ts`, separate into focused modules:
   - invites
   - room session
   - matchmaking queue
   - disconnect cleanup
2. Keep thin registration layer only.

## Phase 4: query optimization and consistency

1. Replace in-memory leaderboard/activity aggregation with SQL aggregation.
2. Replace tournament count N+1 with grouped query.
3. Standardize `game_mode` values and centralize constants.

## 8) Suggested Canonical Boundaries

- `src/lib/game/*`: pure gameplay domain (no transport assumptions)
- `src/lib/server/socket/game/*`: authoritative multiplayer runtime
- `src/lib/server/socket/handlers/*`: event-to-use-case adapter only
- `src/routes/+layout.svelte`: minimal shell wiring; move listener logic into dedicated service/store
- `server.js`: infrastructure bootstrap only

## 9) Practical First Steps

1. Introduce constants/enums for game modes (`online`, `local`, `computer`) and replace literals.
2. Fix feed filter mismatch (`remote` vs `online`).
3. Extract shared draw helpers from `PongGame.svelte` and `OnlineGame.svelte`.
4. Refactor `server.js` to call modular socket init and delete one duplicated slice at a time (auth -> queue -> room -> tournament).

---

If you want, the next step can be a concrete PR-style refactor plan with exact file-by-file edits and a safe migration order (including temporary compatibility shims).
