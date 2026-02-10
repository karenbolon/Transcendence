# 🔐 OAuth 2.0 Authorization Architecture Guide

**Project:** ft_transcendence  
**Date:** February 9, 2026  
**Stack:** SvelteKit + Lucia Auth + OAuth 2.0 + PostgreSQL + Drizzle ORM

---

## 📋 Table of Contents

1. [OAuth 2.0 Overview](#oauth-20-overview)
2. [OAuth vs Traditional Auth](#oauth-vs-traditional-auth)
3. [OAuth Flow Diagrams](#oauth-flow-diagrams)
4. [Provider Integration](#provider-integration)
5. [Database Schema for OAuth](#database-schema-for-oauth)
6. [Security Considerations](#security-considerations)
7. [Implementation Strategy](#implementation-strategy)
8. [Common Pitfalls](#common-pitfalls)
9. [Testing OAuth](#testing-oauth)
10. [Implementation Checklist](#implementation-checklist)

---

## OAuth 2.0 Overview

### What is OAuth 2.0?

OAuth 2.0 is an **authorization protocol** that allows users to grant third-party applications limited access to their resources without sharing passwords.

### Why Use OAuth?

```
Traditional Auth Problems:
❌ Users create yet another password
❌ Users forget passwords
❌ You're responsible for password security
❌ No trusted identity verification

OAuth Benefits:
✅ No password management
✅ Users trust established providers (42, Google, GitHub)
✅ Verified email addresses
✅ Quick user onboarding
✅ Social features (profile picture, friends)
```

### OAuth 2.0 Key Concepts

```typescript
// The Four Roles in OAuth
interface OAuthRoles {
    resourceOwner: 'User',        // The user who owns the data
    client: 'Your Application',   // ft_transcendence
    authorizationServer: '42 API', // 42 OAuth server
    resourceServer: '42 API'      // Where user data is stored
}

// The Flow
1. User clicks "Login with 42"
2. User is redirected to 42's login page
3. User authorizes your app
4. 42 redirects back with authorization code
5. Your server exchanges code for access token
6. Your server uses token to get user info
7. Your server creates/updates user in database
8. Your server creates session for user
```

---

## OAuth vs Traditional Auth

### Comparison Table

| Feature | Traditional Auth | OAuth 2.0 |
|---------|-----------------|-----------|
| **Password Storage** | You store hashed passwords | No password stored |
| **User Trust** | Users trust your security | Users trust provider (42, Google) |
| **Email Verification** | You must implement | Provider already verified |
| **User Onboarding** | Fill registration form | Click one button |
| **Security Responsibility** | 100% on you | Shared with provider |
| **Account Recovery** | You implement password reset | Provider handles it |
| **Profile Data** | User enters manually | Auto-populated from provider |
| **Session Management** | You manage sessions | You still manage sessions |

### When to Use Each

```
Use Traditional Auth When:
✅ You need full control over authentication
✅ Your users prefer username/password
✅ You're building for enterprise (SSO requirements)
✅ You want offline authentication capability

Use OAuth When:
✅ You want quick user onboarding
✅ Users already have accounts on providers
✅ You want verified identities
✅ You need social features (friends, profiles)

Best Approach (Recommended):
✅ Hybrid: Support BOTH
   - OAuth for convenience (42, Google, GitHub)
   - Traditional auth as fallback
   - Users choose their preferred method
```

---

## OAuth Flow Diagrams

### 1. Authorization Code Flow (Most Secure)

```
┌──────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ [1] Click "Login with 42"
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│              YOUR SERVER (ft_transcendence)                  │
│                                                              │
│  GET /login/42                                               │
│  ├─→ Generate random 'state' token (CSRF protection)        │
│  ├─→ Store state in session/cookie                          │
│  └─→ Redirect to 42 OAuth authorization URL                 │
│                                                              │
│  https://api.intra.42.fr/oauth/authorize?                   │
│    client_id=YOUR_APP_ID                                    │
│    &redirect_uri=https://yourapp.com/login/42/callback      │
│    &response_type=code                                      │
│    &state=random_csrf_token                                 │
│    &scope=public                                            │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ [2] User redirected to 42
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│                    42 INTRA OAUTH SERVER                     │
│                                                              │
│  ┌────────────────────────────────────────┐                │
│  │   🔐 42 Login Page                     │                │
│  │                                         │                │
│  │   Email: student@student.42.fr         │                │
│  │   Password: ••••••••••                 │                │
│  │                                         │                │
│  │   [ Login ]                            │                │
│  └────────────────────────────────────────┘                │
│                                                              │
│  User enters 42 credentials (NOT visible to your app!)      │
│  42 verifies credentials internally                         │
│                                                              │
│  ┌────────────────────────────────────────┐                │
│  │   ft_transcendence wants to:           │                │
│  │   • View your profile                  │                │
│  │   • View your email                    │                │
│  │                                         │                │
│  │   [ Deny ]  [ Authorize ]              │                │
│  └────────────────────────────────────────┘                │
│                                                              │
│  User clicks "Authorize"                                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ [3] 42 redirects back with code
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│              YOUR SERVER (ft_transcendence)                  │
│                                                              │
│  GET /login/42/callback?code=ABC123&state=random_csrf_token │
│                                                              │
│  [4] Validate callback                                       │
│  ├─→ Verify 'state' matches stored value (CSRF check)       │
│  ├─→ Extract 'code' from query parameters                   │
│  └─→ Proceed to token exchange                              │
│                                                              │
│  [5] Exchange code for access token                         │
│  POST https://api.intra.42.fr/oauth/token                   │
│  Headers:                                                    │
│    Content-Type: application/json                           │
│  Body:                                                       │
│    {                                                         │
│      grant_type: "authorization_code",                      │
│      client_id: "YOUR_APP_ID",                              │
│      client_secret: "YOUR_SECRET",  // NEVER expose!        │
│      code: "ABC123",                                        │
│      redirect_uri: "https://yourapp.com/login/42/callback"  │
│    }                                                         │
│                                                              │
│  Response from 42:                                          │
│    {                                                         │
│      access_token: "xyz789...",                             │
│      token_type: "Bearer",                                  │
│      expires_in: 7200,                                      │
│      refresh_token: "refresh123...",                        │
│      scope: "public",                                       │
│      created_at: 1612345678                                 │
│    }                                                         │
│                                                              │
│  [6] Fetch user data from 42                                │
│  GET https://api.intra.42.fr/v2/me                          │
│  Headers:                                                    │
│    Authorization: Bearer xyz789...                          │
│                                                              │
│  Response from 42:                                          │
│    {                                                         │
│      id: 12345,                                             │
│      email: "student@student.42.fr",                        │
│      login: "student",                                      │
│      first_name: "John",                                    │
│      last_name: "Doe",                                      │
│      image: {                                               │
│        link: "https://cdn.intra.42.fr/users/student.jpg"   │
│      }                                                       │
│    }                                                         │
│                                                              │
│  [7] Create/Update user in YOUR database                    │
│  const existingUser = await findUserByProviderId(           │
│    'intra_42', '12345'                                      │
│  );                                                          │
│                                                              │
│  if (existingUser) {                                        │
│    // Update user data                                      │
│    await updateUser(existingUser.id, {                      │
│      email: '...',                                          │
│      displayName: '...',                                    │
│      avatarUrl: '...',                                      │
│      lastLoginAt: new Date()                                │
│    });                                                       │
│  } else {                                                    │
│    // Create new user                                       │
│    user = await createUser({                                │
│      username: 'student',                                   │
│      email: 'student@student.42.fr',                        │
│      displayName: 'John Doe',                               │
│      avatarUrl: 'https://...',                              │
│      emailVerified: true  // 42 already verified            │
│    });                                                       │
│                                                              │
│    // Link OAuth account to user                            │
│    await createOAuthAccount({                               │
│      userId: user.id,                                       │
│      provider: 'intra_42',                                  │
│      providerUserId: '12345',                               │
│      accessToken: 'xyz789...',  // Encrypted!               │
│      refreshToken: 'refresh123...',  // Encrypted!          │
│      expiresAt: new Date(Date.now() + 7200 * 1000)         │
│    });                                                       │
│  }                                                           │
│                                                              │
│  [8] Create session for user                                │
│  const session = await lucia.createSession(user.id, {});    │
│  const sessionCookie = lucia.createSessionCookie(           │
│    session.id                                               │
│  );                                                          │
│  cookies.set(sessionCookie.name, sessionCookie.value, {     │
│    ...sessionCookie.attributes                              │
│  });                                                         │
│                                                              │
│  [9] Redirect to dashboard                                  │
│  return redirect(302, '/dashboard');                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ [10] User is now logged in!
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│                   USER'S BROWSER                             │
│                                                              │
│   Welcome back, John Doe! 👋                                │
└──────────────────────────────────────────────────────────────┘
```

### 2. Account Linking Flow

```
User already has traditional auth account
User wants to add OAuth login method

┌──────────────────┐
│   Logged In User │
└────────┬─────────┘
         │
         │ Navigate to /settings/connections
         │
         ↓
┌────────────────────────────────────────┐
│   Settings Page                        │
│                                        │
│   Connected Accounts:                  │
│   ✅ Email/Password                    │
│   ⭕ 42 Intra (Not connected)         │
│   ⭕ GitHub (Not connected)           │
│                                        │
│   [ Connect 42 Account ]              │
└────────┬───────────────────────────────┘
         │
         │ Click "Connect 42 Account"
         │
         ↓
┌────────────────────────────────────────┐
│   OAuth Flow (same as above)          │
│   But with account linking context     │
└────────┬───────────────────────────────┘
         │
         │ After OAuth callback
         │
         ↓
┌────────────────────────────────────────┐
│   Server Logic                         │
│                                        │
│   if (locals.user) {                   │
│     // User is already logged in      │
│     // This is account linking         │
│                                        │
│     // Check if 42 account already    │
│     // linked to another user         │
│     const existing = await find(       │
│       provider: 'intra_42',           │
│       providerUserId: '12345'         │
│     );                                 │
│                                        │
│     if (existing && existing.userId    │
│         !== locals.user.id) {         │
│       return error(400,                │
│         '42 account already linked'   │
│       );                               │
│     }                                  │
│                                        │
│     // Link account                    │
│     await linkOAuthAccount({           │
│       userId: locals.user.id,         │
│       provider: 'intra_42',           │
│       providerUserId: '12345',        │
│       accessToken: '...'              │
│     });                                │
│                                        │
│     return redirect(302,               │
│       '/settings?success=42-linked'   │
│     );                                 │
│   }                                    │
└────────────────────────────────────────┘
```

### 3. Account Unlinking Flow

```
User wants to remove OAuth login method

┌────────────────────────────────────────┐
│   Settings Page                        │
│                                        │
│   Connected Accounts:                  │
│   ✅ Email/Password                    │
│   ✅ 42 Intra                          │
│      [ Disconnect ]                    │
└────────┬───────────────────────────────┘
         │
         │ Click "Disconnect"
         │
         ↓
┌────────────────────────────────────────┐
│   Server Action                        │
│                                        │
│   // Security checks                   │
│   const userAccounts = await           │
│     getLinkedAccounts(user.id);       │
│                                        │
│   // Prevent lockout                   │
│   if (userAccounts.length === 1) {    │
│     return error(400,                  │
│       'Cannot remove last login method'│
│     );                                 │
│   }                                    │
│                                        │
│   // Require password confirmation     │
│   if (!providedPassword) {             │
│     return error(400,                  │
│       'Password confirmation required' │
│     );                                 │
│   }                                    │
│                                        │
│   // Unlink account                    │
│   await unlinkOAuthAccount({           │
│     userId: user.id,                   │
│     provider: 'intra_42'              │
│   });                                  │
│                                        │
│   return { success: true };            │
└────────────────────────────────────────┘
```

---

## Provider Integration

### 1. 42 Intra OAuth

#### Configuration

```typescript
// src/lib/server/oauth/providers/intra-42.ts

interface Intra42Config {
    clientId: string;           // From 42 API app
    clientSecret: string;       // From 42 API app (KEEP SECRET!)
    redirectUri: string;        // Your callback URL
    authorizationUrl: string;   // 42's auth endpoint
    tokenUrl: string;          // 42's token endpoint
    userInfoUrl: string;       // 42's user info endpoint
    scopes: string[];          // Permissions requested
}

export const intra42Config: Intra42Config = {
    clientId: env.INTRA_42_CLIENT_ID,
    clientSecret: env.INTRA_42_CLIENT_SECRET,
    redirectUri: `${env.PUBLIC_APP_URL}/login/42/callback`,
    authorizationUrl: 'https://api.intra.42.fr/oauth/authorize',
    tokenUrl: 'https://api.intra.42.fr/oauth/token',
    userInfoUrl: 'https://api.intra.42.fr/v2/me',
    scopes: ['public']  // or 'public profile email'
};
```

#### Setting Up 42 OAuth Application

```
1. Go to: https://profile.intra.42.fr/oauth/applications
2. Click "Register a new application"
3. Fill in:
   Name: ft_transcendence
   Redirect URI: http://localhost:5173/login/42/callback  (dev)
                 https://yourdomain.com/login/42/callback (prod)
   Scopes: public
4. Save and copy:
   - Application UID (client_id)
   - Secret (client_secret)
5. Add to .env:
   INTRA_42_CLIENT_ID=your_uid_here
   INTRA_42_CLIENT_SECRET=your_secret_here
```

#### 42 User Data Structure

```typescript
interface Intra42User {
    id: number;                // Unique 42 user ID
    email: string;            // student@student.42.fr
    login: string;            // 42 username
    first_name: string;
    last_name: string;
    usual_full_name: string;  // Display name
    usual_first_name: string | null;
    url: string;              // Profile URL
    phone: string;
    displayname: string;
    image: {
        link: string;         // Profile picture URL
        versions: {
            large: string;
            medium: string;
            small: string;
            micro: string;
        };
    };
    'staff?': boolean;        // Is staff member
    correction_point: number;
    pool_month: string;       // "july"
    pool_year: string;        // "2023"
    location: string | null;  // Current campus location
    wallet: number;
    anonymize_date: string;
    dataErasure_date: string;
    created_at: string;       // ISO date
    updated_at: string;       // ISO date
    alumnized_at: string | null;
    'alumni?': boolean;
    'active?': boolean;
    // ... many more fields available
}
```

### 2. Google OAuth

#### Configuration

```typescript
// src/lib/server/oauth/providers/google.ts

export const googleConfig = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${env.PUBLIC_APP_URL}/login/google/callback`,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile']
};
```

#### Google User Data Structure

```typescript
interface GoogleUser {
    id: string;               // Google user ID
    email: string;
    verified_email: boolean;  // Email verified by Google
    name: string;            // Full name
    given_name: string;      // First name
    family_name: string;     // Last name
    picture: string;         // Profile picture URL
    locale: string;          // Language preference
}
```

### 3. GitHub OAuth

#### Configuration

```typescript
// src/lib/server/oauth/providers/github.ts

export const githubConfig = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    redirectUri: `${env.PUBLIC_APP_URL}/login/github/callback`,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    userEmailUrl: 'https://api.github.com/user/emails',
    scopes: ['read:user', 'user:email']
};
```

#### GitHub User Data Structure

```typescript
interface GitHubUser {
    id: number;
    login: string;            // GitHub username
    avatar_url: string;
    name: string | null;
    email: string | null;     // May be null (private)
    bio: string | null;
    location: string | null;
    blog: string;
    company: string | null;
    created_at: string;
    updated_at: string;
}

// If email is null, fetch from emails endpoint
interface GitHubEmail {
    email: string;
    primary: boolean;
    verified: boolean;
    visibility: string | null;
}
```

### Provider Abstraction

```typescript
// src/lib/server/oauth/provider.interface.ts

export interface OAuthProvider {
    name: string;
    getAuthorizationUrl(state: string): string;
    exchangeCodeForToken(code: string): Promise<OAuthToken>;
    getUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

export interface OAuthToken {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    tokenType: string;
    scope: string;
}

export interface OAuthUserInfo {
    providerId: string;        // Provider's unique ID for user
    email: string;
    emailVerified: boolean;
    name: string;
    username: string;
    avatarUrl: string;
    providerData: Record<string, any>;  // Raw data from provider
}

// Usage example
const provider = getProvider('intra_42');
const authUrl = provider.getAuthorizationUrl(state);
const token = await provider.exchangeCodeForToken(code);
const userInfo = await provider.getUserInfo(token.accessToken);
```

---

## Database Schema for OAuth

### New Tables Required

#### 1. `oauth_accounts` Table

```typescript
// src/lib/server/db/schema/oauth-accounts.ts

export const oauthAccounts = pgTable('oauth_accounts', {
    // Composite primary key (provider + providerUserId)
    provider: text('provider').notNull(),  // 'intra_42', 'google', 'github'
    providerUserId: text('provider_user_id').notNull(),  // Provider's ID for user
    
    // Link to your user
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    
    // OAuth tokens (ENCRYPTED!)
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at'),
    
    // Token scopes granted
    scope: text('scope'),
    
    // OAuth token type
    tokenType: text('token_type').default('Bearer'),
    
    // Raw provider data (JSON)
    providerData: jsonb('provider_data'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.provider, table.providerUserId] }),
    
    // Index for lookups by user
    userIdIdx: index('oauth_accounts_user_id_idx').on(table.userId),
    
    // Index for provider lookups
    providerIdx: index('oauth_accounts_provider_idx').on(table.provider),
}));
```

**Why This Schema?**

1. **Composite Primary Key**: A user can have only ONE account per provider
2. **Foreign Key to Users**: Links OAuth account to your user
3. **Cascade Delete**: Delete OAuth accounts when user deleted
4. **Encrypted Tokens**: Store access/refresh tokens securely
5. **Provider Data**: Store raw response for debugging/analytics
6. **Indexes**: Fast lookups by user or provider

#### 2. Updated `users` Table

```typescript
// src/lib/server/db/schema/users.ts

export const users = pgTable('users', {
    id: text('id').primaryKey(),
    username: text('username').unique().notNull(),
    email: text('email').unique().notNull(),
    emailVerified: boolean('email_verified').default(false),
    
    // Make password optional (for OAuth-only users)
    hashedPassword: text('hashed_password'),  // No .notNull()!
    
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    role: text('role', { enum: ['user', 'admin'] }).default('user'),
    status: text('status', { enum: ['active', 'banned', 'suspended'] }).default('active'),
    
    // OAuth metadata
    primaryAuthMethod: text('primary_auth_method', {
        enum: ['local', 'oauth']
    }).default('local'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at'),
});
```

**Important Changes:**

1. **hashedPassword is now optional**: OAuth users don't have passwords
2. **primaryAuthMethod**: Track how user usually logs in
3. **Validation must change**: Don't require password if OAuth user

#### 3. Database Relationships

```typescript
// One user can have multiple OAuth accounts
export const usersRelations = relations(users, ({ many }) => ({
    oauthAccounts: many(oauthAccounts),
    sessions: many(sessions),
    // ... other relations
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
    user: one(users, {
        fields: [oauthAccounts.userId],
        references: [users.id],
    }),
}));
```

### Migration Strategy

```sql
-- Migration: Add OAuth support

-- 1. Create oauth_accounts table
CREATE TABLE oauth_accounts (
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,  -- Will be encrypted in app
    refresh_token TEXT,
    expires_at TIMESTAMP,
    scope TEXT,
    token_type TEXT DEFAULT 'Bearer',
    provider_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (provider, provider_user_id)
);

-- 2. Add indexes
CREATE INDEX oauth_accounts_user_id_idx ON oauth_accounts(user_id);
CREATE INDEX oauth_accounts_provider_idx ON oauth_accounts(provider);

-- 3. Modify users table
ALTER TABLE users 
    ALTER COLUMN hashed_password DROP NOT NULL,
    ADD COLUMN primary_auth_method TEXT DEFAULT 'local'
        CHECK (primary_auth_method IN ('local', 'oauth'));

-- 4. Update existing users
UPDATE users SET primary_auth_method = 'local' WHERE hashed_password IS NOT NULL;
```

---

## Security Considerations

### 1. State Parameter (CSRF Protection)

```typescript
// CRITICAL: Prevent CSRF attacks

// Step 1: Generate state before redirect
import { generateState } from 'oslo/oauth2';

const state = generateState();

// Store in cookie (encrypted, httpOnly)
cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 10,  // 10 minutes
    path: '/'
});

// Redirect to provider
const authUrl = `${provider.authorizationUrl}?` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `state=${state}&` +  // ← CRITICAL!
    `scope=${scopes.join(' ')}`;

return redirect(302, authUrl);

// Step 2: Validate state in callback
const stateFromProvider = url.searchParams.get('state');
const stateFromCookie = cookies.get('oauth_state');

if (!stateFromProvider || stateFromProvider !== stateFromCookie) {
    // 🚨 CSRF attack detected!
    throw error(400, 'Invalid state parameter');
}

// Clear state cookie after use
cookies.delete('oauth_state', { path: '/' });
```

**Why State Parameter Matters:**

```
Attack Without State:
1. Attacker creates account on your site
2. Attacker starts OAuth flow, gets authorization code
3. Attacker sends victim to: yoursite.com/callback?code=ATTACKER_CODE
4. Victim's session gets linked to attacker's account
5. Attacker can now see victim's data!

Defense With State:
1. Each OAuth flow has unique random state
2. State stored in victim's browser (cookie)
3. Attacker's code has different state
4. Your server rejects mismatched state
5. Attack prevented! ✅
```

### 2. Token Security

```typescript
// NEVER store tokens in plain text!

import crypto from 'crypto';

// Encryption key (store in environment variable)
const ENCRYPTION_KEY = env.OAUTH_TOKEN_ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedToken: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

// Usage
const encryptedAccessToken = encryptToken(accessToken);
await db.insert(oauthAccounts).values({
    accessToken: encryptedAccessToken,  // Encrypted!
    refreshToken: encryptToken(refreshToken),
    // ...
});

// Later, when needed
const encryptedToken = await db.query.oauthAccounts.findFirst(...);
const decryptedToken = decryptToken(encryptedToken.accessToken);
// Use for API calls
```

### 3. Client Secret Protection

```
❌ NEVER commit client secrets to git
❌ NEVER expose client secrets to frontend
❌ NEVER log client secrets
✅ ALWAYS store in environment variables
✅ ALWAYS validate on server-side only
✅ ALWAYS rotate secrets periodically
```

```typescript
// .env (NEVER commit this file!)
INTRA_42_CLIENT_SECRET=super_secret_value_here
GOOGLE_CLIENT_SECRET=another_secret_value
GITHUB_CLIENT_SECRET=yet_another_secret

// .gitignore (MUST include .env!)
.env
.env.local
.env.*.local
```

### 4. Redirect URI Validation

```typescript
// Validate redirect URI to prevent open redirects

const ALLOWED_REDIRECT_URIS = [
    'http://localhost:5173/login/42/callback',      // Dev
    'https://yourdomain.com/login/42/callback',     // Prod
    'https://www.yourdomain.com/login/42/callback', // Prod (www)
];

function validateRedirectUri(uri: string): boolean {
    return ALLOWED_REDIRECT_URIS.includes(uri);
}

// In OAuth configuration
export const intra42Config = {
    // ...
    redirectUri: (() => {
        const uri = `${env.PUBLIC_APP_URL}/login/42/callback`;
        if (!validateRedirectUri(uri)) {
            throw new Error('Invalid redirect URI configuration');
        }
        return uri;
    })(),
};
```

### 5. Account Takeover Prevention

```typescript
// Scenario: User has email user@example.com
//           Tries to link OAuth with different email

export async function handleOAuthCallback(
    provider: string,
    providerUserId: string,
    providerEmail: string,
    locals: App.Locals
) {
    // Case 1: User is logged in (account linking)
    if (locals.user) {
        // Verify email matches (optional but recommended)
        if (locals.user.email !== providerEmail) {
            // Emails don't match - ask for confirmation
            return {
                type: 'email_mismatch',
                message: `OAuth account email (${providerEmail}) doesn't match your account email (${locals.user.email})`,
                requireConfirmation: true
            };
        }
        
        // Check if this OAuth account is already linked
        const existingLink = await db.query.oauthAccounts.findFirst({
            where: and(
                eq(oauthAccounts.provider, provider),
                eq(oauthAccounts.providerUserId, providerUserId)
            )
        });
        
        if (existingLink) {
            if (existingLink.userId !== locals.user.id) {
                // This OAuth account is linked to a different user!
                throw error(400, 'This account is already linked to another user');
            }
            // Already linked to this user, just update tokens
            await updateOAuthTokens(existingLink);
        } else {
            // Link new OAuth account
            await linkOAuthAccount(locals.user.id, provider, ...);
        }
        
        return { type: 'linked', redirectTo: '/settings/connections' };
    }
    
    // Case 2: User is NOT logged in (OAuth login)
    const existingOAuth = await findOAuthAccount(provider, providerUserId);
    
    if (existingOAuth) {
        // OAuth account exists, log in
        const user = await findUserById(existingOAuth.userId);
        await createSession(user.id);
        return { type: 'login', user };
    }
    
    // Case 3: New OAuth account, check if email exists
    const existingUser = await findUserByEmail(providerEmail);
    
    if (existingUser) {
        // Email exists but not linked to this OAuth provider
        // Security decision: Auto-link or require confirmation?
        
        // Option A: Auto-link (convenient but less secure)
        // await linkOAuthAccount(existingUser.id, provider, ...);
        // return { type: 'login', user: existingUser };
        
        // Option B: Require login first (more secure) ✅
        return {
            type: 'email_exists',
            message: 'An account with this email already exists. Please log in first to link accounts.',
            redirectTo: '/login'
        };
    }
    
    // Case 4: New user, create account
    const newUser = await createUserFromOAuth({
        email: providerEmail,
        username: generateUsername(providerEmail),
        displayName: providerName,
        avatarUrl: providerAvatar,
        emailVerified: true,  // Provider verified
        primaryAuthMethod: 'oauth'
    });
    
    await linkOAuthAccount(newUser.id, provider, ...);
    await createSession(newUser.id);
    
    return { type: 'register', user: newUser };
}
```

### 6. Token Refresh Strategy

```typescript
// Access tokens expire, use refresh tokens to get new ones

export async function refreshAccessToken(
    userId: string,
    provider: string
): Promise<string> {
    const oauthAccount = await db.query.oauthAccounts.findFirst({
        where: and(
            eq(oauthAccounts.userId, userId),
            eq(oauthAccounts.provider, provider)
        )
    });
    
    if (!oauthAccount || !oauthAccount.refreshToken) {
        throw new Error('No refresh token available');
    }
    
    // Check if token is expired
    if (oauthAccount.expiresAt && oauthAccount.expiresAt > new Date()) {
        // Token still valid
        return decryptToken(oauthAccount.accessToken);
    }
    
    // Token expired, refresh it
    const providerConfig = getProviderConfig(provider);
    
    const response = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: decryptToken(oauthAccount.refreshToken),
            client_id: providerConfig.clientId,
            client_secret: providerConfig.clientSecret,
        }),
    });
    
    if (!response.ok) {
        // Refresh failed, user must re-authenticate
        throw new Error('Token refresh failed');
    }
    
    const tokens = await response.json();
    
    // Update stored tokens
    await db.update(oauthAccounts)
        .set({
            accessToken: encryptToken(tokens.access_token),
            refreshToken: tokens.refresh_token 
                ? encryptToken(tokens.refresh_token)
                : oauthAccount.refreshToken,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            updatedAt: new Date(),
        })
        .where(and(
            eq(oauthAccounts.userId, userId),
            eq(oauthAccounts.provider, provider)
        ));
    
    return tokens.access_token;
}

// Usage
const accessToken = await refreshAccessToken(user.id, 'intra_42');
// Use fresh token for API calls
```

---

## Implementation Strategy

### Phase 1: Foundation (No Code Yet - Just Tests!)

```typescript
// tests/oauth/oauth-provider.test.ts

describe('OAuth Provider Interface', () => {
    it('should generate valid authorization URL', () => {
        const provider = getProvider('intra_42');
        const state = 'random_state_123';
        const url = provider.getAuthorizationUrl(state);
        
        expect(url).toContain('https://api.intra.42.fr/oauth/authorize');
        expect(url).toContain('client_id=');
        expect(url).toContain('redirect_uri=');
        expect(url).toContain('state=random_state_123');
        expect(url).toContain('response_type=code');
    });
    
    it('should exchange code for token', async () => {
        const provider = getProvider('intra_42');
        const code = 'test_authorization_code';
        
        // Mock API response
        mockFetch({
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 7200,
            token_type: 'Bearer'
        });
        
        const token = await provider.exchangeCodeForToken(code);
        
        expect(token.accessToken).toBe('mock_access_token');
        expect(token.refreshToken).toBe('mock_refresh_token');
        expect(token.expiresIn).toBe(7200);
    });
    
    it('should fetch user info', async () => {
        const provider = getProvider('intra_42');
        
        mockFetch({
            id: 12345,
            email: 'student@student.42.fr',
            login: 'student',
            first_name: 'John',
            last_name: 'Doe'
        });
        
        const userInfo = await provider.getUserInfo('mock_token');
        
        expect(userInfo.providerId).toBe('12345');
        expect(userInfo.email).toBe('student@student.42.fr');
        expect(userInfo.username).toBe('student');
    });
});
```

### Phase 2: Database Schema

```typescript
// tests/oauth/oauth-schema.test.ts

describe('OAuth Database Schema', () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });
    
    it('should create oauth_accounts table', async () => {
        const tableExists = await db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'oauth_accounts'
            );
        `);
        
        expect(tableExists.rows[0].exists).toBe(true);
    });
    
    it('should link OAuth account to user', async () => {
        const user = await createTestUser();
        
        const [oauthAccount] = await db.insert(oauthAccounts).values({
            provider: 'intra_42',
            providerUserId: '12345',
            userId: user.id,
            accessToken: encryptToken('mock_token'),
            refreshToken: encryptToken('mock_refresh'),
            expiresAt: new Date(Date.now() + 7200 * 1000),
            scope: 'public',
        }).returning();
        
        expect(oauthAccount.userId).toBe(user.id);
        expect(oauthAccount.provider).toBe('intra_42');
    });
    
    it('should enforce unique provider + providerUserId', async () => {
        const user = await createTestUser();
        
        await db.insert(oauthAccounts).values({
            provider: 'intra_42',
            providerUserId: '12345',
            userId: user.id,
            accessToken: encryptToken('token1'),
        });
        
        // Try to insert duplicate
        await expect(
            db.insert(oauthAccounts).values({
                provider: 'intra_42',
                providerUserId: '12345',  // Same provider + ID
                userId: user.id,
                accessToken: encryptToken('token2'),
            })
        ).rejects.toThrow();
    });
    
    it('should cascade delete OAuth accounts when user deleted', async () => {
        const user = await createTestUser();
        
        await db.insert(oauthAccounts).values({
            provider: 'intra_42',
            providerUserId: '12345',
            userId: user.id,
            accessToken: encryptToken('token'),
        });
        
        // Delete user
        await db.delete(users).where(eq(users.id, user.id));
        
        // OAuth account should be gone
        const accounts = await db.select()
            .from(oauthAccounts)
            .where(eq(oauthAccounts.userId, user.id));
        
        expect(accounts).toHaveLength(0);
    });
    
    it('should allow user to have multiple OAuth providers', async () => {
        const user = await createTestUser();
        
        await db.insert(oauthAccounts).values([
            {
                provider: 'intra_42',
                providerUserId: '12345',
                userId: user.id,
                accessToken: encryptToken('token1'),
            },
            {
                provider: 'google',
                providerUserId: '67890',
                userId: user.id,
                accessToken: encryptToken('token2'),
            }
        ]);
        
        const accounts = await db.select()
            .from(oauthAccounts)
            .where(eq(oauthAccounts.userId, user.id));
        
        expect(accounts).toHaveLength(2);
    });
});
```

### Phase 3: Security Tests

```typescript
// tests/oauth/oauth-security.test.ts

describe('OAuth Security', () => {
    describe('State Parameter Validation', () => {
        it('should reject callback without state', async () => {
            const response = await fetch('/login/42/callback?code=abc123');
            expect(response.status).toBe(400);
        });
        
        it('should reject callback with invalid state', async () => {
            // Set valid state in cookie
            cookies.set('oauth_state', 'valid_state');
            
            // Send different state in URL
            const response = await fetch(
                '/login/42/callback?code=abc123&state=invalid_state'
            );
            
            expect(response.status).toBe(400);
        });
        
        it('should accept callback with valid state', async () => {
            cookies.set('oauth_state', 'valid_state');
            
            mockOAuthExchange();  // Mock successful token exchange
            
            const response = await fetch(
                '/login/42/callback?code=abc123&state=valid_state'
            );
            
            expect(response.status).toBe(302);  // Redirect to dashboard
        });
    });
    
    describe('Token Encryption', () => {
        it('should encrypt access tokens before storage', async () => {
            const plainToken = 'sensitive_access_token';
            const encrypted = encryptToken(plainToken);
            
            expect(encrypted).not.toBe(plainToken);
            expect(encrypted).toContain(':');  // iv:authTag:encrypted format
        });
        
        it('should decrypt tokens correctly', () => {
            const plainToken = 'sensitive_access_token';
            const encrypted = encryptToken(plainToken);
            const decrypted = decryptToken(encrypted);
            
            expect(decrypted).toBe(plainToken);
        });
        
        it('should fail decryption with wrong key', () => {
            const encrypted = encryptToken('token');
            
            // Change encryption key
            process.env.OAUTH_TOKEN_ENCRYPTION_KEY = 'wrong_key';
            
            expect(() => decryptToken(encrypted)).toThrow();
        });
    });
    
    describe('Account Linking Security', () => {
        it('should prevent linking OAuth account already linked to another user', async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            
            // Link OAuth to user1
            await linkOAuthAccount(user1.id, 'intra_42', '12345');
            
            // Try to link same OAuth to user2
            await expect(
                linkOAuthAccount(user2.id, 'intra_42', '12345')
            ).rejects.toThrow('already linked');
        });
        
        it('should allow user to link multiple providers', async () => {
            const user = await createTestUser();
            
            await linkOAuthAccount(user.id, 'intra_42', '12345');
            await linkOAuthAccount(user.id, 'google', '67890');
            
            const accounts = await getUserOAuthAccounts(user.id);
            expect(accounts).toHaveLength(2);
        });
    });
});
```

### Phase 4: Integration Tests

```typescript
// tests/oauth/oauth-flow.test.ts

describe('OAuth Flow Integration', () => {
    describe('42 Intra OAuth', () => {
        it('should complete full OAuth login flow', async () => {
            // Step 1: Start OAuth flow
            const initiateResponse = await fetch('/login/42');
            expect(initiateResponse.status).toBe(302);
            
            const redirectUrl = new URL(initiateResponse.headers.get('location'));
            expect(redirectUrl.hostname).toBe('api.intra.42.fr');
            expect(redirectUrl.searchParams.get('client_id')).toBeTruthy();
            
            const state = redirectUrl.searchParams.get('state');
            expect(state).toBeTruthy();
            
            // Step 2: Mock callback from 42
            const code = 'mock_authorization_code';
            
            mockFetch42TokenExchange({
                access_token: 'mock_access_token',
                refresh_token: 'mock_refresh_token',
                expires_in: 7200
            });
            
            mockFetch42UserInfo({
                id: 12345,
                email: 'student@student.42.fr',
                login: 'student',
                first_name: 'John',
                last_name: 'Doe',
                image: { link: 'https://cdn.intra.42.fr/users/student.jpg' }
            });
            
            // Step 3: Handle callback
            cookies.set('oauth_state', state);
            const callbackResponse = await fetch(
                `/login/42/callback?code=${code}&state=${state}`
            );
            
            expect(callbackResponse.status).toBe(302);
            expect(callbackResponse.headers.get('location')).toBe('/dashboard');
            
            // Step 4: Verify user created
            const user = await db.query.users.findFirst({
                where: eq(users.email, 'student@student.42.fr')
            });
            
            expect(user).toBeTruthy();
            expect(user.username).toBe('student');
            expect(user.emailVerified).toBe(true);
            expect(user.primaryAuthMethod).toBe('oauth');
            
            // Step 5: Verify OAuth account linked
            const oauthAccount = await db.query.oauthAccounts.findFirst({
                where: and(
                    eq(oauthAccounts.provider, 'intra_42'),
                    eq(oauthAccounts.providerUserId, '12345')
                )
            });
            
            expect(oauthAccount).toBeTruthy();
            expect(oauthAccount.userId).toBe(user.id);
            
            // Step 6: Verify session created
            const sessionCookie = cookies.get('session');
            expect(sessionCookie).toBeTruthy();
        });
        
        it('should handle existing user login', async () => {
            // Create user with OAuth account
            const user = await createTestUser();
            await linkOAuthAccount(user.id, 'intra_42', '12345');
            
            // Start OAuth flow
            const { state } = await initiateOAuthFlow('intra_42');
            
            // Mock callback
            mockFetch42TokenExchange();
            mockFetch42UserInfo({ id: 12345, email: user.email });
            
            cookies.set('oauth_state', state);
            const response = await fetch(
                `/login/42/callback?code=code&state=${state}`
            );
            
            expect(response.status).toBe(302);
            
            // Should log in existing user, not create new one
            const userCount = await db.select({ count: sql`count(*)` })
                .from(users);
            
            expect(userCount[0].count).toBe(1);
        });
        
        it('should link OAuth account for logged-in user', async () => {
            // User already logged in
            const user = await createTestUser();
            await loginAs(user);
            
            // Start OAuth flow
            const { state } = await initiateOAuthFlow('intra_42');
            
            // Mock callback
            mockFetch42TokenExchange();
            mockFetch42UserInfo({ 
                id: 12345, 
                email: user.email  // Same email as logged-in user
            });
            
            cookies.set('oauth_state', state);
            const response = await fetch(
                `/login/42/callback?code=code&state=${state}`
            );
            
            expect(response.status).toBe(302);
            expect(response.headers.get('location')).toBe('/settings/connections');
            
            // Verify OAuth account linked
            const oauthAccount = await db.query.oauthAccounts.findFirst({
                where: and(
                    eq(oauthAccounts.userId, user.id),
                    eq(oauthAccounts.provider, 'intra_42')
                )
            });
            
            expect(oauthAccount).toBeTruthy();
        });
    });
});
```

### Phase 5: E2E Tests

```typescript
// e2e/oauth.test.ts

import { test, expect } from '@playwright/test';

test.describe('OAuth Authentication E2E', () => {
    test('user can login with 42', async ({ page, context }) => {
        // Navigate to login page
        await page.goto('/login');
        
        // Click "Login with 42" button
        await page.click('button:has-text("Login with 42")');
        
        // Should redirect to 42 OAuth page
        await expect(page).toHaveURL(/api\.intra\.42\.fr\/oauth\/authorize/);
        
        // Mock 42 login (in real test, you'd use test credentials)
        await page.fill('input[name="email"]', 'test@student.42.fr');
        await page.fill('input[name="password"]', 'test_password');
        await page.click('button[type="submit"]');
        
        // Authorize application
        await page.click('button:has-text("Authorize")');
        
        // Should redirect back to your app
        await expect(page).toHaveURL('/dashboard');
        
        // User should be logged in
        await expect(page.locator('text=Welcome')).toBeVisible();
        
        // Check profile shows 42 data
        await page.goto('/profile');
        await expect(page.locator('img[alt="Profile picture"]')).toBeVisible();
    });
    
    test('user can link 42 account to existing account', async ({ page }) => {
        // First, register with email/password
        await page.goto('/register');
        await page.fill('input[name="email"]', 'user@example.com');
        await page.fill('input[name="password"]', 'SecurePass123!');
        await page.click('button[type="submit"]');
        
        // Go to settings
        await page.goto('/settings/connections');
        
        // Click "Connect 42 Account"
        await page.click('button:has-text("Connect 42 Account")');
        
        // Complete OAuth flow (mocked)
        // ...
        
        // Should show success message
        await expect(page.locator('text=42 account linked')).toBeVisible();
        
        // Should show as connected
        await expect(page.locator('text=✅ 42 Intra')).toBeVisible();
        
        // Logout and try logging in with 42
        await page.click('button:has-text("Logout")');
        await page.goto('/login');
        await page.click('button:has-text("Login with 42")');
        
        // Should login to same account
        await expect(page).toHaveURL('/dashboard');
        await page.goto('/profile');
        await expect(page.locator('text=user@example.com')).toBeVisible();
    });
    
    test('cannot link 42 account already used by another user', async ({ page, context }) => {
        // User 1 links 42 account
        // ...
        
        // Logout
        await page.click('button:has-text("Logout")');
        
        // User 2 tries to link same 42 account
        await page.goto('/register');
        await page.fill('input[name="email"]', 'other@example.com');
        await page.fill('input[name="password"]', 'SecurePass123!');
        await page.click('button[type="submit"]');
        
        await page.goto('/settings/connections');
        await page.click('button:has-text("Connect 42 Account")');
        
        // Should show error
        await expect(page.locator('text=already linked to another user')).toBeVisible();
    });
});
```

---

## Common Pitfalls

### ❌ Pitfall 1: Exposing Client Secret

```typescript
// ❌ BAD - Client secret in frontend code
<script>
const OAUTH_CONFIG = {
    clientId: 'public_id',
    clientSecret: 'super_secret_key',  // LEAKED! 🚨
};
</script>

// ✅ GOOD - Secret only on server
// src/lib/server/oauth/config.ts (server-only file)
import { env } from '$env/dynamic/private';

export const oauthConfig = {
    clientId: env.INTRA_42_CLIENT_ID,      // OK to expose
    clientSecret: env.INTRA_42_CLIENT_SECRET,  // Never sent to client
};
```

### ❌ Pitfall 2: Not Validating State

```typescript
// ❌ BAD - No CSRF protection
export async function GET({ url }) {
    const code = url.searchParams.get('code');
    // Missing state validation! 🚨
    const tokens = await exchangeCodeForToken(code);
}

// ✅ GOOD - Validate state
export async function GET({ url, cookies }) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = cookies.get('oauth_state');
    
    if (!state || state !== storedState) {
        throw error(400, 'Invalid state parameter');
    }
    
    cookies.delete('oauth_state', { path: '/' });
    const tokens = await exchangeCodeForToken(code);
}
```

### ❌ Pitfall 3: Storing Tokens in Plain Text

```typescript
// ❌ BAD - Plain text tokens
await db.insert(oauthAccounts).values({
    accessToken: 'plain_text_token',  // Visible in DB! 🚨
});

// ✅ GOOD - Encrypted tokens
await db.insert(oauthAccounts).values({
    accessToken: encryptToken('plain_text_token'),
    refreshToken: encryptToken('refresh_token'),
});
```

### ❌ Pitfall 4: Not Handling Email Conflicts

```typescript
// ❌ BAD - Duplicate users
export async function handleOAuthCallback(oauthEmail: string) {
    // User already exists with this email
    // But OAuth creates new user anyway! 🚨
    const user = await createUser({ email: oauthEmail });
}

// ✅ GOOD - Check for existing email
export async function handleOAuthCallback(oauthEmail: string) {
    const existingUser = await findUserByEmail(oauthEmail);
    
    if (existingUser) {
        // Email exists - require login first
        return redirect(302, '/login?message=email_exists');
    }
    
    const user = await createUser({ email: oauthEmail });
}
```

### ❌ Pitfall 5: Ignoring Token Expiration

```typescript
// ❌ BAD - Using expired token
const oauthAccount = await getOAuthAccount(userId, 'intra_42');
const response = await fetch('https://api.intra.42.fr/v2/me', {
    headers: {
        Authorization: `Bearer ${oauthAccount.accessToken}`
    }
});
// 401 Unauthorized! 🚨

// ✅ GOOD - Check expiration and refresh
async function getValidAccessToken(userId: string, provider: string) {
    const oauthAccount = await getOAuthAccount(userId, provider);
    
    if (oauthAccount.expiresAt && oauthAccount.expiresAt <= new Date()) {
        // Token expired, refresh it
        return await refreshAccessToken(userId, provider);
    }
    
    return decryptToken(oauthAccount.accessToken);
}

const accessToken = await getValidAccessToken(userId, 'intra_42');
const response = await fetch('https://api.intra.42.fr/v2/me', {
    headers: {
        Authorization: `Bearer ${accessToken}`
    }
});
```

### ❌ Pitfall 6: Not Handling OAuth Errors

```typescript
// ❌ BAD - No error handling
export async function GET({ url }) {
    const code = url.searchParams.get('code');
    const tokens = await exchangeCodeForToken(code);  // What if this fails?
}

// ✅ GOOD - Handle all error cases
export async function GET({ url, cookies }) {
    // Handle user denied authorization
    const error = url.searchParams.get('error');
    if (error) {
        const errorDescription = url.searchParams.get('error_description');
        
        if (error === 'access_denied') {
            return redirect(302, '/login?message=oauth_denied');
        }
        
        console.error('OAuth error:', error, errorDescription);
        return redirect(302, '/login?message=oauth_error');
    }
    
    const code = url.searchParams.get('code');
    if (!code) {
        throw error(400, 'Missing authorization code');
    }
    
    try {
        const tokens = await exchangeCodeForToken(code);
        const userInfo = await getUserInfo(tokens.accessToken);
        // ... rest of flow
    } catch (err) {
        console.error('OAuth flow failed:', err);
        return redirect(302, '/login?message=oauth_failed');
    }
}
```

---

## Testing OAuth

### Mocking OAuth Providers

```typescript
// tests/mocks/oauth-mock.ts

export function mockFetch42TokenExchange(tokens?: Partial<OAuthToken>) {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('api.intra.42.fr/oauth/token')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    access_token: tokens?.accessToken || 'mock_access_token',
                    refresh_token: tokens?.refreshToken || 'mock_refresh_token',
                    expires_in: tokens?.expiresIn || 7200,
                    token_type: 'Bearer',
                    scope: 'public',
                    created_at: Date.now() / 1000,
                }),
            });
        }
        return Promise.reject(new Error('Unexpected URL'));
    });
}

export function mockFetch42UserInfo(user?: Partial<Intra42User>) {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('api.intra.42.fr/v2/me')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    id: user?.id || 12345,
                    email: user?.email || 'test@student.42.fr',
                    login: user?.login || 'testuser',
                    first_name: user?.first_name || 'Test',
                    last_name: user?.last_name || 'User',
                    usual_full_name: user?.usual_full_name || 'Test User',
                    image: {
                        link: user?.image?.link || 'https://cdn.intra.42.fr/users/default.jpg',
                    },
                }),
            });
        }
        return Promise.reject(new Error('Unexpected URL'));
    });
}
```

### Test Environment Setup

```typescript
// vitest.setup.ts

import { beforeAll, afterAll, beforeEach } from 'vitest';

beforeAll(async () => {
    // Set up test OAuth credentials
    process.env.INTRA_42_CLIENT_ID = 'test_client_id';
    process.env.INTRA_42_CLIENT_SECRET = 'test_client_secret';
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = 'test_encryption_key_32_bytes!!';
    process.env.PUBLIC_APP_URL = 'http://localhost:5173';
});

beforeEach(() => {
    // Reset fetch mocks
    vi.restoreAllMocks();
});

afterAll(async () => {
    // Cleanup
});
```

---

## Implementation Checklist

### Phase 1: Documentation & Planning ✅
- [x] Read OAuth 2.0 specification
- [x] Understand OAuth flow diagrams
- [x] Plan database schema
- [x] Review security considerations
- [x] Set up test environment

### Phase 2: Database Schema (Test First!)
- [ ] **Write schema tests**
  - [ ] Test oauth_accounts table creation
  - [ ] Test composite primary key
  - [ ] Test foreign key relationships
  - [ ] Test cascade deletes
  - [ ] Test unique constraints
  
- [ ] **Create migration**
  - [ ] Add oauth_accounts table
  - [ ] Modify users table (optional password)
  - [ ] Add indexes
  - [ ] Test migration rollback

### Phase 3: Provider Abstraction (Test First!)
- [ ] **Write provider interface tests**
  - [ ] Test authorization URL generation
  - [ ] Test token exchange
  - [ ] Test user info fetching
  - [ ] Test error handling
  
- [ ] **Implement provider interface**
  - [ ] Create OAuthProvider interface
  - [ ] Implement 42 Intra provider
  - [ ] Implement Google provider (optional)
  - [ ] Implement GitHub provider (optional)

### Phase 4: Security Layer (Test First!)
- [ ] **Write security tests**
  - [ ] Test state generation and validation
  - [ ] Test token encryption/decryption
  - [ ] Test CSRF protection
  - [ ] Test redirect URI validation
  
- [ ] **Implement security**
  - [ ] State parameter handling
  - [ ] Token encryption utilities
  - [ ] Client secret protection
  - [ ] Error sanitization

### Phase 5: OAuth Flow (Test First!)
- [ ] **Write OAuth flow tests**
  - [ ] Test initiate OAuth flow
  - [ ] Test callback handling
  - [ ] Test token exchange
  - [ ] Test user creation/login
  - [ ] Test account linking
  
- [ ] **Implement OAuth routes**
  - [ ] GET /login/42
  - [ ] GET /login/42/callback
  - [ ] POST /settings/link-oauth
  - [ ] POST /settings/unlink-oauth

### Phase 6: UI Implementation
- [ ] **Create OAuth UI**
  - [ ] Login page OAuth buttons
  - [ ] Settings/Connections page
  - [ ] Loading states
  - [ ] Error messages
  - [ ] Success messages

### Phase 7: Integration Tests
- [ ] **Write integration tests**
  - [ ] Full OAuth login flow
  - [ ] Account linking flow
  - [ ] Account unlinking flow
  - [ ] Error scenarios
  
- [ ] **Run all tests**
  - [ ] Unit tests pass
  - [ ] Integration tests pass
  - [ ] E2E tests pass
  - [ ] No regressions

### Phase 8: Documentation
- [ ] **User documentation**
  - [ ] How to login with OAuth
  - [ ] How to link accounts
  - [ ] How to unlink accounts
  - [ ] Privacy implications
  
- [ ] **Developer documentation**
  - [ ] Provider setup guides
  - [ ] Environment variables
  - [ ] Testing guide
  - [ ] Troubleshooting

### Phase 9: Deployment
- [ ] **Configure production**
  - [ ] Set up OAuth apps on providers
  - [ ] Add production redirect URIs
  - [ ] Set environment variables
  - [ ] Test on staging
  
- [ ] **Security audit**
  - [ ] Review client secret storage
  - [ ] Review token encryption
  - [ ] Review state validation
  - [ ] Review error messages
  
- [ ] **Deploy**
  - [ ] Deploy to production
  - [ ] Monitor logs
  - [ ] Test all OAuth flows
  - [ ] Monitor error rates

---

## Key Takeaways

### 🎯 Core Principles

1. **Security First**: OAuth doesn't mean less security concerns
2. **State Parameter**: ALWAYS validate state (CSRF protection)
3. **Token Encryption**: NEVER store tokens in plain text
4. **Client Secret**: NEVER expose to frontend
5. **Test Everything**: OAuth bugs = security vulnerabilities
6. **Error Handling**: Fail gracefully, don't leak information

### 📚 Resources

- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [42 API Documentation](https://api.intra.42.fr/apidoc)
- [Lucia Auth OAuth Guide](https://lucia-auth.com/guides/oauth/)
- [OWASP OAuth Security](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)

### 🚀 Benefits of OAuth

- **User Experience**: One-click login, no passwords to remember
- **Security**: Delegated authentication to trusted providers
- **Verification**: Email addresses pre-verified
- **Profile Data**: Auto-populated user information
- **Social Features**: Access to social graph (with permissions)

### ⚠️ OAuth is NOT Magic

- You still manage sessions
- You still need authorization logic
- You still need secure token storage
- You still need proper error handling
- You still need thorough testing

---

**Next Steps:**
1. Review this document thoroughly
2. Understand OAuth 2.0 flow completely
3. Set up test infrastructure
4. Write tests for each feature BEFORE implementing
5. Implement features to pass tests
6. Run full test suite before committing
7. Set up CI/CD to test automatically

**Remember:** OAuth adds complexity. Take your time, test thoroughly, and prioritize security! 🔒
