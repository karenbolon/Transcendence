# ft_transcendence — Testing Guide

> **Role**: Senior reliability tester perspective.
> Each section maps to a claimed module. Focus is on **edge cases** and failure modes, not just happy-path flows.
>
> **Console instructions** appear as indented blocks below the test step where a browser command adds concrete, checkable evidence beyond looking at the UI.

---

## Table of Contents

1. [Mandatory — General Requirements](#1-mandatory--general-requirements)
2. [Web — Major: SvelteKit Framework (Frontend + Backend)](#2-web--major-sveltekit-framework-frontend--backend)
3. [Web — Major: Real-Time WebSockets](#3-web--major-real-time-websockets)
4. [Web — Major: User Interaction (Chat, Profiles, Friends)](#4-web--major-user-interaction-chat-profiles-friends)
5. [Web — Minor: ORM (Drizzle)](#5-web--minor-orm-drizzle)
6. [Web — Minor: Custom Design System](#6-web--minor-custom-design-system)
7. [Accessibility — Minor: Additional Browser Support](#7-accessibility--minor-additional-browser-support)
8. [User Management — Major: Authentication & User Management](#8-user-management--major-authentication--user-management)
9. [User Management — Minor: Game Statistics & Match History](#9-user-management--minor-game-statistics--match-history)
10. [User Management — Minor: OAuth 2.0 Remote Authentication](#10-user-management--minor-oauth-20-remote-authentication)
11. [AI — Major: AI Opponent](#11-ai--major-ai-opponent)
12. [Gaming — Major: Complete Web-Based Game (Pong)](#12-gaming--major-complete-web-based-game-pong)
13. [Gaming — Major: Remote Players](#13-gaming--major-remote-players)
14. [Gaming — Major: Multiplayer 3+ Players (Tournament)](#14-gaming--major-multiplayer-3-players-tournament)
15. [Gaming — Minor: Advanced Chat Features](#15-gaming--minor-advanced-chat-features)
16. [Gaming — Minor: Tournament System](#16-gaming--minor-tournament-system)
17. [Gaming — Minor: Game Customization](#17-gaming--minor-game-customization)
18. [Gaming — Minor: Gamification System](#18-gaming--minor-gamification-system)

---

## 1. Mandatory — General Requirements

1. Open the app in the **latest stable Google Chrome** — confirm no JS errors or warnings in the DevTools console.
   > **Console:** Navigate all main pages while the Console tab is open. Any `console.error` or red-highlighted line is a failure. Run `window.onerror = (m,s,l,c,e) => console.error('Uncaught:', m, e)` to catch unhandled errors before navigating.

2. Open DevTools Network tab — confirm all requests use **HTTPS** (no mixed-content warnings).
   > **Console:** `performance.getEntriesByType('resource').filter(r => r.name.startsWith('http://')).map(r => r.name)` — result should be an empty array.

3. Navigate to the **Privacy Policy** page from the footer — confirm it loads, has real content, and is not a placeholder.
4. Navigate to the **Terms of Service** page from the footer — confirm it loads, has real content.
5. Start the app with a **single command** (`make start` or `docker compose up`) — confirm it comes up without manual steps.
6. Open the app in two different browser windows (two users logged in simultaneously) — confirm no conflicts or crashes.
7. Have three users perform actions at the same time (send chat, play game, update profile) — confirm no race conditions or data corruption.
8. Check the git log — confirm commits from all team members with meaningful messages.
9. Confirm `.env` is **not** committed to git; confirm `.env.example` exists.
10. **Edge case**: Kill the Docker DB container mid-session — confirm the app shows a meaningful error, not a raw crash dump.
    > **Console:** Watch the Console tab after the DB dies; confirm no raw stack trace leaks into the browser (only user-facing error messages).

11. **Edge case**: Open the app with JavaScript disabled — confirm at minimum the login page renders (SSR).
    > **Console:** DevTools → Settings → Debugger → "Disable JavaScript". Reload. View page source: HTML content (not just `<div>`) must be present.

---

## 2. Web — Major: SvelteKit Framework (Frontend + Backend)

### Frontend (Svelte 5 + SvelteKit)
1. Navigate all main pages — confirm they are server-side rendered (SSR): view page source and check that HTML content (not just `<div id="app">`) is present.
   > **Console:** `document.documentElement.outerHTML.length` — if SSR is working this will be large (thousands of chars) even before Svelte hydrates.

2. Disable JavaScript in Chrome — confirm core pages (login, register, profile) still render with content from SSR.
3. Check that SvelteKit routing works: navigate via browser back/forward buttons — confirm no broken states.
4. Confirm Svelte 5 reactivity: update your username in settings — confirm the header avatar/name updates without a full page reload.
   > **Console:** Before saving, note `document.querySelector('[data-testid="header-username"]')?.textContent` (or similar selector). After save, run it again — should reflect the new name without having reloaded.

### Backend (SvelteKit API routes)
5. `PUT /api/profile` with valid data — confirm `200` with updated user object.
   > **Console:** `fetch('/api/profile', {
  method: 'PUT',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'TestName' })
})
.then(async (r) => {
  console.log('status:', r.status);
  const data = await r.json();
  console.log(data);
})` — expect `200` and the updated user fields.

6. `PUT /api/profile` without a session cookie — confirm `401` (not a crash).
   > **Console (in a private/incognito window with no session):** `fetch('/api/profile', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'x'})}).then(r => console.log(r.status))` — expect `401`.

7. Call any API endpoint with an **invalid HTTP method** (e.g., `DELETE /api/profile`) — confirm `405` or `404`, not a 500.
   > **Console:** `fetch('/api/profile', {method:'DELETE', credentials:'include'}).then(r => console.log(r.status))` — expect `405` or `404`, never `500`.

8. **Edge case**: Send a request body with extra unknown fields — confirm they are ignored (no server crash, no leakage of internal error).
   > **Console:** `fetch('/api/profile', {method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'x', __proto__:'polluted', isAdmin:true})}).then(r => console.log(r.status))` — expect `200`, no error.

9. **Edge case**: Submit a form with Content-Type `application/json` when the server expects `multipart/form-data` — confirm graceful rejection.
   > **Console:** `fetch('/api/profile/avatars/uploads', {method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({fake:'data'})}).then(r => console.log(r.status))` — expect `400` or `415`, not `500`.

10. **Edge case**: Send a malformed JSON body to any API endpoint — confirm `400`, not a raw stack trace.
    > **Console:** `fetch('/api/profile', {method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: '{name: bad json'}).then(r => console.log(r.status))` — expect `400`. Then check the Console tab — no stack trace should be visible.

---

## 3. Web — Major: Real-Time WebSockets

### Connection & Reconnection
1. Log in and open the app — confirm the Socket.IO connection is established.
   > **Console:** Open DevTools → Network → **WS** tab. Look for a WebSocket connection to the server (URL contains `socket.io`). Click it and open the **Messages** sub-tab — you should see the Socket.IO handshake packets (starting with `0{...}`).

2. Simulate a network interruption (DevTools → Network → Offline) for 5 seconds, then restore — confirm the socket reconnects automatically and online status recovers.
   > **Console:** In the WS Messages tab, watch for a disconnect followed by a new `0{...}` handshake packet after you restore the connection. The gap in packets confirms the disconnect; the new handshake confirms the reconnect.

3. Log out — confirm the WebSocket connection is closed and the server removes the socket from presence tracking.
   > **Console:** After logout, check the Network → WS tab — the existing connection should show as `(closed)` or disappear. No new handshake should appear.

4. Open the app in two tabs with the same user — confirm both tabs receive events (friend messages, game state updates).
   > **Console (in each tab):** Open the WS tab. Both tabs should show an active `socket.io` WebSocket. When a friend message arrives, both WS streams should contain a `chat:message` packet.

5. Close one of the two tabs — confirm the user is still shown as online.
6. Close both tabs — confirm the user's `is_online` status becomes `false` after the 5-second grace period.

### Authentication
7. Try to establish a WebSocket connection without a session cookie (e.g., via `wscat`) — confirm the handshake is rejected with an auth error.
   > **Terminal:** `wscat -c 'wss://karenbolon-transcendence-main.walt3r.dev/socket.io/?EIO=4&transport=websocket'`
   then in terminal type: 42["chat:message","hello"]
   
   or
   `wscat -c 'wss://localhost:5173/socket.io/?EIO=4&transport=websocket'` 
   then in terminal type: 42["chat:message","hello"]

   — the server should close the connection immediately with a 401/unauthorized message, not accept it.

8. **Edge case**: Expire/invalidate the session while the WebSocket is connected — confirm the socket is eventually disconnected or subsequent events are rejected.
   > **Console:** While connected, manually delete the session cookie: `document.cookie = 'auth_session=; Max-Age=0; path=/'`. Then trigger a socket action (e.g., send a chat message). Check the WS Messages tab — expect an error response or disconnection packet, not a successful event.

### Broadcasting
9. Have User A send a friend request to User B — confirm User B receives the `friend:request` event in real time without refreshing.
   > **Console (User B's browser):** In the WS Messages tab, filter or watch for a packet containing `friend:request`. It should appear within 1–2 seconds of User A sending the request.

10. Have User A come online — confirm all of User A's accepted friends receive `friend:online` immediately.
    > **Console (a friend's browser):** Watch the WS Messages tab. Within 2 seconds of User A logging in, a packet containing `friend:online` with User A's userId should appear.

11. **Edge case**: Have 10+ users connected simultaneously — confirm broadcasts don't cause noticeable slowdown.
    > **Console:** `performance.now()` before and after receiving a broadcast event. Delay between event send and receive should stay under 500 ms even under load.

12. **Edge case**: Send a socket event with a payload that exceeds the expected schema (e.g., oversized `content` field on `chat:send`) — confirm the server validates and rejects it, not crashes.

    **Console:**copy('a'.repeat(10000)) -This copies a massive string to your clipboard, paste it in the message for friend
    > **Console:** In the WS Messages tab, after sending the oversized payload, watch for a `chat:error` packet coming back from the server. No `chat:message` broadcast should appear.

---

## 4. Web — Major: User Interaction (Chat, Profiles, Friends)

### Chat — Basic
1. User A sends a message to User B — confirm it appears in User B's chat panel in real time.
   > **Console (User B):** In the WS Messages tab, confirm a packet containing `chat:message` and the correct `content` field arrives promptly.

2. User A sends a message to User B while User B has the chat closed — confirm the unread count badge increments on User B's UI.
3. User B opens the chat — confirm the unread count resets to 0.
4. Send a message with exactly 500 characters — confirm it is accepted.
   > **Console:** `fetch('/api/...', ...) ` — or trigger via `socket.emit('chat:send', {recipientId: ID, content: 'a'.repeat(500)})` if you have socket access. Confirm `chat:sent` comes back in the WS tab.

5. Send a message with 501 characters — confirm it is rejected with an error (not silently truncated).
   > **Console:** Watch the WS Messages tab after sending. Expect a `chat:error` packet, not `chat:sent`. The stored message count should not have increased: `fetch('/api/chat/FRIEND_ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.messages?.length))`.

6. **Edge case**: Send an empty message (whitespace only) — confirm it is rejected.
   > **Console:** Watch WS Messages tab for `chat:error` packet after sending whitespace-only content.

7. **Edge case**: Send a message containing `<script>alert(1)</script>` — confirm it is displayed as plain text, not executed (XSS check).
   > **Console:** After the message renders in the UI, run: `document.querySelectorAll('[class*="message"]').forEach(el => console.log(el.innerHTML))` — the output should contain `&lt;script&gt;`, not a raw `<script>` tag. If `alert()` fired, it is a confirmed XSS vulnerability.

8. **Edge case**: Send a message to yourself — confirm it is rejected with an error.
9. **Edge case**: Close the browser tab mid-send — confirm the partial message is not saved in a corrupt state.
10. Load chat history with 50+ messages — confirm pagination works and "load more" fetches older messages correctly.
    > **Console:** `fetch('/api/chat/FRIEND_ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('messages:', d.messages?.length, 'hasMore:', d.hasMore))` — first load should show 50 messages and `hasMore: true`.

### Chat — Non-Friend / Blocked
11. Attempt to send a message to a user who is not your friend — confirm it is rejected.
    > **Console:** Watch WS Messages tab for `chat:error` packet.

12. Block User B, then attempt to send User B a message — confirm it is rejected with a meaningful error.
    > **Console:** Watch WS Messages tab for `chat:error` packet after the blocked send attempt.

13. User B (who has been blocked by User A) tries to message User A — confirm it is rejected; confirm User B does not know they are blocked (privacy).
    > **Console (User B):** The `chat:error` message text should not contain the word "blocked" — it should be a generic error like "Cannot send message".

### Profiles
14. Navigate to your own profile page — confirm username, bio, avatar, stats (wins/losses), and match history are displayed.
15. Navigate to another user's profile — confirm you can view their public information.
16. **Edge case**: Navigate to `/profile/nonexistent-user-id` — confirm a proper 404 page, not a crash.
    > **Console:** Open the Network tab. The page request should return `404`, not `500`. No stack trace should appear in the Console tab.

### Friends System
17. Search for a user and send a friend request — confirm User B receives a real-time notification.
    > **Console (User B):** WS Messages tab — look for a `friend:request` packet within 2 seconds.

18. Accept the friend request — confirm both users now see each other in their friends list.
19. Decline a friend request — confirm the requester's request disappears; confirm they can send another request later.
20. Cancel a pending friend request before it is accepted — confirm it disappears from both sides.
21. Remove an existing friend — confirm they are removed from the friends list on both sides.
22. Send a friend request to a user who has already sent you one — confirm it auto-accepts (bidirectional match).
23. **Edge case**: Send a friend request to someone you are already friends with — confirm it is rejected, not a duplicate row.
    > **Console:** `fetch('/api/friends/request', {method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({friendId: ALREADY_FRIEND_ID})}).then(r=>console.log(r.status))` — expect `400` or `409`.

24. **Edge case**: Send a friend request to someone who has blocked you — confirm appropriate handling (silent rejection or generic error, not revealing the block).
25. User A goes online — confirm User A's friends see the online indicator turn green in real time.
    > **Console (a friend's browser):** WS Messages tab — look for `friend:online` packet containing User A's userId within 2 seconds of User A's socket connecting.

26. User A closes all tabs — confirm after ~5 seconds the online indicator turns grey for all friends.
    > **Console (a friend's browser):** After User A closes all tabs, wait 5–7 seconds, then watch WS Messages tab for `friend:offline` packet.

27. **Edge case**: User A rapidly opens and closes tabs — confirm no flickering of online/offline status (grace period handles it).
    > **Console (a friend's browser):** Watch the WS Messages tab while User A opens/closes tabs rapidly. You should see at most one `friend:offline` → `friend:online` cycle, not rapid alternation.

---

## 5. Web — Minor: ORM (Drizzle)

1. Run `npm run db:generate` after a schema change — confirm a new migration file is created.
2. Run `npm run db:migrate` — confirm the migration applies cleanly to a fresh DB.
3. Run migrations twice in a row — confirm idempotency (no errors on re-run, per `IF NOT EXISTS` guards).
4. **Edge case**: Insert a user with a duplicate `username` — confirm Drizzle throws a constraint violation, not a silent overwrite.
5. **Edge case**: Insert a user with a duplicate `email` — same as above.
6. Delete a user who has games, messages, and friendships — confirm all related rows cascade/nullify correctly (no orphaned FK rows that block deletion).
7. Run Drizzle Studio (`make db-studio`) — confirm the schema is visible and tables have the expected columns.

---

## 6. Web — Minor: Custom Design System

1. Count reusable components in `src/lib/component/` — confirm at least 10 distinct, reusable components.
2. Verify each of the following renders correctly in isolation: `Modal`, `Toast`, `UserAvatar`, `FriendCard`, `BadgeDisplay`, `PongSettings`, `ChatPanel`, `GameOver`, `PasswordInput`, `DeleteModal`.
3. Trigger a success toast, an error toast, and an info toast — confirm each has a distinct visual style.
4. Open a Modal — confirm it closes when clicking the backdrop or pressing Escape.
5. Resize the browser to mobile width (375px) — confirm no horizontal overflow, no overlapping elements.
   > **Console:** `document.documentElement.scrollWidth > document.documentElement.clientWidth` — should return `false` (no horizontal overflow).

6. Resize to tablet (768px) and desktop (1440px) — confirm layout adapts correctly.
7. **Edge case**: Render `UserAvatar` for a user with no avatar set — confirm the default avatar is shown, not a broken image icon.
   > **Console:** `document.querySelectorAll('img').forEach(img => { if (!img.complete || img.naturalWidth === 0) console.error('Broken image:', img.src) })` — no broken images should be logged.

8. **Edge case**: Render a `FriendCard` for a user with a very long username (50+ chars) — confirm it is truncated with ellipsis, not overflowing the card.
   > **Console:** Select the username element and check: `getComputedStyle(document.querySelector('[class*="friend-card"] [class*="username"]')).overflow` — should be `hidden` or `ellipsis`.

9. Verify the color palette is consistent across all pages (no mismatched primary colors between pages).
10. Verify typography is consistent (same font family, consistent heading sizes).
    > **Console:** `getComputedStyle(document.querySelector('h1')).fontFamily` — run this on different pages and confirm the same font family is returned.

---

## 7. Accessibility — Minor: Additional Browser Support

1. Open the app in the **latest stable Firefox** — perform login, send a chat message, and start a game. Confirm all work without errors.
   > **Console (Firefox):** Open the Browser Console (Ctrl+Shift+J). Any red errors during these flows are failures.

2. Open the app in **Microsoft Edge** (Chromium) — perform the same basic flows.
3. Open DevTools in Firefox and Chrome side by side — confirm no browser-specific console errors in either.
4. Test the Pong canvas game in Firefox — confirm the game renders and keyboard input works.
5. Test WebSocket (Socket.IO) in Firefox — confirm real-time events (friend online, chat messages) work.
   > **Console (Firefox):** Network → WS tab — verify the `socket.io` WebSocket connection is active and messages flow, same as in Chrome.

6. **Edge case**: Test with browser zoom at 150% — confirm no broken layouts.
   > **Console:** At 150% zoom: `document.documentElement.scrollWidth > document.documentElement.clientWidth` should return `false`.

7. **Edge case**: Test with a browser that has third-party cookies blocked — confirm sessions still work (first-party cookies only).
   > **Console:** `document.cookie` — after login, the session cookie (e.g., `session=...`) should still be present even with third-party cookies blocked, as it is a first-party cookie.

---

## 8. User Management — Major: Authentication & User Management

### Registration
1. Register with a valid unique username and email — confirm account is created and you are logged in.
2. Register with an already-taken **username** — confirm a clear error message, no account created.
3. Register with an already-taken **email** — confirm a clear error message, no account created.
4. Register with an empty username field — confirm client-side and server-side validation both reject it.
5. Register with a username containing special characters (e.g., `<script>`, `'; DROP TABLE`) — confirm proper sanitization/rejection.
   > **Console:** After submitting, confirm no `alert()` fired and no JS error appeared. Then: `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.username))` — the stored username should be the sanitized/rejected string, not executable.

6. Register with a very long username (100+ chars) — confirm rejection with a length error.
7. Register with a password shorter than the minimum length — confirm rejection.
8. Register with an invalid email format (`notanemail`) — confirm rejection.
9. **Edge case**: Submit the registration form twice quickly (double-click) — confirm only one account is created (no race condition duplicate).
   > **Console:** After both submits complete, `fetch('/api/friends/search?q=THE_USERNAME', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('users found:', d.length))` — should return exactly 1 user.

10. **Edge case**: Register, then immediately attempt to register with the same username in a second tab before the first request completes — confirm the DB constraint prevents duplicates.

### Login
11. Log in with correct username and password — confirm session cookie is set and you are redirected to home.
    >**Lucia** is HTTPOnly therefore `document.cookie` doesn't work
    >**application tab/cookies** click on cookie, it should say auth_session

    > **Console:** After login, `document.cookie` — should include a session cookie (e.g., `session=...` or `auth_session=...`).

12. Log in with correct username but wrong password — confirm a generic error message (do not reveal which field is wrong).
13. Log in with a non-existent username — confirm the same generic error (no user enumeration).
14. **Edge case**: Log in with correct credentials but no JS (pure HTML form) — confirm the SSR form action works.
15. **Edge case**: Submit login with an empty password field — confirm rejection.

### Logout
16. Log in and then log out — confirm the session cookie is cleared.
    > **Console:** Before logout: `document.cookie` — note the session value. After logout: `document.cookie` — the session cookie should be absent or have an expired `Max-Age`.

17. After logout, try to access a protected page directly — confirm redirect to login.
18. After logout, try to call `PUT /api/profile` with the old session cookie — confirm `401`.
    > **Console (after logout):** `fetch('/api/profile', {method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'hacker'})}).then(r=>console.log(r.status))` — expect `401` because the session was invalidated server-side.

19. **Edge case**: Log out from Tab 1 — confirm Tab 2 (same user) is also invalidated on next request.
    > **Console (Tab 2, after Tab 1 logs out):** `fetch('/api/profile', {credentials:'include'}).then(r=>console.log(r.status))` — expect `401` or a redirect, not `200`.

### Profile Update
20. Update your display name to a new valid value — confirm the change persists after page reload.
21. Update your bio to a valid value — confirm it appears on your profile page.
22. Try to update your display name to an empty string — confirm rejection.
    > **Console:** `fetch('/api/profile', {method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:''})}).then(r=>console.log(r.status))` — expect `400`.

23. Try to update your display name to 100+ characters — confirm rejection with a length error.
    > **Console:** `fetch('/api/profile', {method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:'a'.repeat(101)})}).then(r=>r.json()).then(console.log)` — expect `400` with a validation error message.

24. Submit a profile update with no changes — confirm `200` (no error for unchanged data).
25. **Edge case**: Submit a profile update with an XSS payload in the bio (`<img src=x onerror=alert(1)>`).
    > **Console:** After saving and the bio renders in the UI: `document.querySelector('[class*="bio"]')?.innerHTML` — must show `&lt;img src=x onerror=alert(1)&gt;` (escaped), not a raw `<img>` tag. If `onerror` fired, it is a confirmed XSS.

### Avatar Upload
26. Upload a valid **JPG** avatar — confirm it is saved, displayed on profile, and replaces the old avatar.
27. Upload a valid **PNG** avatar — confirm same as above.
28. Upload a **PDF** file as an avatar — confirm rejection with a meaningful error (not a server crash).
    > **Console:** Network tab → the POST request to the upload endpoint should return `400` or `415`, not `200` or `500`.

29. Upload a file with a `.jpg` extension but actually a binary executable inside — confirm the server validates file content (MIME type check), not just extension.
    > **Console:** Network tab → the upload POST response should be `400`, not `200`.

30. Upload an image over the maximum allowed size (e.g., 10 MB if limit is 5 MB) — confirm rejection with a size error.
    > **Console:** Network tab → the upload POST response should be `413` (Payload Too Large) or `400`.

31. Upload an SVG file — confirm it is either accepted or rejected consistently (SVGs can contain scripts).
32. Upload a zero-byte file — confirm rejection.
33. **Edge case**: Disconnect the network mid-upload — confirm the server handles the incomplete multipart request gracefully.
    > **Console:** Network tab → after restoring the connection, the upload request should either show `cancelled` or an error status, not a silent hang. No 500 should appear in the server logs.

34. **Edge case**: Rapidly upload 5 avatars back-to-back — confirm old files are cleaned up and storage doesn't accumulate indefinitely.
35. If no avatar is uploaded, open the profile page — confirm a **default avatar** is displayed, not a broken image.
    > **Console:** `document.querySelectorAll('img[class*="avatar"]').forEach(img => { if (!img.complete || img.naturalWidth === 0) console.error('Broken avatar:', img.src) })` — no broken images logged.

36. Delete a custom avatar — confirm the profile reverts to the default avatar.

### Friends & Online Status (User Management perspective)
37. Add a friend — confirm they appear in your friends list with their online status.
38. When your friend logs in, confirm their status changes to online **immediately** (within 1-2 seconds) in your friends list without refreshing.
    > **Console:** WS Messages tab — `friend:online` packet with the friend's userId should appear within 2 seconds of their login.

39. When your friend closes all browser tabs, confirm their status changes to offline within ~5 seconds.
40. **Edge case**: Your friend's internet drops (socket disconnect) — confirm their status goes offline after the 5-second grace period, not immediately (to avoid flicker on page refresh).
    > **Console:** WS Messages tab — after the friend's network drops, you should see `friend:offline` arrive 5–7 seconds later (not instantly).

41. **Edge case**: You go offline while viewing a friend's profile — confirm no console errors and no frozen online indicator.
    > **Console:** Toggle Network → Offline while on a friend's profile. Watch the Console tab — no uncaught errors should appear.

---

## 9. User Management — Minor: Game Statistics & Match History

1. Play and finish a game against the AI — confirm the game appears in your match history.
2. Play an online game — confirm it appears in **both** players' match histories with the correct opponent name.
3. Confirm the match history shows: opponent name, your score, opponent score, game mode, speed preset, date.
4. Filter match history by **Wins only** — confirm only won games are shown.
5. Filter match history by **Losses only** — confirm only lost games are shown.
6. Filter match history by **mode** (local/online/computer) — confirm results are filtered.
7. Load more history (pagination) — confirm older games load without re-fetching already-shown games.
   > **Console:** `fetch('/api/matches?limit=10', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('count:', d.matches?.length, 'hasMore:', d.hasMore))` — first page should show 10 and `hasMore: true` if there are more than 10 games.

8. **Edge case**: View match history for a user who has never played — confirm an empty state is shown, not an error.
   > **Console:** Network tab → the matches API call should return `200` with an empty array, not `404` or `500`.

9. **Edge case**: An opponent has since changed their username — confirm the stored `player2_name` (denormalized) still shows the correct name from when the game was played.
10. **Edge case**: An opponent has deleted their account — confirm their match still appears (with their name shown or "Deleted User").

### Stats Summary
11. After winning a game, verify on the profile page that `wins` incremented by 1 and `games_played` incremented by 1.
    > **Console:** `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('wins:', d.wins, 'games:', d.games_played))` — run before and after the game to compare.

12. After losing a game, verify `losses` incremented by 1.
13. Win rate displayed: win 3 out of 4 games → confirm win rate shows **75%**.
14. Win rate with 0 games played → confirm it shows 0% or N/A, not a divide-by-zero error.
    > **Console:** For a fresh account: `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('winRate:', d.winRate))` — should be `0` or `null`, not `NaN` or `Infinity`.

15. Confirm the current win streak resets after a loss.
16. Confirm the best win streak never decreases (persists even after losses).

### Achievements Display
17. Unlock an achievement — confirm it appears with name, description, tier, and unlock date.
18. View the achievements page with 0 achievements — confirm a proper empty state.
19. View achievements of another user via their profile — confirm only unlocked achievements are visible.

### Leaderboard
20. Confirm the global leaderboard shows the top 50 users sorted by wins.
21. Confirm users with 0 games played are **not** shown on the leaderboard.
22. Confirm the Friends leaderboard only shows yourself + accepted friends.
23. Confirm your own rank is highlighted or visible even if you are outside the top 50.
24. **Edge case**: Two users have the same number of wins — confirm they are consistently ordered (e.g., by games_played as tiebreaker).

---

## 10. User Management — Minor: OAuth 2.0 Remote Authentication

1. Click "Sign in with [Provider]" on the login page — confirm you are redirected to the OAuth provider's authorization page.
2. Authorize the app on the provider's page — confirm you are redirected back and logged in.
   > **Console:** After redirect: `document.cookie` — session cookie should be present.

3. Confirm a user account is created with the provider's name/email.
4. Log out and sign in again with the same OAuth account — confirm you are logged into the same existing account (not a duplicate).
5. Try to change the **password** while logged in via OAuth — confirm it is rejected (OAuth users have no password).
   > **Console:** `fetch('/api/settings/password', {method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({currentPassword:'', newPassword:'test1234'})}).then(r=>console.log(r.status))` — expect `400` or `403`.

6. Try to change the **email** while logged in via OAuth — confirm it is rejected.
7. **Edge case**: OAuth provider returns an email that is already registered natively — confirm the app links the accounts or shows a clear conflict message, not a silent duplicate user.
8. **Edge case**: Deny the OAuth authorization (click "Cancel" on provider page) — confirm you are redirected back to login with a clear message, not a crash.
   > **Console:** After redirect back to login: Console tab should show no uncaught errors.

9. **Edge case**: OAuth provider returns an invalid/expired `code` — confirm graceful error handling.
   > **Console:** Manually navigate to `/auth/callback?code=INVALID&state=INVALID` — expect a redirect to an error page or login, not a raw 500.

10. **Edge case**: OAuth callback is hit without a prior auth flow (no `state` param) — confirm CSRF protection rejects it.
    > **Console:** Navigate to `/auth/callback` with no query params — Network tab should show `400` or `403`, not `200`.

---

## 11. AI — Major: AI Opponent

### Basic Functionality
1. Start a game vs. **Homer (Easy)** — confirm the AI paddle moves in response to the ball.
2. Start a game vs. **Bart (Medium)** — confirm the AI is noticeably more accurate than Homer.
3. Start a game vs. **Lisa (Hard)** — confirm the AI is noticeably harder to beat than Bart.
4. Play a full game against any AI difficulty — confirm the game ends and results are saved.
5. Confirm the AI does **not** play perfectly (it should miss the ball occasionally, especially Homer).

### Human-Like Behavior
6. Watch Homer play a full game: confirm the paddle has delayed reactions and frequently misses.
7. Watch Lisa play: confirm quick reactions but still occasional mistakes (reaction delay = 8 frames, error range = 37px).
8. Confirm the AI does not teleport — its movement should be bounded by `maxSpeed`.
9. **Edge case**: Start a game with power-ups enabled and the AI opponent — confirm the AI still functions when `reverseControls` or `freeze` are active on it (does not crash).
   > **Console:** Watch the Console tab while a power-up is active on the AI — no uncaught errors or `undefined` references should appear.

10. **Edge case**: Start a game with a non-standard win score (e.g., 11) against AI — confirm the AI plays to the correct target score.
11. **Edge case**: Start a game at `fast` speed preset — confirm the AI still attempts to intercept the ball (reacts correctly at higher speeds).
12. **Edge case**: Pause or slow down via browser inspector — confirm the AI frame counter does not cause it to get stuck.

### Game Saving & Stats
13. Win a game against the AI — confirm a game record is saved with mode `computer` and opponent name matching the difficulty.
    > **Console:** After the game: `fetch('/api/matches?limit=1', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.matches[0]))` — `gameMode` should be `'computer'` and opponent name should match the AI difficulty.

14. Lose a game against the AI — confirm losses count correctly in your stats.
15. Confirm AI games contribute to XP and achievements (win streak, shutout, etc.).

---

## 12. Gaming — Major: Complete Web-Based Game (Pong)

### Rules & Win Conditions
1. Start a local game — confirm both paddles move (W/S for player 1, arrow keys for player 2).
2. Let the ball pass one paddle — confirm the opposite player's score increments.
3. Play until one player reaches the win score — confirm the game ends and a winner is declared.
4. Confirm the ball bounces off the top and bottom walls.
5. Confirm the ball changes angle based on where it hits the paddle (edge hits = more angle).
6. Confirm ball spin: hit the ball while moving the paddle — confirm the ball curves slightly.

### Physics Edge Cases
7. **Edge case**: Move the paddle to the very top or bottom boundary — confirm it does not go off-screen.
8. **Edge case**: The ball moving very fast (`fast` preset) — confirm it does not pass through the paddle without registering a hit (no tunneling).
9. **Edge case**: Ball hits the corner where a wall meets a paddle — confirm no physics glitch or freeze.
   > **Console:** Watch the Console tab during the collision — no `NaN` or `Infinity` values should appear in any logged game state.

10. **Edge case**: Two key presses at the same time (up and down) — confirm they cancel out or the paddle is stationary.

### Canvas & Visual
11. Confirm the canvas renders at 900×560 inside the browser viewport without clipping.
    > **Console:** `const c = document.querySelector('canvas'); console.log(c.width, c.height)` — should log `900 560`.

12. Confirm the score is visible and updates in real time.
13. Confirm effects (if enabled) do not drop the frame rate below 30 FPS on a normal laptop.
    > **Console:** Run this while the game is active:
    > ```javascript
    > let f = 0, t = performance.now();
    > const tid = setInterval(() => {
    >   console.log('FPS:', Math.round(f * 1000 / (performance.now() - t)));
    >   f = 0; t = performance.now();
    > }, 1000);
    > const loop = () => { f++; requestAnimationFrame(loop); };
    > requestAnimationFrame(loop);
    > // Stop with: clearInterval(tid)
    > ```
    > FPS should stay above 30 with effects on.

14. **Edge case**: Resize the browser mid-game — confirm the canvas re-scales or at minimum does not break.
    > **Console:** After resizing: `document.querySelector('canvas')` — confirm it still exists and has valid `width`/`height` attributes.

15. **Edge case**: Switch browser tab mid-game — confirm the game pauses or at minimum does not desync when you return.
    > **Console:** After switching back, check the Console tab for any `NaN` position errors or "game out of sync" warnings.

---

## 13. Gaming — Major: Remote Players

### Matchmaking
1. Two users join the **Quick Play** queue simultaneously — confirm they are matched within 10 seconds.
   > **Console (both browsers):** WS Messages tab — watch for `matchmaking:found` or `game:start` packet arriving on both sides.

2. Only one user is in the queue — confirm they are **not** matched with themselves.
3. A user leaves the queue before being matched — confirm the queue is cleaned up and they are not paired with the next joiner.
4. **Edge case**: The same user joins the queue from two browser tabs — confirm they are not matched against themselves.
5. **Edge case**: User A is in the queue and User B who is blocked by User A joins — confirm they are not matched (if block-based matchmaking is implemented, otherwise note the limitation).

### Remote Gameplay
6. Both players are matched — confirm both see a game start screen.
7. Player 1 moves their paddle — confirm Player 2 sees it move in real time.
   > **Console (Player 2):** WS Messages tab — `game:state` packets should arrive at ~60/s. Each packet's `paddle1Y` value should change as Player 1 moves.

8. Score updates — confirm both clients show the same score simultaneously.
   > **Console (both browsers):** In the WS Messages tab, find consecutive `game:state` packets and compare the `score` field — both sides should show identical values within the same packet.

9. Ball position — confirm both clients are in approximate sync (within one or two frames' difference).
   > **Console:** Compare `game:state` packet timestamps in the WS tab on both browsers. The `ballX`/`ballY` values for the same packet index should be identical (server-authoritative).

10. One player wins — confirm both clients see the game-over screen with the correct result.
    > **Console (both browsers):** WS Messages tab — `game:over` packet should arrive on both sides with `winnerId` and final scores.

### Disconnection & Reconnection
11. Player 1 closes the browser tab mid-game — confirm Player 2 sees a "opponent disconnected" message.
    > **Console (Player 2):** WS Messages tab — `game:player-disconnected` packet should arrive within 1 second of Player 1's disconnect.

12. After the 15-second reconnection window, confirm Player 2 is declared the winner automatically.
    > **Console (Player 2):** After 15 seconds, WS Messages tab — `game:over` packet arrives with `winnerId = Player 2`.

13. Player 1 closes the tab and reopens it within 15 seconds — confirm they can reconnect to the same game.
    > **Console (Player 1 on reopen):** WS Messages tab — `game:player-reconnected` packet, followed by `game:state` packets resuming.

14. **Edge case**: Both players disconnect simultaneously — confirm the game is cancelled cleanly and no orphaned room remains.
15. **Edge case**: Player reconnects on a different device/browser session — confirm they are re-entered into the correct game room.
16. **Edge case**: High latency simulation (DevTools → Network throttling to "Slow 3G") — confirm the game is playable (paddle input still registers), possibly with visible lag but no crash.
    > **Console:** While throttled, watch the Console tab for any `socket timeout` or `connection lost` errors. Input should still be accepted; `game:input` packets should still appear in the WS tab, just delayed.

### Results
17. After a remote game ends, confirm the result is saved with `mode: 'online'` and both player IDs.
    > **Console:** `fetch('/api/matches?limit=1', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.matches[0]))` — `gameMode` should be `'online'` and both player IDs should be present.

18. Confirm XP and stats update for both players after the game.
19. **Edge case**: Server restarts mid-game — confirm graceful handling (players see error, no corrupted game record).
    > **Console:** After server restart, WS Messages tab should show the socket reconnecting. The Console tab should show a user-facing error, not a stack trace.

---

## 14. Gaming — Major: Multiplayer 3+ Players (Tournament)

> **Note**: This project implements 3+ player support through **sequential tournament matches**, not simultaneous 3+ player Pong. The following tests verify that the tournament bracket correctly handles 3+ participants.

1. Create a tournament with **3 players** — confirm the bracket is generated with one first-round bye for the top seed.
2. Create a tournament with **4 players** — confirm a clean 2-round bracket (semifinals + final).
3. Create a tournament with **8 players** — confirm all first-round matches are generated correctly.
4. Create a tournament with **5 players** — confirm 3 first-round byes are given to the top seeds.
5. Confirm all 3+ registered participants receive a real-time bracket update when the tournament starts.
   > **Console (each participant's browser):** WS Messages tab — `tournament:started` packet should arrive on all participants' connections within 2 seconds of the creator starting.

6. Play a first-round match — confirm the winner advances to the correct second-round slot.
7. Play all matches until the final — confirm the tournament is marked `finished` with a winner.
8. Confirm the losing finalist and other eliminated players are marked `eliminated`.
9. **Edge case**: A tournament match player disconnects — confirm the 15-second forfeit applies and the tournament bracket advances correctly.
10. **Edge case**: Start a tournament with only 1 player registered — confirm it cannot be started.
    > **Console:** WS Messages tab — `tournament:error` packet with message "need at least 2 players" should arrive on the creator's socket.

11. **Edge case**: Join a tournament that has already started — confirm new joins are rejected.
    > **Console:** WS Messages tab — `tournament:error` packet with message "Tournament already started".

12. **Edge case**: The tournament creator leaves (deletes account) mid-tournament — confirm the tournament continues for remaining players.
13. **Edge case**: Two tournament games happen simultaneously (different brackets) — confirm server handles concurrent games without state mixing.
    > **Console (both games):** In each game's WS tab, confirm `game:state` packets only contain the ball/paddle state for that specific game room. No cross-contamination between rooms.

---

## 15. Gaming — Minor: Advanced Chat Features

### Blocking
1. Block User B from chat — confirm User B's messages no longer appear for User A.
2. Attempt to message a blocked user — confirm an appropriate error is shown to the sender.
   > **Console:** WS Messages tab — expect a `chat:error` packet, no `chat:sent` packet.

3. Unblock User B — confirm messages from User B can be received again.
4. **Edge case**: Block a user who is currently in a game with you — confirm in-game system messages still work but direct chat is blocked.
   > **Console:** WS Messages tab — `game:state` and `game:over` packets should still flow. A direct `chat:send` event should yield `chat:error`.

### Game Invites from Chat
5. From the chat with a friend, click "Invite to game" — confirm an invite message is sent.
6. The invited friend sees the invite — confirm they can click to join the game.
7. The invited friend accepts — confirm a game room is created with the correct settings.
   > **Console (both players):** WS Messages tab — `game:start` packet should arrive on both sides with matching `roomId`.

8. The invited friend declines or ignores — confirm the invite expires gracefully.
9. **Edge case**: Send a game invite to a friend who is already in a game — confirm appropriate handling (error or pending invite).
   > **Console:** WS Messages tab — expect `tournament:error` or a specific `game:error` packet, not a silent hang.

10. **Edge case**: Invite yourself to a game — confirm rejection.

### Chat History Persistence
11. Send messages, log out, log back in — confirm the chat history is still visible.
12. Open chat with a friend and scroll up — confirm older messages load via pagination.
    > **Console:** `fetch('/api/chat/FRIEND_ID?before=OLDEST_MESSAGE_ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('older messages:', d.messages?.length, 'hasMore:', d.hasMore))` — should return the next 50 older messages.

13. **Edge case**: A chat conversation with 200+ messages — confirm pagination loads them in batches of 50, not all at once.
    > **Console:** `fetch('/api/chat/FRIEND_ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('first batch:', d.messages?.length))` — should be exactly 50, not 200.

### Typing Indicators
14. User A starts typing — confirm User B sees a typing indicator within 1 second.
    > **Console (User B):** WS Messages tab — `chat:typing` packet from User A's ID should arrive within 1 second.

15. User A stops typing — confirm the typing indicator disappears within 3 seconds.
16. **Edge case**: User A types, sends the message, and stops — confirm the indicator disappears immediately after send, not after the 3-second timeout.
    > **Console (User B):** WS Messages tab — after the `chat:message` packet, there should be no `chat:typing` packet remaining active (or a `chat:stop-typing` packet should arrive).

17. **Edge case**: User A closes the chat panel while typing — confirm the typing indicator is cleared for User B.
    > **Console (User B):** WS Messages tab — a `chat:stop-typing` packet should arrive shortly after User A closes the panel.

### Read Receipts
18. User A sends a message to User B — confirm the message shows as unread until User B opens the chat.
19. User B opens the chat — confirm User A receives a read receipt event (if UI shows it).
    > **Console (User A):** WS Messages tab — `chat:read-receipt` packet should arrive after User B opens the conversation.

20. **Edge case**: User B has chat open but switches to a different conversation — confirm the read receipt is only sent for the conversation that is actually visible.
    > **Console (User A):** WS Messages tab — `chat:read-receipt` should NOT arrive while User B is viewing a different chat.

### User Profiles from Chat
21. Click on a username inside the chat panel — confirm it navigates to or shows that user's profile.

### Tournament Notifications in Chat
22. After a tournament match ends, confirm a system message appears in both players' chat with the result.
    > **Console:** `fetch('/api/chat/OPPONENT_ID?limit=5', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.messages.filter(m=>m.type==='system')))` — the most recent system message should contain the match result.

---

## 16. Gaming — Minor: Tournament System

### Creation & Setup
1. Create a tournament with a name, max players (2–16), speed preset, and win score — confirm it is saved and visible in the tournaments list.
   > **Console:** `fetch('/api/tournaments', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.tournaments[0]))` — the newly created tournament should appear first (sorted by `created_at desc`).

2. **Edge case**: Create a tournament with `max_players = 1` — confirm rejection.
   > **Console:** WS Messages tab — `tournament:error` packet with "Max players must be 4, 8, or 16".

3. **Edge case**: Create a tournament with `max_players = 17` — confirm rejection.
   > **Console:** Same as above.

4. **Edge case**: Create two tournaments with the same name — confirm it is allowed (names need not be unique) or blocked consistently.

### Registration
5. Join a tournament — confirm you appear in the participant list with the correct seed (join order).
   > **Console:** `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.participants.find(p=>p.userId===YOUR_ID)))` — your seed should match your join order (1st to join = seed 1).

6. Join a tournament that is already full — confirm rejection with a "tournament is full" message.
   > **Console:** WS Messages tab — `tournament:error` packet with "Tournament is full".

7. Join a tournament that has already started — confirm rejection.
   > **Console:** WS Messages tab — `tournament:error` packet with "Tournament already started".

8. **Edge case**: Try to join the same tournament twice — confirm rejection (no duplicate participants).
   > **Console:** WS Messages tab — `tournament:error` packet with "Already joined".

9. **Edge case**: Creator tries to join their own tournament — confirm allowed or blocked consistently.

### Bracket Generation & Seeding
10. Start a 4-player tournament — confirm seeding is: match 1→ seed 1 vs seed 4, match 2 → seed 2 vs seed 3.
    > **Console:** After starting: `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d.bracket[0].matches, null, 2)))` — inspect the first round's matchups.

11. Start a 6-player tournament — confirm the top 2 seeds receive byes and advance automatically.
12. Confirm the bracket is visible to all participants in real time when the tournament starts.
    > **Console (each participant):** WS Messages tab — `tournament:started` packet containing the full bracket should arrive on all participant connections.

### Match Play & Advancement
13. Play a tournament match — confirm the result updates the bracket (winner advances, loser is eliminated).
    > **Console:** After the match: `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.bracket))` — the played match should show `status: 'finished'` and `winnerId` set.

14. Confirm both players' tournament XP is updated after each match.
15. Play all rounds — confirm the final match correctly determines the tournament winner.
16. After the tournament finishes, confirm `status = 'finished'` and the winner is recorded.
    > **Console:** `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.tournament.status, d.tournament.winnerId))` — expect `'finished'` and the correct user ID.

17. **Edge case**: Attempt to play a match that is not yet scheduled (e.g., a future-round match) — confirm it cannot be started out of order.
18. **Edge case**: The player who should play a tournament match is offline — confirm the match can still be initiated (or held) and the forfeit timeout applies.

---

### Host / Creator Exit Scenarios

> The following cases are grounded in the actual code paths in `TournamentManager.ts` and `handlers/tournament.ts`.

#### Before the tournament starts (`status = 'scheduled'`)

19. **Host cancels the tournament** — Creator emits `tournament:cancel`. Confirm `cancelTournament` succeeds (only works when `status === 'scheduled'` and caller is `created_by`). Confirm the tournament row and all participant rows are deleted from the DB. Confirm ALL connected clients receive a `tournament:cancelled` broadcast (not just participants). Confirm any client currently viewing the tournament page is redirected/refreshed.
    > **Console (any connected browser):** WS Messages tab — a `tournament:cancelled` packet with the `tournamentId` should appear on ALL connected clients (it is a global `io.emit`). Verify by opening the WS tab in a browser that is NOT a participant — the packet should still arrive.
    > **Console (after cancel):** `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>console.log(r.status))` — expect `404`.

20. **Non-creator tries to cancel** — A regular participant emits `tournament:cancel`. Confirm `cancelTournament` returns `false` (creator check fails). Confirm the tournament is untouched in the DB. Confirm the socket returns `tournament:error` to the caller.
    > **Console (participant's browser):** WS Messages tab — `tournament:error` packet should arrive on the sender's socket only. No `tournament:cancelled` packet should appear on any other client.

21. **Host leaves as participant (but stays as creator)** — Creator emits `tournament:leave`. Confirm `leaveTournament` removes them from `tournament_participants` but the tournament row's `created_by` is unchanged. Confirm `tournament:player-left` is broadcast so other participants see the update. Confirm the tournament still appears in the list with the original creator listed.
    > **Console:** `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>{ console.log('isCreator:', d.isCreator); console.log('isParticipant:', d.isParticipant); console.log('createdBy:', d.tournament.createdBy); })` — `isCreator` should be `true` for the host, `isParticipant` should be `false` after leaving.

22. **No one else can start or cancel after host leaves as participant** — After the scenario above, a remaining participant emits `tournament:start` or `tournament:cancel`. Confirm both are rejected with `tournament:error` (only `created_by` can call these). Confirm the tournament is stuck in `scheduled` state — **this is a known limitation in the code**: no fallback host-transfer mechanism exists.
    > **Console (remaining participant):** WS Messages tab — `tournament:error` should arrive on their socket. No `tournament:started` or `tournament:cancelled` packet should appear anywhere.

23. **Host re-joins after leaving and then cancels** — After leaving as a participant, the creator emits `tournament:join` to re-enroll, then `tournament:cancel`. Confirm they can re-join (the participant row was deleted, so the duplicate check passes). Confirm they can then cancel successfully.
    > **Console:** After re-joining: `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('isParticipant:', d.isParticipant))` — should be `true`. After cancel: same endpoint should return `404`.

24. **Host leaves as the last participant** — All other participants have left; the host is the only participant and then also leaves via `tournament:leave`. Confirm the tournament still exists in the DB (only `cancelTournament` deletes it, not `leaveTournament`). Confirm other users can still see and join it.
    > **Console:** `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.tournament.status, d.participants.length))` — expect `'scheduled'` and `0` participants.

#### After the tournament starts (`status = 'in_progress'`)

25. **Host tries to cancel a running tournament** — Creator emits `tournament:cancel` while the tournament is `in_progress`. Confirm `cancelTournament` returns `false` (`status !== 'scheduled'` guard). Confirm the socket returns `tournament:error`. Confirm the tournament continues uninterrupted. **There is no cancel path for in-progress tournaments** — this is intentional per the code.
    > **Console (host):** WS Messages tab — `tournament:error` packet arrives on the host's socket. No `tournament:cancelled` packet appears on any other client. Tournament status stays `in_progress`: `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.tournament.status))`.

26. **Host (as participant) disconnects mid-match** — During an active game room, the host closes the browser. Confirm the GameRoom 15-second reconnection timeout fires. Confirm after 15 seconds `game:player-disconnected` is emitted. If no reconnect within 15 seconds, confirm `advanceWinner` is called with the opponent as winner and the host as loser. Confirm the bracket updates in DB and other participants receive `tournament:bracket-update`. Confirm the tournament continues normally with the host eliminated.
    > **Console (opponent's browser):** WS Messages tab — sequence should be: `game:player-disconnected` → (15s wait) → `game:over` → `tournament:advanced`. After 15 seconds: `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.participants.find(p=>p.userId===HOST_ID)?.status))` — should be `'eliminated'`.

27. **Host (as participant) reconnects within the 15-second window** — Host closes tab and reopens within 15 seconds. Confirm the game resumes from the saved state. Confirm no forfeit is issued. Confirm `tournament:bracket-update` is NOT emitted (no state change).
    > **Console (host on reopen):** WS Messages tab — `game:player-reconnected` packet should appear, followed by `game:state` packets resuming. No `game:over` or `tournament:advanced` should appear during the reconnect window.

28. **Host never navigates to their match (60-second join timeout)** — When the host's match is started via `startRoundMatches`, the host's socket never joins the room. Confirm after 60 seconds the timeout fires. Confirm `destroyRoom(roomId)` is called. Confirm `advanceWinner(tournamentId, round, matchIndex, opponentId, hostId, 1, 0)` is called with a 1-0 forfeit score. Confirm the host's participant `status` is set to `'eliminated'` in the DB. Confirm the opponent advances and receives `tournament:advanced`. Confirm the bracket persists to DB.
    > **Console (opponent's browser):** After 60 seconds, WS Messages tab — `tournament:advanced` packet should arrive with `winnerId = opponent` and scores `1-0`. `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>{ const host = d.participants.find(p=>p.userId===HOST_ID); console.log('host status:', host?.status, 'placement:', host?.placement) })` — should show `'eliminated'`.

29. **Both players in a match fail to join within 60 seconds (edge case — known limitation)** — Neither player (nor the host) joins the room after `startRoundMatches`. Confirm after 60 seconds `destroyRoom(roomId)` is called. **Confirm `advanceWinner` is NOT called** (the code only advances when exactly one player is absent). Confirm the match remains in `'playing'` status in the in-memory bracket. Confirm the tournament is now permanently stuck — no further matches start, no `tournament:finished` is ever emitted. This is a known limitation: there is no recovery path when both players are absent.
    > **Console (any participant's browser):** Watch the WS Messages tab for 90 seconds after the match room was created. You should see **no** `tournament:bracket-update`, **no** `tournament:advanced`, and **no** `tournament:finished` arrive. The tournament is silently frozen.
    > After 90s: `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('status:', d.tournament.status, 'bracket:', JSON.stringify(d.bracket)))` — status will be `'in_progress'` and the match will still show `status: 'playing'` in the bracket JSON. Note: `d.bracket` may be `null` if the bracket is only in the in-memory Map, not yet flushed; check `d.tournament.bracket_data` via Drizzle Studio instead.

30. **Server restart during an in-progress tournament** — Restart the Node process (or the Docker container) while a tournament is `in_progress`. Confirm the `activeTournaments` in-memory Map is wiped. Confirm the DB still shows `status = 'in_progress'`. Confirm the tournament detail page's `bracket` field returns `null` (since `getActiveTournament` returns `undefined` after restart). Confirm any participant emitting `tournament:status` receives `tournament:error: Tournament not active`. **There is no recovery path** — the tournament is permanently stuck in the DB as `in_progress` with no active state.
    > **Console (after restart):** `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>{ console.log('status:', d.tournament.status); console.log('bracket from memory:', d.bracket); })` — `status` will be `'in_progress'` but `bracket` will be `null` (the in-memory state is gone).
    > **Console:** In the WS Messages tab, emit `tournament:status` and watch for the `tournament:error` response: the packet `{"type":"tournament:error","data":{"message":"Tournament not active"}}` should arrive.

31. **Host is the tournament champion (wins the final)** — Play through the bracket until the host wins the final match. Confirm the tournament `status` is set to `'finished'` with `winner_id = host.id`. Confirm the host's participant record has `status = 'champion'` and `placement = 1`. Confirm `tournament:finished` is broadcast to all participants with the correct podium, champion wins count, and runner-up wins count.
    > **Console (all participants):** WS Messages tab — `tournament:finished` packet should arrive on all participants' sockets. Inspect it: `podium[0].userId` should equal the host's ID, `championWins` should match the number of rounds the host won.
    > `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>{ console.log('status:', d.tournament.status); console.log('winnerId:', d.tournament.winnerId); const host = d.participants.find(p=>p.userId===HOST_ID); console.log('host status:', host?.status, 'placement:', host?.placement); })` — expect `'finished'`, host ID, `'champion'`, `1`.

32. **Host is eliminated in an early round** — Host loses a match. Confirm the host receives `tournament:eliminated` with their placement, round name, and tournament wins count. Confirm `tournament:finished` is NOT emitted (tournament continues). Confirm the host can view the bracket as a spectator but cannot take any actions (their participant status is `'eliminated'`).
    > **Console (host's browser):** WS Messages tab — `tournament:eliminated` packet should arrive immediately after the game ends. Inspect it: `placement` should be a number greater than 1, `tournamentWins` should reflect how many matches they won before losing.
    > After elimination: `fetch('/api/tournaments/ID', {credentials:'include'}).then(r=>r.json()).then(d=>{ console.log('isParticipant:', d.isParticipant); const host = d.participants.find(p=>p.userId===HOST_ID); console.log('host status:', host?.status); })` — `isParticipant` is `true` (they're still in the list) and `status` is `'eliminated'`.

---

## 17. Gaming — Minor: Game Customization

### Speed Presets
1. Start a game with **chill** preset — confirm ball moves noticeably slower than default.
2. Start a game with **normal** preset — confirm ball speed is the standard.
3. Start a game with **fast** preset — confirm ball moves noticeably faster.
4. **Edge case**: Change speed mid-game (if the option exists) — confirm it applies immediately without desync.

### Win Score
5. Set win score to **3** — confirm the game ends as soon as any player reaches 3 points.
6. Set win score to **11** — confirm the game does not end until 11 points are reached.
7. **Edge case**: Win score of 1 — confirm the first scored point ends the game.

### Power-Ups
8. Enable power-ups — confirm power-up items appear on the canvas during gameplay.
9. Collect a `bigPaddle` power-up — confirm your paddle visually grows and the HUD shows the active effect timer.
10. Collect a `speedBall` power-up — confirm the ball visibly accelerates.
11. Collect a `reverseControls` power-up — confirm the opponent's up/down controls are inverted.
12. Collect a `freeze` power-up — confirm the opponent's paddle is immobilized temporarily.
13. Collect an `invisibleBall` power-up — confirm the ball disappears from the opponent's canvas.
14. Wait for a power-up effect to expire — confirm it ends at the correct time and the HUD bar empties fully.
15. Disable power-ups — confirm no power-up items appear on the canvas.
16. **Edge case**: Two power-ups spawn very close together — confirm both are collectible separately.
17. **Edge case**: Pick up a power-up during an existing active effect of the same type — confirm the timer resets or stacks, consistently.
    > **Console:** Watch the Console tab while collecting the same power-up twice — no `undefined` or `NaN` in any logged timer value.

### Themes & Visual
18. Select a different canvas theme — confirm the visual style changes and the change persists on next login.
19. Select a ball skin — confirm the ball visually changes.
20. Set effects to **none** — confirm no visual effects are rendered (check canvas for particles/trails).
21. Set effects to **spectacle** — confirm visual effects are present.
22. **Edge case**: All customization settings save across logout/login — confirm `game_preferences` JSON is persisted.
    > **Console:** After saving settings and logging back in: `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('game_preferences:', d.game_preferences))` — the stored JSON should reflect the saved values.

### Sound
23. Set volume to 0 — confirm no game sounds are audible.
24. Set volume to 100 — confirm sounds are audible.
25. Toggle mute — confirm sound is silenced.
26. **Edge case**: Sound setting persists after page reload.
    > **Console:** `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('sound prefs:', d.game_preferences?.sound))` — should reflect the saved volume/mute values after reload.

---

## 18. Gaming — Minor: Gamification System

### XP & Leveling
1. Win a game at `normal` speed — confirm XP is awarded (base formula: `5 × (score + 1) × 1.0 + win bonus + result XP`).
   > **Console:** Before the game: `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('XP before:', d.current_xp))`. After the game: run the same command and verify the delta matches the formula.

2. Win a game at `fast` speed — confirm XP is higher than the same result at `normal` speed (multiplier 1.4).
3. Win a game at `chill` speed — confirm XP is lower than `normal` (multiplier 0.6).
4. Lose a game — confirm 5 XP is awarded (result XP for loss) and no win bonus is applied.
   > **Console:** XP delta after a loss should be exactly 5 (loss result XP only).

5. Win by a shutout (opponent scores 0) — confirm an extra +20 XP bonus is applied.
6. Win after coming from behind (trailed by 2+ points) — confirm an extra +15 XP comeback bonus.
7. Win a game where the score was tied at `winScore - 1` (deuce) — confirm an extra +10 XP deuce bonus.
8. Win 3 consecutive games — confirm the win streak bonus compounds (`50 × (streak + 1)`).
9. **Edge case**: Win streak of 7 — confirm the bonus is `50 × 8 = 400 XP`, not capped at a lower value.
   > **Console:** `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('streak:', d.current_win_streak, 'best:', d.best_win_streak))` — streak should be 7.

10. Accumulate enough XP to level up — confirm the level increments by 1 and a level-up notification is shown.
    > **Console:** `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('level:', d.current_level, 'xp:', d.current_xp, 'xp_to_next:', d.xp_to_next_level))` — run before and after leveling up to confirm the transition.

11. **Edge case**: Level up multiple levels in one match (large XP jump) — confirm the level is correct, not capped at +1.
    > **Console:** After the match, the same profile fetch should show the correct level, not just `old_level + 1`.

12. Confirm `xp_to_next_level` is correctly displayed on the profile page.
    > **Console:** `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('xp_to_next_level:', d.xp_to_next_level))` — compare with the formula: `50 × N × (N+1)` where N is `current_level + 1`.

### Achievements
13. Win 10 games — confirm the "10 matches" achievement unlocks and a notification is shown.
    > **Console:** After the 10th win, WS Messages tab — `game:progression` packet should contain the newly unlocked achievement ID.

14. Win a game with the opponent scoring 0 — confirm the "shutout" (bronze tier) achievement unlocks.
15. Win 10 shutout games — confirm the "shutout" silver tier unlocks.
16. Build a 3-game win streak — confirm the streak bronze achievement unlocks.
17. Unlock an achievement — confirm it appears on the achievements page with the correct unlock date and tier.
18. View an achievement that is not yet unlocked — confirm it is either hidden or shown as locked (consistent behavior).
19. **Edge case**: Trigger the same achievement condition twice — confirm the achievement is only awarded once (no duplicate rows).
    > **Console:** `fetch('/api/achievements', {credentials:'include'}).then(r=>r.json()).then(d=>{ const ids = d.map(a=>a.achievement_id); const dupes = ids.filter((id,i)=>ids.indexOf(id)!==i); console.log('duplicate achievement IDs:', dupes) })` — should log an empty array.

20. **Edge case**: Play a game where multiple achievement thresholds are crossed simultaneously (e.g., 50th game + 50th win) — confirm all relevant achievements unlock at once.
    > **Console:** WS Messages tab — the `game:progression` packet after the game should contain an array of multiple newly unlocked achievement IDs.

### Leaderboard
21. Confirm the global leaderboard updates after a game is played (within one page refresh).
22. Play 1 game as a new user — confirm you now appear on the leaderboard (min 1 game filter).
    > **Console:** `fetch('/api/leaderboard', {credentials:'include'}).then(r=>r.json()).then(d=>console.log(d.find(u=>u.userId===YOUR_ID)))` — your entry should appear after your first game.

23. **Edge case**: A user deletes their account — confirm they are removed from the leaderboard.
24. **Edge case**: Check the leaderboard with a fresh account (0 games) — confirm you do not appear and no error occurs.
    > **Console:** `fetch('/api/leaderboard', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('I appear:', !!d.find(u=>u.userId===YOUR_ID)))` — should log `false` for a new account with 0 games.

### Visual Feedback
25. After a game, confirm the game-over screen shows the XP earned in this match.
    > **Console:** WS Messages tab — the `game:progression` packet should contain an `xpEarned` field. Compare it with what the game-over screen displays.

26. Confirm the progression bar on the profile page accurately reflects `current_xp / xp_to_next_level`.
    > **Console:** `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>{ const pct = d.current_xp / d.xp_to_next_level * 100; console.log('Expected bar %:', pct.toFixed(1)) })` — compare with the visual bar width.

27. **Edge case**: Check the profile of a level 0 user (0 XP) — confirm the bar shows 0%, not a negative or NaN value.
    > **Console:** For a fresh account: `fetch('/api/profile', {credentials:'include'}).then(r=>r.json()).then(d=>console.log('xp:', d.current_xp, 'xp_to_next:', d.xp_to_next_level))` — `current_xp` should be `0` and `xp_to_next_level` should be a positive number (not `0` or `null`).

28. Confirm achievement unlock notifications do not stack infinitely (older ones dismiss before new ones pile up).
    > **Console:** Rapidly unlock 3+ achievements in quick succession. Watch the Console tab for any `setTimeout` or animation errors. The toast queue should display one at a time and clear.
