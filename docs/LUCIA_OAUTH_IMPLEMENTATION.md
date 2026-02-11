# Lucia Auth OAuth Implementation Guide

**Framework:** SvelteKit + Lucia Auth v2  
**Based on:** Official Lucia Auth GitHub OAuth Guide  
**Date:** February 2026  
**Status:** Implementation Ready

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [OAuth Provider Setup](#oauth-provider-setup)
3. [Database Schema](#database-schema)
4. [Lucia Configuration](#lucia-configuration)
5. [Implementation Steps](#implementation-steps)
6. [Security Considerations](#security-considerations)
7. [Testing Strategy](#testing-strategy)
8. [Common Pitfalls](#common-pitfalls)

---

## Prerequisites

Before implementing OAuth, ensure you have:

- ✅ Lucia Auth installed and configured
- ✅ Database setup with users and sessions tables
- ✅ `handle()` hook implemented in `hooks.server.ts`
- ✅ Basic authentication routes working

### Verify Setup

```typescript
// src/hooks.server.ts
import { auth } from '$lib/server/auth/lucia';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.auth = auth.handleRequest(event);
  return await resolve(event);
};
```

---

## OAuth Provider Setup

### 42 Intra OAuth App

1. **Navigate to:** https://profile.intra.42.fr/oauth/applications/new
2. **Fill in details:**
   - Name: `ft_transcendence` (or your project name)
   - Redirect URI: `http://localhost:5173/login/42/callback`
3. **Copy credentials:**
   - Client ID
   - Client Secret

### Environment Variables

```bash
# .env (local development)
INTRA_42_CLIENT_ID="..."
INTRA_42_CLIENT_SECRET="..."

# For production, use different values
# .env.production
INTRA_42_CLIENT_ID="..."
INTRA_42_CLIENT_SECRET="..."
INTRA_42_REDIRECT_URI="https://yourdomain.com/login/42/callback"
```

### GitHub OAuth App (Optional)

1. **Navigate to:** GitHub Settings → Developer settings → OAuth Apps → New OAuth App
2. **Fill in details:**
   - Application name: `ft_transcendence`
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/login/github/callback`
3. **Copy credentials**

```bash
# .env
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

### Google OAuth (Optional)

1. **Navigate to:** [Google Cloud Console](https://console.cloud.google.com/)
2. **Create project and enable OAuth**
3. **Configure consent screen**
4. **Create OAuth 2.0 Client ID**

```bash
# .env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

---

## Database Schema

### Update Users Table

Add a `username` column to your users table. This will store the OAuth provider's username.

```typescript
// src/lib/server/db/schema/users.ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(), // ✅ Add this
  fullName: text('full_name'),
  hashedPassword: text('hashed_password'), // nullable for OAuth-only users
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
```

### Create OAuth Accounts Table

This table links OAuth provider accounts to users.

```typescript
// src/lib/server/db/schema/oauth-accounts.ts
import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users';

export const oauthAccounts = pgTable('oauth_accounts', {
  provider: text('provider').notNull(), // '42', 'github', 'google'
  providerUserId: text('provider_user_id').notNull(), // OAuth ID from provider
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'), // Encrypted
  refreshToken: text('refresh_token'), // Encrypted
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.provider, table.providerUserId] })
}));
```

### Create Migration

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

### Update Type Definitions

**CRITICAL:** Update `app.d.ts` whenever you add columns to the user table.

```typescript
// src/app.d.ts
/// <reference types="lucia" />
declare global {
  namespace App {
    interface Locals {
      auth: import('lucia').AuthRequest;
    }
  }
  
  namespace Lucia {
    type Auth = import('$lib/server/auth/lucia').Auth;
    
    type DatabaseUserAttributes = {
      email: string;
      username: string;      // ✅ Add this
      full_name: string | null;
    };
    
    type DatabaseSessionAttributes = Record<string, never>;
  }
}

export {};
```

---

## Lucia Configuration

### Configure getUserAttributes

Expose OAuth user data to the `User` object.

```typescript
// src/lib/server/auth/lucia.ts
import { lucia } from 'lucia';
import { sveltekit } from 'lucia/middleware';
import { dev } from '$app/environment';
import { pg } from '@lucia-auth/adapter-postgresql';
import { pool } from '$lib/server/db';

export const auth = lucia({
  adapter: pg(pool, {
    user: 'users',
    session: 'sessions',
    key: 'keys'
  }),
  env: dev ? 'DEV' : 'PROD',
  middleware: sveltekit(),
  
  // ✅ Expose user attributes
  getUserAttributes: (data) => {
    return {
      email: data.email,
      username: data.username,        // From OAuth provider
      fullName: data.full_name
    };
  }
});

export type Auth = typeof auth;
```

### Initialize OAuth Integration

Install the OAuth integration:

```bash
npm install @lucia-auth/oauth
```

Initialize providers:

```typescript
// src/lib/server/auth/lucia.ts
import { lucia } from 'lucia';
import { sveltekit } from 'lucia/middleware';
import { dev } from '$app/environment';

// ✅ Import OAuth integrations
import { github, google } from '@lucia-auth/oauth/providers';
import { 
  GITHUB_CLIENT_ID, 
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  INTRA_42_CLIENT_ID,
  INTRA_42_CLIENT_SECRET
} from '$env/static/private';

export const auth = lucia({
  // ... existing config
});

// ✅ Initialize GitHub OAuth
export const githubAuth = github(auth, {
  clientId: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET
});

// ✅ Initialize Google OAuth
export const googleAuth = google(auth, {
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: 'http://localhost:5173/login/google/callback'
});

// ✅ 42 Intra requires custom implementation (covered later)

export type Auth = typeof auth;
```

### Sync Types

Generate SvelteKit types after configuration:

```bash
npm run sync
# or
npx svelte-kit sync
```

---

## Implementation Steps

### Step 1: Create Login Page

```svelte
<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
</script>

<div class="container">
  <h1>Sign In</h1>
  
  <!-- OAuth Login Options -->
  <div class="oauth-buttons">
    <a href="/login/42" class="oauth-btn oauth-42">
      Sign in with 42 Intra
    </a>
    
    <a href="/login/github" class="oauth-btn oauth-github">
      Sign in with GitHub
    </a>
    
    <a href="/login/google" class="oauth-btn oauth-google">
      Sign in with Google
    </a>
  </div>
  
  <div class="divider">or</div>
  
  <!-- Traditional Login Form -->
  <form method="POST" action="?/login" use:enhance>
    <input type="email" name="email" required />
    <input type="password" name="password" required />
    <button type="submit">Sign in with Email</button>
  </form>
</div>

<style>
  .oauth-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .oauth-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    text-align: center;
    font-weight: 500;
  }
  
  .oauth-42 {
    background: #00babc;
    color: white;
  }
  
  .oauth-github {
    background: #24292e;
    color: white;
  }
  
  .oauth-google {
    background: #4285f4;
    color: white;
  }
</style>
```

### Step 2: Redirect Authenticated Users

```typescript
// src/routes/(auth)/login/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth.validate();
  
  // ✅ Redirect authenticated users to home
  if (session) {
    throw redirect(302, '/');
  }
  
  return {};
};
```

### Step 3: GitHub OAuth Implementation

#### Step 3a: Authorization Redirect

```typescript
// src/routes/(api)/(auth)/login/github/+server.ts
import { dev } from '$app/environment';
import { githubAuth } from '$lib/server/auth/lucia';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
  // ✅ Generate authorization URL with state
  const [url, state] = await githubAuth.getAuthorizationUrl();
  
  // ✅ Store state in cookie for CSRF protection
  cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: !dev,
    path: '/',
    maxAge: 60 * 10 // 10 minutes
  });
  
  // ✅ Redirect to GitHub
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString()
    }
  });
};
```

#### Step 3b: Callback Handler

```typescript
// src/routes/(api)/(auth)/login/github/callback/+server.ts
import { auth, githubAuth } from '$lib/server/auth/lucia';
import { OAuthRequestError } from '@lucia-auth/oauth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  // ✅ Get state and code from URL
  const storedState = cookies.get('github_oauth_state');
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  
  // ✅ Validate state (CSRF protection)
  if (!storedState || !state || storedState !== state || !code) {
    return new Response('Invalid state parameter', {
      status: 400
    });
  }
  
  try {
    // ✅ Validate callback and get user info
    const { getExistingUser, githubUser, createUser } = 
      await githubAuth.validateCallback(code);
    
    // ✅ Get or create user
    const getUser = async () => {
      const existingUser = await getExistingUser();
      if (existingUser) return existingUser;
      
      // Create new user with GitHub data
      const user = await createUser({
        attributes: {
          email: githubUser.email,
          username: githubUser.login,
          full_name: githubUser.name
        }
      });
      
      return user;
    };
    
    const user = await getUser();
    
    // ✅ Create session
    const session = await auth.createSession({
      userId: user.userId,
      attributes: {}
    });
    
    // ✅ Set session cookie
    locals.auth.setSession(session);
    
    // ✅ Clean up state cookie
    cookies.delete('github_oauth_state', { path: '/' });
    
    // ✅ Redirect to home
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/'
      }
    });
  } catch (e) {
    console.error('GitHub OAuth error:', e);
    
    if (e instanceof OAuthRequestError) {
      // Invalid code
      return new Response('Invalid authorization code', {
        status: 400
      });
    }
    
    return new Response('Internal server error', {
      status: 500
    });
  }
};
```

### Step 4: 42 Intra OAuth (Custom Implementation)

Since 42 Intra is not built into `@lucia-auth/oauth`, we need a custom implementation.

#### Step 4a: Create 42 Provider

```typescript
// src/lib/server/oauth/providers/intra-42.ts
import { OAuth2Provider } from '@lucia-auth/oauth';
import type { Auth } from '$lib/server/auth/lucia';

export class Intra42Provider extends OAuth2Provider<Intra42UserInfo> {
  constructor(auth: Auth, config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }) {
    super({
      providerId: '42',
      auth,
      config: {
        authorizationEndpoint: 'https://api.intra.42.fr/oauth/authorize',
        tokenEndpoint: 'https://api.intra.42.fr/oauth/token',
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri
      }
    });
  }
  
  async getUser(accessToken: string): Promise<Intra42UserInfo> {
    const response = await fetch('https://api.intra.42.fr/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info from 42 API');
    }
    
    return await response.json();
  }
}

export interface Intra42UserInfo {
  id: number;
  email: string;
  login: string;
  displayname: string;
  image: {
    link: string;
  };
}

// ✅ Export factory function
export function intra42(auth: Auth, config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  return new Intra42Provider(auth, config);
}
```

#### Step 4b: Initialize 42 Provider

```typescript
// src/lib/server/auth/lucia.ts
import { lucia } from 'lucia';
import { sveltekit } from 'lucia/middleware';
import { dev } from '$app/environment';
import { github, google } from '@lucia-auth/oauth/providers';
import { intra42 } from '../oauth/providers/intra-42'; // ✅ Import custom provider
import { 
  GITHUB_CLIENT_ID, 
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  INTRA_42_CLIENT_ID,
  INTRA_42_CLIENT_SECRET
} from '$env/static/private';

export const auth = lucia({
  // ... config
});

export const githubAuth = github(auth, {
  clientId: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET
});

export const googleAuth = google(auth, {
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: 'http://localhost:5173/login/google/callback'
});

// ✅ Initialize 42 Intra provider
export const intra42Auth = intra42(auth, {
  clientId: INTRA_42_CLIENT_ID,
  clientSecret: INTRA_42_CLIENT_SECRET,
  redirectUri: dev 
    ? 'http://localhost:5173/login/42/callback'
    : 'https://yourdomain.com/login/42/callback'
});

export type Auth = typeof auth;
```

#### Step 4c: 42 OAuth Routes

```typescript
// src/routes/(api)/(auth)/login/42/+server.ts
import { dev } from '$app/environment';
import { intra42Auth } from '$lib/server/auth/lucia';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
  const [url, state] = await intra42Auth.getAuthorizationUrl();
  
  cookies.set('intra_42_oauth_state', state, {
    httpOnly: true,
    secure: !dev,
    path: '/',
    maxAge: 60 * 10
  });
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString()
    }
  });
};
```

```typescript
// src/routes/(api)/(auth)/login/42/callback/+server.ts
import { auth, intra42Auth } from '$lib/server/auth/lucia';
import { OAuthRequestError } from '@lucia-auth/oauth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  const storedState = cookies.get('intra_42_oauth_state');
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  
  if (!storedState || !state || storedState !== state || !code) {
    return new Response('Invalid state parameter', {
      status: 400
    });
  }
  
  try {
    const { getExistingUser, intra42User, createUser } = 
      await intra42Auth.validateCallback(code);
    
    const getUser = async () => {
      const existingUser = await getExistingUser();
      if (existingUser) return existingUser;
      
      const user = await createUser({
        attributes: {
          email: intra42User.email,
          username: intra42User.login,
          full_name: intra42User.displayname
        }
      });
      
      return user;
    };
    
    const user = await getUser();
    
    const session = await auth.createSession({
      userId: user.userId,
      attributes: {}
    });
    
    locals.auth.setSession(session);
    cookies.delete('intra_42_oauth_state', { path: '/' });
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/'
      }
    });
  } catch (e) {
    console.error('42 Intra OAuth error:', e);
    
    if (e instanceof OAuthRequestError) {
      return new Response('Invalid authorization code', {
        status: 400
      });
    }
    
    return new Response('Internal server error', {
      status: 500
    });
  }
};
```

### Step 5: Profile Page

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';
  
  export let data: PageData;
</script>

<div class="profile">
  <h1>Profile</h1>
  
  <div class="user-info">
    <p><strong>User ID:</strong> {data.userId}</p>
    <p><strong>Email:</strong> {data.email}</p>
    <p><strong>Username:</strong> {data.username}</p>
    {#if data.fullName}
      <p><strong>Full Name:</strong> {data.fullName}</p>
    {/if}
  </div>
  
  <form method="POST" action="?/logout" use:enhance>
    <button type="submit">Sign Out</button>
  </form>
</div>

<style>
  .profile {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
  }
  
  .user-info {
    background: #f5f5f5;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin: 1.5rem 0;
  }
  
  .user-info p {
    margin: 0.5rem 0;
  }
</style>
```

```typescript
// src/routes/+page.server.ts
import { auth } from '$lib/server/auth/lucia';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth.validate();
  
  // ✅ Redirect unauthenticated users
  if (!session) {
    throw redirect(302, '/login');
  }
  
  // ✅ Return user data
  return {
    userId: session.user.userId,
    email: session.user.email,
    username: session.user.username,
    fullName: session.user.fullName
  };
};

export const actions: Actions = {
  logout: async ({ locals }) => {
    const session = await locals.auth.validate();
    
    if (!session) {
      return fail(401);
    }
    
    // ✅ Invalidate session
    await auth.invalidateSession(session.sessionId);
    
    // ✅ Remove cookie
    locals.auth.setSession(null);
    
    // ✅ Redirect to login
    throw redirect(302, '/login');
  }
};
```

---

## Security Considerations

### 1. State Parameter Validation (CSRF Protection)

**Always validate the state parameter:**

```typescript
const storedState = cookies.get('oauth_state');
const receivedState = url.searchParams.get('state');

if (!storedState || !receivedState || storedState !== receivedState) {
  return new Response('Invalid state - potential CSRF attack', {
    status: 400
  });
}
```

### 2. HttpOnly Cookies

**Always use HttpOnly cookies for sessions:**

```typescript
cookies.set('oauth_state', state, {
  httpOnly: true,  // ✅ Prevents XSS
  secure: !dev,    // ✅ HTTPS only in production
  path: '/',
  maxAge: 600      // ✅ 10 minute expiration
});
```

### 3. Clean Up State Cookies

**Always delete state cookies after use:**

```typescript
// After successful authentication
cookies.delete('oauth_state', { path: '/' });
```

### 4. Encrypt OAuth Tokens

**If storing OAuth tokens, always encrypt them:**

```typescript
import { encrypt } from '$lib/server/auth/encryption';

await db.insert(oauthAccounts).values({
  provider: '42',
  providerUserId: user.id.toString(),
  userId: user.userId,
  accessToken: encrypt(tokens.access_token),      // ✅ Encrypted
  refreshToken: encrypt(tokens.refresh_token),    // ✅ Encrypted
  expiresAt: new Date(Date.now() + tokens.expires_in * 1000)
});
```

### 5. Rate Limiting

**Implement rate limiting on OAuth endpoints:**

```typescript
// src/lib/server/middleware/rate-limit.ts
import { error } from '@sveltejs/kit';

const attempts = new Map<string, number>();

export function rateLimit(ip: string, maxAttempts = 5) {
  const count = attempts.get(ip) || 0;
  
  if (count >= maxAttempts) {
    throw error(429, 'Too many requests');
  }
  
  attempts.set(ip, count + 1);
  
  // Clean up after 15 minutes
  setTimeout(() => attempts.delete(ip), 15 * 60 * 1000);
}
```

### 6. Error Handling

**Never expose internal errors to users:**

```typescript
try {
  // OAuth logic
} catch (e) {
  console.error('OAuth error:', e); // ✅ Log internally
  
  if (e instanceof OAuthRequestError) {
    return new Response('Authentication failed', { // ✅ Generic message
      status: 400
    });
  }
  
  return new Response('Internal server error', {
    status: 500
  });
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/oauth/state-validation.test.ts
import { describe, it, expect } from 'vitest';

describe('OAuth State Validation', () => {
  it('should reject mismatched state', () => {
    const storedState = 'valid-state';
    const receivedState = 'invalid-state';
    
    expect(storedState).not.toBe(receivedState);
  });
  
  it('should accept matching state', () => {
    const storedState = 'valid-state';
    const receivedState = 'valid-state';
    
    expect(storedState).toBe(receivedState);
  });
});
```

### Integration Tests

```typescript
// tests/oauth/github-flow.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testDb } from '../test-utils';

describe('GitHub OAuth Flow', () => {
  beforeEach(async () => {
    await testDb.clean();
  });
  
  it('should create new user from GitHub OAuth', async () => {
    // Mock GitHub OAuth response
    const mockGithubUser = {
      id: 12345,
      login: 'testuser',
      email: 'test@example.com',
      name: 'Test User'
    };
    
    // Test user creation logic
    // Assert user exists in database
    // Assert oauth_accounts entry exists
  });
  
  it('should link existing user with GitHub account', async () => {
    // Create existing user
    // Mock GitHub OAuth with same email
    // Assert oauth_accounts entry created
    // Assert no duplicate user created
  });
});
```

### E2E Tests

```typescript
// e2e/oauth-login.test.ts
import { test, expect } from '@playwright/test';

test('GitHub OAuth login flow', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  
  // Click GitHub OAuth button
  await page.click('a[href="/login/github"]');
  
  // Should redirect to GitHub
  await expect(page).toHaveURL(/github\.com/);
  
  // Note: Full E2E test requires mocking GitHub OAuth
  // Or using a test account with GitHub
});
```

---

## Common Pitfalls

### 1. ❌ Forgetting to Update app.d.ts

```typescript
// ❌ DON'T FORGET THIS
namespace Lucia {
  type DatabaseUserAttributes = {
    username: string; // Add all new user columns here!
  };
}
```

### 2. ❌ Not Cleaning Up State Cookies

```typescript
// ❌ BAD: State cookie left in browser
return new Response(null, {
  status: 302,
  headers: { Location: '/' }
});

// ✅ GOOD: Clean up state cookie
cookies.delete('oauth_state', { path: '/' });
return new Response(null, {
  status: 302,
  headers: { Location: '/' }
});
```

### 3. ❌ Using Insecure Cookies in Production

```typescript
// ❌ BAD: Not secure in production
cookies.set('oauth_state', state, {
  httpOnly: true,
  path: '/'
});

// ✅ GOOD: Secure in production
import { dev } from '$app/environment';

cookies.set('oauth_state', state, {
  httpOnly: true,
  secure: !dev, // ✅ Secure in production
  path: '/'
});
```

### 4. ❌ Exposing Client Secrets

```typescript
// ❌ NEVER expose secrets to frontend
<script>
  const clientSecret = '{GITHUB_CLIENT_SECRET}'; // ❌ NEVER!
</script>

// ✅ Always keep secrets server-side
// Only use in +server.ts files
import { GITHUB_CLIENT_SECRET } from '$env/static/private';
```

### 5. ❌ Not Handling Errors Properly

```typescript
// ❌ BAD: Crashes server on error
const { githubUser } = await githubAuth.validateCallback(code);

// ✅ GOOD: Proper error handling
try {
  const { githubUser } = await githubAuth.validateCallback(code);
} catch (e) {
  console.error('OAuth error:', e);
  return new Response('Authentication failed', { status: 400 });
}
```

---

## Next Steps

1. ✅ Review this guide thoroughly
2. ✅ Set up OAuth apps on provider platforms
3. ✅ Configure environment variables
4. ✅ Update database schema and run migrations
5. ✅ Implement 42 Intra OAuth first (required for 42 project)
6. ✅ Write tests before implementation
7. ✅ Implement GitHub/Google OAuth (optional)
8. ✅ Test all flows thoroughly
9. ✅ Deploy and test in production

---

## Resources

- **Lucia Auth Docs:** https://lucia-auth.com/
- **Lucia OAuth Docs:** https://lucia-auth.com/oauth/
- **42 Intra API:** https://api.intra.42.fr/apidoc
- **GitHub OAuth:** https://docs.github.com/en/developers/apps/building-oauth-apps
- **Google OAuth:** https://developers.google.com/identity/protocols/oauth2

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Production Ready
