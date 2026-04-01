# In-Chat Notification Procedure Review

## Overview
The application uses Socket.IO to deliver real-time chat notifications. Messages are persisted to the database and broadcast to recipient's connected tabs.

---

## Architecture

### 1. **Message Flow**
```
Client sends chat:send 
    ↓
Server validates & saves to DB (messages table)
    ↓
Recipient's socket receives chat:message event
    ↓
Toast notification (if chat panel closed)
    ↓
Message added to conversations store
```

---

## Components

### **Server-Side Handlers**

#### [Chat Handler](src/lib/server/socket/handlers/chat.ts)

**Event: `chat:send`**
- **Validation:**
  - Content not empty, max 500 chars
  - Sender ≠ recipient (self-check)
  - Block check (always enforced, even for in-game chat)
  - Friend check (skipped if `gameId` provided for in-game chat)

- **Delivery:**
  - Saves to DB (messages table)
  - Broadcasts to **all recipient tabs** via `userSockets` map
  - Confirms to sender via `chat:sent`

**Event: `chat:read`**
- Marks sender's messages as read
- Sends `chat:read-receipt` to sender (marks message as delivered)

**Event: `chat:typing`**
- Real-time typing indicator broadcast to recipient

**Event: `chat:stop-typing`**
- Stops typing indicator

---

### **Client-Side Handlers**

#### [Layout Socket Listeners](src/routes/+layout.svelte) (lines 35-175)

**Event: `chat:message`**
```typescript
socket.on('chat:message', (msg: any) => {
    receiveMessage(msg);
    
    // Suppress toast during online games (for opponent only)
    const onGamePage = $page.url.pathname.startsWith('/play/online/');
    if (onGamePage && currentOpponentId && msg.senderId === currentOpponentId) return;
    
    // Show toast if chat panel not open to this sender
    if (!isChatOpen() || getActiveFriendId() !== msg.senderId) {
        toast.chat(`${msg.senderUsername}`, msg.content.slice(0, 50), 
            () => openChat(msg.senderId));
    }
});
```

**Notification Logic:**
- ✅ Suppresses duplicate notifications during in-game chat (only for opponent)
- ✅ Shows toast with sender's username + message preview (50 chars)
- ✅ Toast is clickable (opens chat)
- ✅ No toast if chat already open to that sender

---

## Notification Preferences

#### [Notification Settings API](src/routes/api/settings/notifications/+server.ts)

3 user-controlled preferences:
- `friendRequests` - Friend request notifications
- `gameInvites` - Game challenge notifications
- `matchResults` - Match outcome notifications

**⚠️ ISSUE #1: Chat notifications NOT user-controllable**
- No `chatMessages` preference exists
- In-chat notifications are always sent (cannot disable)
- Should add toggle for message notifications

---

## Database Persistence

#### [Messages Table](src/db/schema/messages.ts)
```
id (PK)
sender_id (FK → users)
recipient_id (FK → users)
game_id (FK → games, nullable)
type: 'chat' | 'system'
content (max 500 chars)
is_read (boolean)
read_at (nullable timestamp)
created_at (default now)
```

**Coverage:**
- ✅ Sender, recipient, game context tracked
- ✅ Read status persisted
- ✅ Timestamps recorded

---

## Multi-Tab Synchronization

### User Sockets Map
```
userSockets: Map<userId, Set<socketIds>>
```

**Behavior:**
- Each tab gets a unique `socketId`
- All tabs receive the same notification
- Message sent on ANY tab triggers `chat:sent` on THAT tab
- Good for: multi-tab consistency
- Potential issue: Duplicate read receipts if user reads on multiple tabs

**Example:**
```
User opens 2 tabs
Tab 1: Receives chat:message
Tab 2: Receives chat:message
Tab 1: Sends chat:read → Both tabs get notified (via socket emit)
Tab 2: Also sends chat:read → Redundant DB update
```

---

## Known Issues

### **Issue #1: No Preference Control for Chat Notifications**
**Severity:** Medium
**Description:** Users cannot disable chat message notifications, unlike friend requests or game invites.
**Fix:** Add `chatMessages` to `notification_prefs` in users table

### **Issue #2: Redundant Read Receipts in Multi-Tab Scenarios**
**Severity:** Low
**Description:** If user reads messages on multiple tabs simultaneously, redundant `chat:read` events fire, causing unnecessary DB updates.
**Fix:** Client-side deduplication or debounce within 500ms

### **Issue #3: Toast Suppression During In-Game Chat**
**Severity:** Low
**Description:** Toast is suppressed for opponent during online games, but only by checking `currentOpponentId`. If opponent changes mid-session (unlikely but possible), logic breaks.
**Fix:** Use `roomId` from game context instead of `currentOpponentId`

### **Issue #4: Message Content Length Not Validated Client-Side**
**Severity:** Low
**Description:** Client can send messages > 500 chars; server silently rejects without error feedback to user.
**Fix:** Add client-side validation with visual feedback

### **Issue #5: In-Game Chat Allows Non-Friends to Message**
**Severity:** High (Permission Issue)
**Description:** When `gameId` is provided, friend check is skipped. Any matched opponent can send messages.
**Fix:** Require opponent relationship OR explicit game participation validation

---

## Recommended Improvements

### Priority 1 (Security/Permission)
- [x] Issue #5: Validate game ownership before allowing in-game chat

### Priority 2 (UX/Control)
- Add `chatMessages` to notification preferences
- Client-side message length validation (visual feedback)
- Clearer error messages for blocked/permission failures

### Priority 3 (Performance)
- Debounce `chat:read` events (500ms) to prevent redundant DB updates
- Add index on `(recipient_id, is_read)` for read status queries

### Priority 4 (Reliability)
- Use `roomId` instead of `currentOpponentId` for in-game toast suppression
- Add logging for message delivery failures (for debugging)

---

## Testing Recommendations

- [ ] Test toast suppression with multiple in-game tabs
- [ ] Test read receipt with simultaneous multi-tab reads
- [ ] Verify non-friends cannot send messages without gameId
- [ ] Verify blocked users cannot send messages (even in-game)
- [ ] Test notification preference changes take effect immediately

---

## Summary

**Current State:** Chat notifications work reliably for most cases.

**Blockers:** None critical to deployment.

**Improvements Needed:**
1. Add user preference for chat notifications
2. Fix in-game chat permission validation
3. Add client-side validation for message length
