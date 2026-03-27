# 🔐 OAuth Token Encryption Implementation Guide

**Date:** jan 2026  
**Status:** ✅ Production Ready  
**Version:** 1.0.0

---

## Quick Start

### 1. Environment Setup

Add to `.env`:
```bash
# AES-256-GCM encryption key (64 hex characters)
OAUTH_ENCRYPTION_KEY=69ef54fed05fff5ff9ed82f4802c459d442f821849375b2691c13ee01ace67d0

# GitHub OAuth (get from github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# 42 Intra OAuth (get from 42 API settings)
FORTYTWO_CLIENT_ID=your_client_id_here
FORTYTWO_CLIENT_SECRET=your_client_secret_here

# OAuth Redirect URI
PUBLIC_OAUTH_REDIRECT_URI=http://localhost:5173
```

### 2. Test the Implementation

```bash
# Run token encryption tests
npm test -- token-encryption.test.ts

# Run all tests
npm test
```

### 3. Basic Usage Example

```typescript
import {
  encryptToken,
  decryptToken,
  isTokenEncryptionConfigured
} from '$lib/server/auth/token-encryption';

import {
  storeOAuthToken,
  getOAuthAccount,
  hasOAuthAccount
} from '$lib/server/auth/oauth';

// In OAuth callback handler
const tokenData = await exchangeCodeForTokens(code);

// Store encrypted tokens
await storeOAuthToken(
  'github',                      // provider
  githubUser.id.toString(),      // providerUserId
  localUserId,                   // userId
  tokenData.access_token,        // accessToken (encrypted before DB)
  tokenData.refresh_token,       // refreshToken (optional)
  new Date(tokenData.expires_in * 1000) // expiresAt
);

// Later: retrieve and decrypt for API calls
const account = await getOAuthAccount(localUserId, 'github');
const plainAccessToken = account.accessToken; // Already decrypted

// Use token for API calls
const response = await fetch('https://api.github.com/user', {
  headers: {
    Authorization: `Bearer ${plainAccessToken}`
  }
});
```

---

## Architecture Overview

### Security Layers

1. **Token Encryption** - AES-256-GCM (symmetric encryption)
2. **Database Storage** - Encrypted tokens stored as base64
3. **Secure Cookies** - httpOnly, sameSite=lax, secure in production
4. **HTTPS** - All OAuth redirects use secure transport
5. **Environment Variables** - Encryption key never committed to git

### Data Flow

```
OAuth Provider
     ↓ (redirects with code)
OAuth Callback Handler
     ↓ (exchanges code for tokens)
Token Encryption Module
     ↓ (AES-256-GCM encryption)
Database (oauth_accounts table)
     ↓ (encrypted tokens at rest)
[Later] Token Decryption Module
     ↓ (on-demand decryption)
API Request
```

---

## Module Reference

### Token Encryption (`token-encryption.ts`)

#### `encryptToken(token: string): Promise<string>`

Encrypts an OAuth token for database storage.

**Parameters:**
- `token` - Plain text OAuth token

**Returns:** Base64-encoded encrypted token

**Example:**
```typescript
const plainToken = 'gho_abc123...';
const encrypted = await encryptToken(plainToken);
// encrypted = "L3Z4K9Jx7pQ2..." (stored in DB)
```

**Security Notes:**
- Uses random IV each time (different ciphertext for same plaintext)
- Includes authentication tag (detects tampering)
- Throws error if token is empty

---

#### `decryptToken(encryptedToken: string): Promise<string>`

Decrypts OAuth token from database.

**Parameters:**
- `encryptedToken` - Base64-encoded encrypted token from DB

**Returns:** Original plain text token

**Example:**
```typescript
const encrypted = account.access_token; // from DB
const plainToken = await decryptToken(encrypted);
// plainToken = "gho_abc123..."
```

**Security Notes:**
- Validates authentication tag (detects corruption)
- Throws clear error if key changed (force re-auth)
- Never log the returned plaintext token

---

#### `isTokenEncryptionConfigured(): boolean`

Validates encryption is properly configured.

**Returns:**
- `true` - If OAUTH_ENCRYPTION_KEY is set and valid
- `false` - If key is missing or invalid format

**Example:**
```typescript
if (isTokenEncryptionConfigured()) {
  console.log('✅ Encryption ready');
} else {
  throw new Error('Setup OAUTH_ENCRYPTION_KEY in .env');
}
```

---

#### `isTokenValid(encryptedToken: string): Promise<boolean>`

Checks if token can be decrypted (without retrieving it).

**Example:**
```typescript
const valid = await isTokenValid(encrypted);
if (!valid) {
  // Token is corrupted, force re-auth
  await unlinkOAuthAccount(userId, 'github');
}
```

---

### OAuth Utilities (`oauth.ts`)

#### `storeOAuthToken(...): Promise<StoredOAuthToken>`

Store OAuth tokens in database with encryption.

**Parameters:**
```typescript
{
  provider: 'github' | '42',
  providerUserId: 'string',      // User ID from OAuth provider
  userId: number,                // Local user ID
  accessToken: string,           // Plain text (encrypted before DB)
  refreshToken: string | null,   // Plain text (optional)
  expiresAt: Date | null,        // Token expiration
  scope: string | null           // OAuth scopes granted
}
```

**Example:**
```typescript
await storeOAuthToken(
  'github',
  '12345678',
  localUserId,
  'gho_abcdef...',
  'ghr_refresh...',
  new Date(Date.now() + 3600000), // 1 hour
  'user:email,read:user'
);
```

---

#### `getOAuthAccount(userId: number, provider: string): Promise<StoredOAuthToken | null>`

Retrieve and decrypt OAuth account.

**Example:**
```typescript
const account = await getOAuthAccount(userId, 'github');
if (account) {
  console.log(account.accessToken); // Already decrypted
}
```

---

#### `hasOAuthAccount(userId: number, provider: string): Promise<boolean>`

Check if user has OAuth account linked.

**Example:**
```typescript
if (await hasOAuthAccount(userId, 'github')) {
  // Can use GitHub features
}
```

---

#### `getUserByOAuthAccount(provider: string, providerUserId: string): Promise<User | null>`

Get local user from OAuth provider account.

**Example:**
```typescript
const user = await getUserByOAuthAccount('github', '12345678');
if (!user) {
  // New user, create account
}
```

---

#### `updateOAuthTokens(...): Promise<void>`

Update tokens after refresh (e.g., refresh token grant flow).

**Example:**
```typescript
await updateOAuthTokens(
  userId,
  'github',
  newAccessToken,
  newRefreshToken,
  newExpiresAt
);
```

---

#### `unlinkOAuthAccount(userId: number, provider: string): Promise<boolean>`

Remove OAuth account link.

**Example:**
```typescript
const unlinked = await unlinkOAuthAccount(userId, 'github');
if (unlinked) {
  console.log('OAuth account removed');
}
```

---

#### `isTokenExpired(expiresAt: Date | null): boolean`

Check if token is expired (or expiring soon).

**Example:**
```typescript
const account = await getOAuthAccount(userId, 'github');
if (isTokenExpired(account.expiresAt)) {
  // Need to refresh token
  await refreshOAuthToken(userId, 'github');
}
```

---

## Database Schema

### `oauth_accounts` Table

```sql
CREATE TABLE oauth_accounts (
  provider TEXT NOT NULL,                        -- 'github', '42', etc
  provider_user_id TEXT NOT NULL,                -- User ID from provider
  user_id INTEGER NOT NULL REFERENCES users(id),
  access_token TEXT NOT NULL,                    -- ENCRYPTED token
  refresh_token TEXT,                            -- ENCRYPTED token (optional)
  expires_at TIMESTAMP WITH TIME ZONE,           -- Token expiration
  scope TEXT,                                    -- OAuth scopes granted
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW,
  last_refreshed_at TIMESTAMP WITH TIME ZONE,
  is_valid TEXT DEFAULT 'true',
  
  PRIMARY KEY (provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX oauth_accounts_user_id_idx (user_id),
  INDEX oauth_accounts_provider_idx (provider),
  INDEX oauth_accounts_expires_at_idx (expires_at)
);
```

---

## Usage Patterns

### Pattern 1: GitHub OAuth Callback

```typescript
// File: src/routes/(api)/auth/callback/github/+server.ts

import { redirect } from '@sveltejs/kit';
import { storeOAuthToken, getUserByOAuthAccount } from '$lib/server/auth/oauth';
import { lucia } from '$lib/server/auth/lucia';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Verify state (CSRF protection)
  const storedState = cookies.get('oauth_state');
  if (state !== storedState) {
    throw error(400, 'Invalid state');
  }
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  
  const { access_token, refresh_token, expires_in } = await tokenResponse.json();
  
  // Get user info from GitHub
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const githubUser = await userResponse.json();
  
  // Check if user exists
  let user = await getUserByOAuthAccount('github', githubUser.id.toString());
  
  if (!user) {
    // Create new user
    const [newUser] = await db.insert(users).values({
      username: githubUser.login,
      email: githubUser.email,
      name: githubUser.name,
      avatar_url: githubUser.avatar_url,
      password_hash: '' // OAuth users don't have password
    }).returning();
    user = newUser;
  }
  
  // Store encrypted OAuth tokens
  await storeOAuthToken(
    'github',
    githubUser.id.toString(),
    user.id,
    access_token,
    refresh_token || null,
    expires_in ? new Date(Date.now() + expires_in * 1000) : null,
    'user:email,read:user'
  );
  
  // Create session
  const session = await lucia.createSession(String(user.id), {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  
  cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '/',
    ...sessionCookie.attributes
  });
  
  redirect(302, '/dashboard');
};
```

### Pattern 2: Using Stored Tokens for API Calls

```typescript
// In any server function that needs GitHub API

import { getOAuthAccount, isTokenExpired } from '$lib/server/auth/oauth';

export async function getUserGitHubRepos(userId: number): Promise<Repo[]> {
  // Get and decrypt tokens
  const account = await getOAuthAccount(userId, 'github');
  
  if (!account) {
    throw new Error('GitHub account not linked');
  }
  
  // Check if token expired
  if (isTokenExpired(account.expiresAt)) {
    // Need to refresh (implement token refresh logic)
    throw new Error('Token expired, please reconnect GitHub');
  }
  
  // Use decrypted token for API call
  const response = await fetch('https://api.github.com/user/repos', {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  return response.json();
}
```

### Pattern 3: Error Handling

```typescript
try {
  const account = await getOAuthAccount(userId, 'github');
  const plainToken = account.accessToken; // Already decrypted
} catch (error) {
  if (error.message.includes('corrupted')) {
    // Token tampered with or key changed
    console.error('Security: Token corruption detected', { userId });
    
    // Force re-authentication
    await unlinkOAuthAccount(userId, 'github');
    return redirect(302, '/login');
  }
  
  throw error;
}
```

---

## Security Best Practices

### ✅ Do This

- [x] Keep `OAUTH_ENCRYPTION_KEY` in `.env` (never commit)
- [x] Use secrets management in production (AWS Secrets Manager, Vault, etc.)
- [x] Always encrypt tokens **before** database storage
- [x] Only decrypt tokens **when needed** for API calls
- [x] Validate CSRF state in OAuth callbacks
- [x] Use httpOnly, secure, sameSite cookies
- [x] Rotate encryption key periodically (every 90 days)
- [x] Log security events (corruption, failed decryption)
- [x] Monitor token refresh failures (may indicate attacks)

### ❌ Never Do This

- [ ] Commit `OAUTH_ENCRYPTION_KEY` to git
- [ ] Log or dump decrypted tokens
- [ ] Store plaintext tokens in database
- [ ] Share encryption key via email/chat
- [ ] Use same key for dev and production
- [ ] Ignore decryption errors
- [ ] Store tokens in browser localStorage
- [ ] Reuse OAuth state values (random per request)

---

## Testing

### Run Tests

```bash
# Token encryption tests
npm test -- token-encryption.test.ts

# All tests
npm test

# Specific test
npm test -- --grep "IV randomization"

# Watch mode
npm test -- --watch
```

### Manual Testing

```typescript
// Test roundtrip
import { encryptToken, decryptToken } from '$lib/server/auth/token-encryption';

const original = 'test_token_12345';
const encrypted = await encryptToken(original);
const decrypted = await decryptToken(encrypted);

console.assert(decrypted === original, 'Roundtrip failed!');
console.assert(encrypted !== original, 'Token not encrypted!');

// Test configuration
import { isTokenEncryptionConfigured } from '$lib/server/auth/token-encryption';

if (!isTokenEncryptionConfigured()) {
  throw new Error('Encryption not configured!');
}
```

---

## Troubleshooting

### Error: "OAUTH_ENCRYPTION_KEY not set"

**Solution:** Generate and add to `.env`

```bash
openssl rand -hex 32
```

Then add to `.env`:
```bash
OAUTH_ENCRYPTION_KEY=<generated_key>
```

### Error: "Failed to decrypt token"

**Possible Causes:**
1. Encryption key changed → Users must re-authenticate
2. Database corruption → Restore from backup
3. Token tampered with → Security incident

**Solution:**
```typescript
// Force user to re-authenticate
await unlinkOAuthAccount(userId, 'github');
return redirect(302, '/login/github');
```

### Error: "OAUTH_ENCRYPTION_KEY must be 64 hex characters"

**Solution:** Key must be exactly 64 hex characters (32 bytes)

```bash
# Generate correct key
openssl rand -hex 32
```

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Encrypt   | ~1ms | Negligible impact |
| Decrypt   | ~1ms | Negligible impact |
| Database  | ~5-20ms | Normal query time |
| **Total** | **< 25ms** | Per OAuth operation |

---

## Future Enhancements

- [ ] Key versioning (support multiple encryption keys)
- [ ] Hardware Security Module (HSM) integration
- [ ] Automatic token refresh before expiry
- [ ] Audit logging for token operations
- [ ] Rate limiting on failed decryption attempts
- [ ] Token encryption key rotation automation

---

## References

- **Implementation:** `src/lib/server/auth/token-encryption.ts`
- **Utilities:** `src/lib/server/auth/oauth.ts`
- **Tests:** `src/lib/server/auth/test_auth/token-encryption.test.ts`
- **Schema:** `src/db/schema/oauth-accounts.ts`
- **OWASP:** https://owasp.org/www-project-web-security-testing-guide/
- **NIST:** https://csrc.nist.gov/publications/detail/sp/800-38d/final
