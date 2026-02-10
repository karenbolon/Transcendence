# 🔐 Authentication & Authorization Architecture Guide

**Project:** ft_transcendence  
**Date:** February 2, 2026  
**Stack:** SvelteKit + Lucia Auth + PostgreSQL + Drizzle ORM

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication vs Authorization](#authentication-vs-authorization)
3. [Flow Diagrams](#flow-diagrams)
4. [Database Schema Design](#database-schema-design)
5. [Frontend to Backend Flow](#frontend-to-backend-flow)
6. [Security Considerations](#security-considerations)
7. [Common Pitfalls & Misunderstandings](#common-pitfalls--misunderstandings)
8. [Testing Strategy](#testing-strategy)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Current Stack Analysis

```
Frontend (Client)
    ↓
SvelteKit Server (hooks.server.ts)
    ↓
Lucia Auth (Session Management)
    ↓
Drizzle ORM
    ↓
PostgreSQL Database
```

### Key Components in Your Project

- **Lucia Auth**: Session-based authentication library
- **Drizzle ORM**: Type-safe database operations
- **SvelteKit Hooks**: Server-side request interception
- **PostgreSQL**: Database for users, sessions, and application data

---

## Authentication vs Authorization

### 🔑 Authentication (AuthN)
**"Who are you?"**

- **Purpose**: Verify user identity
- **Process**: Login, session creation, token validation
- **Result**: User is identified or rejected
- **Example**: User enters username/password → System verifies → Creates session

### 🛡️ Authorization (AuthZ)
**"What can you do?"**

- **Purpose**: Control access to resources
- **Process**: Check permissions, roles, ownership
- **Result**: Action allowed or denied
- **Example**: Can this user edit this profile? Delete this message? Join this tournament?

### Key Difference

```typescript
// Authentication: Are you logged in?
if (!user) {
    return redirect('/login');
}

// Authorization: Can you access this resource?
if (user.id !== profile.userId && user.role !== 'admin') {
    return error(403, 'Forbidden');
}
```

---

## Flow Diagrams

### 1. Registration Flow

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ POST /register
       │ { username, email, password }
       ↓
┌─────────────────────────────────────┐
│   SvelteKit Server Action           │
│   routes/(api)/(auth)/register/     │
└──────┬──────────────────────────────┘
       │
       ├─→ [1] Validate Input
       │      - Email format
       │      - Password strength
       │      - Username uniqueness
       │
       ├─→ [2] Hash Password
       │      - Argon2id hashing
       │      - Salt automatically included
       │
       ├─→ [3] Create User Record
       │      - Insert into `users` table
       │      - Generate unique ID
       │
       ├─→ [4] Create Session
       │      - Generate session token
       │      - Insert into `sessions` table
       │      - Link to user ID
       │
       └─→ [5] Set Cookie
              - HttpOnly cookie
              - Secure flag (HTTPS only)
              - SameSite=Lax
              ↓
       ┌──────────────┐
       │   Database   │
       │  PostgreSQL  │
       └──────────────┘
```

### 2. Login Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ POST /login
       │ { email, password }
       ↓
┌─────────────────────────────────────┐
│   SvelteKit Server Action           │
└──────┬──────────────────────────────┘
       │
       ├─→ [1] Find User by Email
       │      SELECT * FROM users WHERE email = ?
       │
       ├─→ [2] Verify Password
       │      - Retrieve hashed password
       │      - Compare with Argon2id.verify()
       │
       ├─→ [3] Create New Session
       │      - Generate session token
       │      - Set expiration (30 days default)
       │      - Store in `sessions` table
       │
       ├─→ [4] Invalidate Old Sessions (Optional)
       │      - Delete old sessions for user
       │      - Security: limit concurrent sessions
       │
       └─→ [5] Set Session Cookie
              - Send to browser
              ↓
       User is now authenticated ✓
```

### 3. Authenticated Request Flow

```
┌─────────────┐
│   Browser   │  Every request includes session cookie
└──────┬──────┘
       │ GET /dashboard
       │ Cookie: session=abc123...
       ↓
┌─────────────────────────────────────┐
│   hooks.server.ts                   │
│   (Runs before every request)       │
└──────┬──────────────────────────────┘
       │
       ├─→ [1] Extract Session Cookie
       │      - Read from request.cookies
       │
       ├─→ [2] Validate Session
       │      - Query sessions table
       │      - Check expiration
       │      - Check if user exists
       │
       ├─→ [3] Load User Data
       │      - JOIN users ON sessions.user_id
       │      - Attach to locals
       │
       └─→ [4] Attach to Request Context
              - event.locals.user
              - event.locals.session
              ↓
┌─────────────────────────────────────┐
│   Page/API Route Handler            │
│   Can access: locals.user           │
└─────────────────────────────────────┘
```

### 4. Authorization Check Flow

```
┌─────────────────────────────────────┐
│   Protected Route/Action            │
└──────┬──────────────────────────────┘
       │
       ├─→ [1] Authentication Check
       │      if (!locals.user) → redirect to /login
       │
       ├─→ [2] Authorization Check
       │      - Resource ownership?
       │      - Role permissions?
       │      - Feature flags?
       │
       ├─→ [3] Business Logic
       │      if (authorized) {
       │          // Execute action
       │      } else {
       │          // Return 403 Forbidden
       │      }
       │
       └─→ [4] Response
              - Success with data
              - Error with status code
```

---

## Database Schema Design

### Why Schema Design is Critical

1. **Security**: Poor schema = data leaks, unauthorized access
2. **Performance**: Proper indexes = fast queries
3. **Integrity**: Constraints prevent invalid data
4. **Scalability**: Good design = easier to extend

### Core Tables for Auth

#### 1. `users` Table

```typescript
// src/db/schema/users.ts
{
  id: string (UUID/ULID)           // Primary key, unique identifier
  username: string                  // Unique, indexed
  email: string                     // Unique, indexed
  emailVerified: boolean            // Email confirmation status
  hashedPassword: string            // Argon2id hash
  displayName: string               // Public display name
  avatarUrl: string?                // Profile picture
  role: enum ('user', 'admin')      // Authorization level
  status: enum ('active', 'banned') // Account status
  createdAt: timestamp              // Registration date
  updatedAt: timestamp              // Last modification
}
```

**Critical Design Decisions:**

- **UUID vs ULID vs Auto-increment**:
  - ✅ UUID/ULID: Non-sequential, secure, distributed-friendly
  - ❌ Auto-increment: Exposes user count, predictable
  
- **Username vs Email for Login**:
  - Email: Better for password recovery
  - Username: Better for privacy
  - Both: Best flexibility (your current approach ✓)

- **Password Storage**:
  - ❌ NEVER store plain text
  - ❌ NEVER use MD5/SHA1
  - ✅ ALWAYS use Argon2id/bcrypt/scrypt
  - ✅ Let Lucia/library handle it

#### 2. `sessions` Table

```typescript
// src/db/schema/sessions.ts
{
  id: string                    // Session token (primary key)
  userId: string                // Foreign key → users.id
  expiresAt: timestamp          // Session expiration
  createdAt: timestamp          // Session creation
  ipAddress: string?            // Security tracking
  userAgent: string?            // Device tracking
}
```

**Critical Design Decisions:**

- **Session Storage: Database vs Redis vs JWT**:
  ```
  Database (Your approach ✓):
  ✅ Instant revocation
  ✅ Easy to query "all user sessions"
  ✅ No secrets to leak
  ❌ Requires DB query per request
  
  Redis:
  ✅ Very fast
  ✅ Built-in expiration
  ❌ Additional infrastructure
  
  JWT (Stateless):
  ✅ No database needed
  ❌ Cannot revoke before expiry
  ❌ Token bloat with permissions
  ```

- **Session Expiration Strategy**:
  ```typescript
  // Sliding window (recommended for UX)
  expiresAt: now + 30 days
  // On each request, extend by 30 days
  
  // Fixed expiration
  expiresAt: now + 30 days
  // Never extends, user must re-login
  ```

#### 3. Foreign Key Relationships

```sql
-- Sessions reference users
ALTER TABLE sessions
ADD CONSTRAINT fk_sessions_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;  -- Delete sessions when user deleted

-- Games reference users
ALTER TABLE games
ADD CONSTRAINT fk_games_winner
FOREIGN KEY (winner_id) REFERENCES users(id)
ON DELETE SET NULL;  -- Keep game record, clear winner

-- Messages reference users
ALTER TABLE messages
ADD CONSTRAINT fk_messages_sender
FOREIGN KEY (sender_id) REFERENCES users(id)
ON DELETE CASCADE;  -- Delete messages when user deleted
```

**Why Foreign Keys Matter:**

1. **Data Integrity**: Prevent orphaned records
2. **Cascade Operations**: Auto-cleanup on user deletion
3. **Query Performance**: Enable JOIN optimizations
4. **Database Enforcement**: App bugs can't corrupt data

### Indexes for Performance

```sql
-- Authentication lookups
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Query patterns
-- Fast: SELECT * FROM users WHERE email = 'user@example.com'
-- Fast: SELECT * FROM sessions WHERE user_id = '123' AND expires_at > NOW()
```

**Common Index Mistakes:**

- ❌ Indexing everything (slows writes, wastes space)
- ❌ Not indexing foreign keys (slow JOINs)
- ❌ Not indexing WHERE clause columns (full table scans)
- ✅ Index columns used in WHERE, JOIN, ORDER BY

---

## Frontend to Backend Flow

### SvelteKit-Specific Architecture

```
┌──────────────────────────────────────────────────────┐
│                      Browser                         │
│  - Form actions                                      │
│  - Fetch requests                                    │
│  - Cookie storage (automatic)                        │
└───────────────────────┬──────────────────────────────┘
                        │
                        ↓ HTTP Request
┌──────────────────────────────────────────────────────┐
│              SvelteKit Server Runtime                │
│                                                      │
│  ┌─────────────────────────────────────────┐       │
│  │  1. hooks.server.ts                     │       │
│  │     - Runs on EVERY request             │       │
│  │     - Validates session                 │       │
│  │     - Loads user into locals            │       │
│  └─────────────────────────────────────────┘       │
│                        ↓                             │
│  ┌─────────────────────────────────────────┐       │
│  │  2. +page.server.ts / +server.ts        │       │
│  │     - Access: locals.user               │       │
│  │     - Perform authorization checks      │       │
│  │     - Execute business logic            │       │
│  └─────────────────────────────────────────┘       │
│                        ↓                             │
│  ┌─────────────────────────────────────────┐       │
│  │  3. Database Layer (Drizzle)            │       │
│  │     - Type-safe queries                 │       │
│  │     - Prepared statements (SQL injection safe) │
│  └─────────────────────────────────────────┘       │
└───────────────────────┬──────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│                  PostgreSQL Database                 │
└──────────────────────────────────────────────────────┘
```

### Example: Viewing User Profile

```typescript
// routes/profile/[userId]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
    // Step 1: AUTHENTICATION - Check if user is logged in
    if (!locals.user) {
        // Not authenticated, redirect to login
        throw redirect(302, '/login');
    }

    // Step 2: Fetch target profile
    const targetUser = await db.query.users.findFirst({
        where: eq(users.id, params.userId),
        columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            createdAt: true,
            // SECURITY: Don't expose sensitive fields
            // hashedPassword: false, (excluded by not selecting)
            // email: false,
        }
    });

    if (!targetUser) {
        throw error(404, 'User not found');
    }

    // Step 3: AUTHORIZATION - Check what data to show
    const isOwnProfile = locals.user.id === targetUser.id;
    const isAdmin = locals.user.role === 'admin';

    // Different data based on permissions
    if (isOwnProfile || isAdmin) {
        // Show private data (email, settings, etc.)
        const privateData = await db.query.users.findFirst({
            where: eq(users.id, params.userId),
            columns: {
                email: true,
                emailVerified: true,
            }
        });
        
        return {
            user: targetUser,
            privateData,
            canEdit: true
        };
    }

    // Step 4: Return appropriate data
    return {
        user: targetUser,
        privateData: null,
        canEdit: false
    };
};
```

### Form Actions with Auth

```typescript
// routes/profile/[userId]/+page.server.ts
import type { Actions } from './$types';

export const actions: Actions = {
    updateProfile: async ({ request, locals, params }) => {
        // AUTHENTICATION
        if (!locals.user) {
            return { success: false, error: 'Not authenticated' };
        }

        // AUTHORIZATION
        if (locals.user.id !== params.userId && locals.user.role !== 'admin') {
            return { success: false, error: 'Forbidden' };
        }

        // VALIDATION
        const data = await request.formData();
        const displayName = data.get('displayName')?.toString();

        if (!displayName || displayName.length < 3) {
            return { success: false, error: 'Invalid display name' };
        }

        // UPDATE DATABASE
        await db.update(users)
            .set({ 
                displayName,
                updatedAt: new Date() 
            })
            .where(eq(users.id, params.userId));

        return { success: true };
    }
};
```

---

## Security Considerations

### 1. Password Security

```typescript
// ✅ CORRECT - Using Argon2id (Lucia default)
import { hash, verify } from '@node-rs/argon2';

// Registration
const hashedPassword = await hash(plainPassword, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
});

// Login
const valid = await verify(hashedPassword, plainPassword);
```

**Why Argon2id?**
- Winner of Password Hashing Competition (2015)
- Resistant to GPU/ASIC attacks
- Configurable memory/CPU cost
- Built-in salt generation

### 2. Session Security

```typescript
// Cookie configuration
const sessionCookie = lucia.createSessionCookie(sessionId);

// Attributes automatically set by Lucia:
{
    httpOnly: true,      // ✅ Prevents JavaScript access (XSS protection)
    secure: true,        // ✅ HTTPS only in production
    sameSite: 'lax',     // ✅ CSRF protection
    path: '/',           // ✅ Available site-wide
    maxAge: 60 * 60 * 24 * 30  // 30 days
}
```

**Session Best Practices:**

1. **Regenerate session ID on login**
   ```typescript
   // Prevent session fixation attacks
   await lucia.invalidateSession(oldSessionId);
   const newSession = await lucia.createSession(userId);
   ```

2. **Implement session timeout**
   ```typescript
   // Check on every request (in hooks.server.ts)
   if (session.expiresAt < new Date()) {
       await lucia.invalidateSession(session.id);
       // Redirect to login
   }
   ```

3. **Track session metadata**
   ```typescript
   // Detect suspicious activity
   {
       ipAddress: request.headers.get('x-forwarded-for'),
       userAgent: request.headers.get('user-agent'),
       createdAt: new Date()
   }
   ```

### 3. CSRF Protection

SvelteKit provides built-in CSRF protection:

```typescript
// Automatic in form actions
export const actions: Actions = {
    default: async ({ request }) => {
        // SvelteKit validates CSRF token automatically
        // Token is in form data: __sveltekit_csrf
    }
};
```

**How it works:**
1. Form rendered with hidden CSRF token
2. Token stored in cookie
3. Server validates token matches cookie
4. Prevents cross-site form submissions

### 4. SQL Injection Prevention

```typescript
// ❌ DANGEROUS - String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Vulnerable: email = "'; DROP TABLE users; --"

// ✅ SAFE - Parameterized queries (Drizzle)
const user = await db.query.users.findFirst({
    where: eq(users.email, email)
});
// Drizzle uses prepared statements automatically
```

### 5. XSS Prevention

```svelte
<!-- ✅ SAFE - Svelte escapes by default -->
<p>{user.displayName}</p>

<!-- ❌ DANGEROUS - Renders HTML -->
<p>{@html user.bio}</p>

<!-- ✅ SAFE - Sanitize HTML first -->
<script>
import DOMPurify from 'isomorphic-dompurify';
const safeBio = DOMPurify.sanitize(user.bio);
</script>
<p>{@html safeBio}</p>
```

### 6. Rate Limiting

```typescript
// Prevent brute force attacks
import { RateLimiter } from 'sveltekit-rate-limiter/server';

const limiter = new RateLimiter({
    // 5 login attempts per 15 minutes
    IP: [5, '15m'],
});

export const actions: Actions = {
    login: async (event) => {
        // Check rate limit
        if (await limiter.isLimited(event)) {
            return { success: false, error: 'Too many attempts' };
        }
        
        // Process login
    }
};
```

---

## Common Pitfalls & Misunderstandings

### ❌ Mistake 1: Storing Sensitive Data Client-Side

```typescript
// ❌ BAD - Exposing data to client
export const load: PageServerLoad = async ({ locals }) => {
    return {
        user: locals.user,
        hashedPassword: locals.user.hashedPassword, // LEAKED!
        apiKey: process.env.SECRET_API_KEY,        // LEAKED!
    };
};

// ✅ GOOD - Only send necessary data
export const load: PageServerLoad = async ({ locals }) => {
    return {
        user: {
            id: locals.user.id,
            username: locals.user.username,
            displayName: locals.user.displayName,
            // That's it!
        }
    };
};
```

### ❌ Mistake 2: Client-Side Authorization

```svelte
<!-- ❌ BAD - Client can bypass this -->
<script>
if (user.role !== 'admin') {
    goto('/'); // User can just delete this code!
}
</script>
<button on:click={deleteAllUsers}>Delete All</button>

<!-- ✅ GOOD - Server-side enforcement -->
<script>
// Server will reject the request anyway
</script>
<button on:click={deleteAllUsers}>Delete All</button>

<!-- Server action -->
<script lang="ts">
export const actions: Actions = {
    deleteAllUsers: async ({ locals }) => {
        if (locals.user?.role !== 'admin') {
            throw error(403, 'Forbidden');
        }
        // Actually delete users
    }
};
</script>
```

**Rule:** Client-side checks are for UX only. Always enforce on server.

### ❌ Mistake 3: Trusting User Input

```typescript
// ❌ BAD - No validation
export const actions: Actions = {
    updateRole: async ({ request, locals }) => {
        const data = await request.formData();
        const newRole = data.get('role'); // Could be ANYTHING
        
        await db.update(users)
            .set({ role: newRole }) // User made themselves admin!
            .where(eq(users.id, locals.user.id));
    }
};

// ✅ GOOD - Validate everything
export const actions: Actions = {
    updateRole: async ({ request, locals }) => {
        // Only admins can change roles
        if (locals.user.role !== 'admin') {
            throw error(403);
        }
        
        const data = await request.formData();
        const targetUserId = data.get('userId')?.toString();
        const newRole = data.get('role')?.toString();
        
        // Validate role is valid
        if (!['user', 'admin'].includes(newRole)) {
            return { success: false, error: 'Invalid role' };
        }
        
        // Can't demote yourself
        if (targetUserId === locals.user.id) {
            return { success: false, error: 'Cannot modify own role' };
        }
        
        await db.update(users)
            .set({ role: newRole })
            .where(eq(users.id, targetUserId));
    }
};
```

### ❌ Mistake 4: Not Invalidating Sessions

```typescript
// ❌ BAD - Password changed but old sessions still valid
export const actions: Actions = {
    changePassword: async ({ locals, request }) => {
        const data = await request.formData();
        const newPassword = data.get('newPassword')?.toString();
        
        const hashedPassword = await hash(newPassword);
        await db.update(users)
            .set({ hashedPassword })
            .where(eq(users.id, locals.user.id));
        
        // User's other devices still logged in! 🚨
    }
};

// ✅ GOOD - Invalidate all sessions
export const actions: Actions = {
    changePassword: async ({ locals, request, cookies }) => {
        const data = await request.formData();
        const newPassword = data.get('newPassword')?.toString();
        
        const hashedPassword = await hash(newPassword);
        await db.update(users)
            .set({ hashedPassword })
            .where(eq(users.id, locals.user.id));
        
        // Invalidate all sessions for this user
        await db.delete(sessions)
            .where(eq(sessions.userId, locals.user.id));
        
        // User must log in again on all devices
        cookies.delete('session', { path: '/' });
        throw redirect(302, '/login');
    }
};
```

### ❌ Mistake 5: Race Conditions

```typescript
// ❌ BAD - Not atomic
export const actions: Actions = {
    joinTournament: async ({ locals, params }) => {
        const tournament = await getTournament(params.id);
        
        if (tournament.participants.length < tournament.maxParticipants) {
            // 🚨 Another user could join here!
            await addParticipant(tournament.id, locals.user.id);
            // Now we have too many participants!
        }
    }
};

// ✅ GOOD - Use database constraints
CREATE TABLE tournament_participants (
    tournament_id UUID REFERENCES tournaments(id),
    user_id UUID REFERENCES users(id),
    PRIMARY KEY (tournament_id, user_id),
    CHECK (
        (SELECT COUNT(*) FROM tournament_participants 
         WHERE tournament_id = tournament_participants.tournament_id) 
        <= (SELECT max_participants FROM tournaments 
            WHERE id = tournament_participants.tournament_id)
    )
);

// ✅ Or use transactions
export const actions: Actions = {
    joinTournament: async ({ locals, params }) => {
        await db.transaction(async (tx) => {
            const tournament = await tx.select()
                .from(tournaments)
                .where(eq(tournaments.id, params.id))
                .for('update'); // Lock row
            
            if (tournament.participants.length >= tournament.maxParticipants) {
                throw new Error('Tournament full');
            }
            
            await tx.insert(tournamentParticipants).values({
                tournamentId: params.id,
                userId: locals.user.id
            });
        });
    }
};
```

### ❌ Mistake 6: Logging Sensitive Data

```typescript
// ❌ BAD - Password in logs
console.log('Login attempt:', { email, password });
console.error('Failed to update user:', user); // Contains hashed password

// ✅ GOOD - Sanitize logs
console.log('Login attempt:', { email });
console.error('Failed to update user:', { userId: user.id, username: user.username });

// Use a logging library
import pino from 'pino';
const logger = pino({
    redact: ['password', 'hashedPassword', 'sessionToken', 'email']
});
```

---

## Testing Strategy

### Test Pyramid for Auth

```
        /\
       /  \      E2E Tests (Few)
      /────\     - Full login flow
     /      \    - Session persistence
    /────────\   - OAuth flow
   /          \
  /────────────\ Integration Tests (Some)
 /              \- API endpoints
/────────────────\ - Database operations
────────────────── Unit Tests (Many)
                   - Password hashing
                   - Validation functions
                   - Token generation
```

### Testing Approach for Your Project

#### 1. Unit Tests (Fastest, Most)

```typescript
// src/lib/server/auth/test_auth/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../password';

describe('Password Hashing', () => {
    it('should hash password successfully', async () => {
        const password = 'SecurePass123!';
        const hash = await hashPassword(password);
        
        expect(hash).not.toBe(password);
        expect(hash).toHaveLength(97); // Argon2id length
    });

    it('should verify correct password', async () => {
        const password = 'SecurePass123!';
        const hash = await hashPassword(password);
        
        const valid = await verifyPassword(hash, password);
        expect(valid).toBe(true);
    });

    it('should reject incorrect password', async () => {
        const hash = await hashPassword('correct');
        const valid = await verifyPassword(hash, 'wrong');
        expect(valid).toBe(false);
    });
});
```

```typescript
// src/lib/server/auth/test_auth/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validateUsername, validatePassword } from '../validation';

describe('Input Validation', () => {
    describe('Email Validation', () => {
        it('should accept valid emails', () => {
            expect(validateEmail('user@example.com')).toBe(true);
            expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
        });

        it('should reject invalid emails', () => {
            expect(validateEmail('notanemail')).toBe(false);
            expect(validateEmail('@example.com')).toBe(false);
            expect(validateEmail('user@')).toBe(false);
        });
    });

    describe('Password Validation', () => {
        it('should require minimum length', () => {
            const result = validatePassword('short');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('8 characters');
        });

        it('should require complexity', () => {
            const result = validatePassword('alllowercase');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('uppercase');
        });

        it('should accept strong passwords', () => {
            const result = validatePassword('SecurePass123!');
            expect(result.valid).toBe(true);
        });
    });
});
```

#### 2. Integration Tests (Database)

```typescript
// src/lib/server/db/test_db/sessions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../index';
import { users, sessions } from '../schema';
import { createTestUser, cleanupDatabase } from './test-utils';

describe('Session Management', () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    it('should create session for user', async () => {
        const user = await createTestUser();
        
        const [session] = await db.insert(sessions).values({
            id: 'test-session-123',
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }).returning();

        expect(session.userId).toBe(user.id);
    });

    it('should cascade delete sessions when user deleted', async () => {
        const user = await createTestUser();
        await db.insert(sessions).values({
            id: 'test-session-123',
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        // Delete user
        await db.delete(users).where(eq(users.id, user.id));

        // Check sessions are gone
        const remainingSessions = await db.select()
            .from(sessions)
            .where(eq(sessions.userId, user.id));

        expect(remainingSessions).toHaveLength(0);
    });

    it('should validate expired sessions', async () => {
        const user = await createTestUser();
        const expiredSession = await db.insert(sessions).values({
            id: 'expired-session',
            userId: user.id,
            expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
        }).returning();

        const isValid = expiredSession[0].expiresAt > new Date();
        expect(isValid).toBe(false);
    });
});
```

#### 3. E2E Tests (Full Flow)

```typescript
// e2e/auth.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('user can register and login', async ({ page }) => {
        // Navigate to register page
        await page.goto('/register');

        // Fill registration form
        await page.fill('input[name="username"]', 'testuser');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'SecurePass123!');
        await page.fill('input[name="confirmPassword"]', 'SecurePass123!');

        // Submit form
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL('/dashboard');

        // Check user is logged in
        await expect(page.locator('text=testuser')).toBeVisible();

        // Logout
        await page.click('button:has-text("Logout")');
        await expect(page).toHaveURL('/');

        // Login again
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'SecurePass123!');
        await page.click('button[type="submit"]');

        // Should be back in dashboard
        await expect(page).toHaveURL('/dashboard');
    });

    test('session persists across page refreshes', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'SecurePass123!');
        await page.click('button[type="submit"]');

        // Refresh page
        await page.reload();

        // Should still be logged in
        await expect(page.locator('text=testuser')).toBeVisible();
    });

    test('cannot access protected routes when logged out', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Should redirect to login
        await expect(page).toHaveURL('/login');
    });

    test('rate limiting prevents brute force', async ({ page }) => {
        await page.goto('/login');

        // Try logging in 6 times with wrong password
        for (let i = 0; i < 6; i++) {
            await page.fill('input[name="email"]', 'test@example.com');
            await page.fill('input[name="password"]', 'WrongPassword');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(100);
        }

        // Should show rate limit error
        await expect(page.locator('text=Too many attempts')).toBeVisible();
    });
});
```

### Test Structure Template

```typescript
// tests/auth/[feature].test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe('[Feature Name]', () => {
    // Setup before all tests
    beforeAll(async () => {
        // Start test database
        // Initialize test data
    });

    // Cleanup after all tests
    afterAll(async () => {
        // Stop test database
        // Clean up resources
    });

    // Reset state before each test
    beforeEach(async () => {
        // Clear database
        // Reset mocks
    });

    describe('[Sub-feature]', () => {
        it('should handle success case', async () => {
            // Arrange: Set up test data
            const input = { /* test data */ };
            
            // Act: Execute function
            const result = await functionUnderTest(input);
            
            // Assert: Verify result
            expect(result).toEqual(expectedOutput);
        });

        it('should handle error case', async () => {
            // Test error handling
            await expect(
                functionUnderTest(invalidInput)
            ).rejects.toThrow('Expected error message');
        });

        it('should validate edge cases', async () => {
            // Test boundary conditions
            // Empty strings, null values, maximum lengths, etc.
        });
    });
});
```

### Running Tests Concurrently

```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Run tests in parallel (default: true)
        threads: true,
        
        // Isolate each test file
        isolate: true,
        
        // Test timeout
        testTimeout: 10000,
        
        // Setup file
        setupFiles: ['./src/lib/server/db/test_db/vitest.setup.ts'],
        
        // Coverage
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: ['node_modules/', 'e2e/']
        },
        
        // Environment
        environment: 'node',
        
        // Database pooling for parallel tests
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: false
            }
        }
    }
});
```

### CI/CD Pipeline Test Flow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '24'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
          
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Implementation Checklist

### Phase 1: Foundation (Test First!)

- [ ] **Write Schema Tests**
  - [ ] Test user creation with valid data
  - [ ] Test unique constraints (email, username)
  - [ ] Test foreign key relationships
  - [ ] Test cascade deletes
  
- [ ] **Write Password Tests**
  - [ ] Test password hashing
  - [ ] Test password verification
  - [ ] Test hash uniqueness (same password = different hash)
  
- [ ] **Write Validation Tests**
  - [ ] Test email validation (valid/invalid formats)
  - [ ] Test username validation (length, characters)
  - [ ] Test password strength validation

### Phase 2: Authentication Logic

- [ ] **Write Session Tests**
  - [ ] Test session creation
  - [ ] Test session validation
  - [ ] Test session expiration
  - [ ] Test session deletion
  
- [ ] **Implement Authentication**
  - [ ] Registration endpoint
  - [ ] Login endpoint
  - [ ] Logout endpoint
  - [ ] Session middleware (hooks.server.ts)
  
- [ ] **Write Auth Integration Tests**
  - [ ] Test full registration flow
  - [ ] Test full login flow
  - [ ] Test logout flow
  - [ ] Test session persistence

### Phase 3: Authorization

- [ ] **Write Authorization Tests**
  - [ ] Test resource ownership checks
  - [ ] Test role-based permissions
  - [ ] Test forbidden access (403)
  - [ ] Test unauthenticated access (401)
  
- [ ] **Implement Authorization**
  - [ ] Profile editing (own profile only)
  - [ ] Admin routes (admin role only)
  - [ ] Friend requests (authenticated users)
  - [ ] Game creation (authenticated users)

### Phase 4: Security Hardening

- [ ] **Write Security Tests**
  - [ ] Test CSRF protection
  - [ ] Test SQL injection prevention
  - [ ] Test XSS prevention
  - [ ] Test rate limiting
  
- [ ] **Implement Security Measures**
  - [ ] Rate limiting on login/register
  - [ ] Session regeneration on login
  - [ ] Secure cookie configuration
  - [ ] Input sanitization
  - [ ] Error message sanitization (no data leaks)

### Phase 5: E2E Testing

- [ ] **Write E2E Tests**
  - [ ] Full user journey (register → login → action → logout)
  - [ ] Session persistence across tabs
  - [ ] Password reset flow (if implemented)
  - [ ] Account deletion flow
  
- [ ] **CI/CD Integration**
  - [ ] Set up GitHub Actions
  - [ ] Run tests on every push
  - [ ] Block merge if tests fail
  - [ ] Generate coverage reports

### Phase 6: Monitoring & Logging

- [ ] **Implement Logging**
  - [ ] Log authentication events
  - [ ] Log authorization failures
  - [ ] Log suspicious activity
  - [ ] Sanitize sensitive data from logs
  
- [ ] **Implement Monitoring**
  - [ ] Track failed login attempts
  - [ ] Alert on unusual patterns
  - [ ] Monitor session count per user

---

## Key Takeaways

### 🎯 Core Principles

1. **Never Trust the Client**: Always validate and authorize on the server
2. **Defense in Depth**: Multiple layers of security (validation, auth, authorization, rate limiting)
3. **Least Privilege**: Users get minimum permissions needed
4. **Fail Secure**: Errors should deny access, not grant it
5. **Test Everything**: Auth bugs = security vulnerabilities

### 📚 Resources

- [Lucia Auth Documentation](https://lucia-auth.com/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SvelteKit Security](https://kit.svelte.dev/docs/security)
- [Drizzle ORM Security](https://orm.drizzle.team/docs/security)

### 🚀 Next Steps

1. Review this document thoroughly
2. Set up test infrastructure
3. Write tests for each feature BEFORE implementing
4. Implement features to pass tests
5. Run full test suite before committing
6. Set up CI/CD to run tests automatically

---

**Remember:** Authentication is not optional. It's the foundation of your application's security. Take your time, test thoroughly, and don't skip steps! 🔒
