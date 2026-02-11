# 🔒 OAuth Security TODO Checklist

## ⚠️ CRITICAL SECURITY ISSUES - Must Fix Before Production

### 1. Token Encryption (HIGHEST PRIORITY)

**Status:** ❌ **NOT IMPLEMENTED** - Tokens stored as PLAIN TEXT!

**Risk Level:** 🔴 **CRITICAL**

**Issue:**
- OAuth `access_token` and `refresh_token` are currently stored in the database **without encryption**
- If database is compromised, attacker gains full access to user accounts on GitHub/42 Intra
- Violates OWASP secure storage guidelines

**Affected Files:**
- ✅ `src/db/schema/oauth-accounts.ts` - Schema definition (marked with TODOs)
- ✅ `src/lib/server/auth/oauth.ts` - Token exchange (marked with TODOs)
- ✅ `src/routes/(api)/auth/callback/github/+server.ts` - GitHub callback (marked with TODOs)
- ⚠️  `src/lib/server/auth/token-encryption.ts` - Placeholder file created (needs implementation)

**Required Implementation:**

```typescript
// 1. Generate encryption key
// Run in terminal: openssl rand -hex 32

// 2. Add to .env
TOKEN_ENCRYPTION_KEY=your_64_character_hex_key_here

// 3. Implement in token-encryption.ts
import { encryptToString, decryptFromString } from '@oslojs/crypto/aes';
import { env } from '$env/dynamic/private';

export async function encryptToken(token: string): Promise<string> {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }
  const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex');
  return await encryptToString(token, key);
}

export async function decryptToken(encryptedToken: string): Promise<string> {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }
  const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex');
  return await decryptFromString(encryptedToken, key);
}

// 4. Update all db.insert() and db.update() calls
// Before storing:
const encryptedAccessToken = await encryptToken(tokenData.access_token);
const encryptedRefreshToken = tokenData.refresh_token 
  ? await encryptToken(tokenData.refresh_token) 
  : null;

// When reading from DB:
const accessToken = await decryptToken(account.accessToken);
```

**Files to Update:**
1. ✅ `src/lib/server/auth/token-encryption.ts` - Implement functions
2. ⚠️  `src/routes/(api)/auth/callback/github/+server.ts` - Encrypt before storing (3 locations marked)
3. ⚠️  Future: `src/routes/(api)/auth/callback/42/+server.ts` - When implementing 42 OAuth
4. ⚠️  Any future OAuth provider callbacks

**Testing:**
```bash
# After implementation, verify:
1. Tokens in database should be base64-encoded encrypted strings
2. Decryption should return original token
3. Invalid encryption key should fail gracefully
```

---

### 2. CSRF Protection

**Status:** ⚠️  **PARTIAL** - State parameter implemented, needs validation

**Risk Level:** 🟡 **MEDIUM**

**Current Implementation:**
- ✅ `state` parameter generated in login route
- ✅ State stored in cookie
- ✅ State validated in callback
- ⚠️  State cookie needs secure flags in production

**Required Improvements:**

```typescript
// In login routes (github/+server.ts, etc.)
cookies.set('oauth_state', state, {
  path: '/',
  httpOnly: true,
  secure: true,  // TODO: Enable in production (HTTPS only)
  sameSite: 'lax',
  maxAge: 60 * 10  // 10 minutes
});
```

**Files to Update:**
- ⚠️  `src/routes/(api)/(auth)/login/github/+server.ts`
- ⚠️  Future OAuth provider login routes

---

### 3. Rate Limiting

**Status:** ❌ **NOT IMPLEMENTED**

**Risk Level:** 🟡 **MEDIUM**

**Issue:**
- No rate limiting on OAuth endpoints
- Vulnerable to DoS attacks
- No protection against OAuth token enumeration

**Required Implementation:**
- Add rate limiting middleware for OAuth routes
- Limit: 5 OAuth attempts per IP per 15 minutes
- Limit: 10 callback attempts per IP per hour

**Recommended Libraries:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// Example implementation
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
});

// In OAuth routes
const identifier = getClientIp(event);
const { success } = await ratelimit.limit(identifier);
if (!success) {
  error(429, 'Too many OAuth attempts. Please try again later.');
}
```

---

### 4. Token Expiration & Refresh

**Status:** ⚠️  **PARTIAL** - Expiration stored, refresh not implemented

**Risk Level:** 🟡 **MEDIUM**

**Current Implementation:**
- ✅ `expires_at` field in database
- ✅ Expiration time calculated from `expires_in`
- ❌ No automatic token refresh
- ❌ No validation of expired tokens

**Required Implementation:**

```typescript
// Check if token is expired
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
}

// Refresh token if expired
export async function refreshOAuthToken(
  provider: OAuthProvider,
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  // TODO: Implement token refresh logic for each provider
  // Different providers have different refresh endpoints
}
```

---

### 5. Email Verification

**Status:** ❌ **NOT IMPLEMENTED**

**Risk Level:** 🟢 **LOW** (but important)

**Issue:**
- OAuth providers return email, but we don't verify ownership
- User could link OAuth account with different email

**Required Implementation:**
- Option 1: Trust OAuth provider's email verification
- Option 2: Send verification email even for OAuth users
- Option 3: Show warning if OAuth email differs from account email

---

### 6. Account Linking Security

**Status:** ⚠️  **NEEDS REVIEW**

**Risk Level:** 🟡 **MEDIUM**

**Current Behavior:**
- If email exists, link OAuth to existing account
- User is automatically logged in

**Potential Issues:**
- User A signs up with email@example.com + password
- User B logs in with GitHub OAuth using same email
- User B now has access to User A's account (no password required!)

**Recommended Fix:**

```typescript
// In callback route
if (existingUser && existingUser.password_hash) {
  // User has password-based account
  // Require password confirmation before linking
  redirect(303, `/auth/link-oauth?provider=github&oauth_id=${oauthUser.id}&email=${oauthUser.email}`);
  // Show UI: "An account with this email exists. Please enter your password to link accounts."
} else {
  // Safe to link (OAuth-only account or new user)
  // ...existing logic
}
```

---

## 📋 Implementation Priority

### Phase 1: Critical Security (Before ANY Production Use)
1. ✅ **Token Encryption** - Implement AES-256-GCM encryption
2. ✅ **CSRF Protection** - Enable secure flags on state cookies
3. ✅ **Account Linking** - Require password for linking to password accounts

### Phase 2: Important Security (Before Public Launch)
4. ⚠️  **Rate Limiting** - Add to all OAuth endpoints
5. ⚠️  **Token Refresh** - Implement automatic token renewal
6. ⚠️  **Error Handling** - Don't leak OAuth errors to users

### Phase 3: Best Practices (Before Scale)
7. 🟢 **Email Verification** - Add verification flow
8. 🟢 **Audit Logging** - Log all OAuth events
9. 🟢 **Token Rotation** - Rotate tokens on suspicious activity

---

## 🧪 Testing Checklist

### Security Tests Needed
- [ ] Token encryption/decryption roundtrip
- [ ] Invalid encryption key handling
- [ ] CSRF state validation
- [ ] Rate limiting triggers correctly
- [ ] Expired token detection
- [ ] Account linking requires password
- [ ] OAuth error handling doesn't leak info

### Integration Tests Needed
- [ ] GitHub OAuth full flow (login, register, link)
- [ ] 42 OAuth full flow (when implemented)
- [ ] Multiple OAuth accounts per user
- [ ] OAuth account unlinking
- [ ] Session creation after OAuth
- [ ] Token refresh flow

---

## 📚 References

- **OWASP OAuth Security Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html
- **@oslojs/crypto Documentation**: https://github.com/pilcrowOnPaper/oslo
- **GitHub OAuth Best Practices**: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-oauth-apps
- **42 OAuth Documentation**: https://api.intra.42.fr/apidoc/guides/web_application_flow

---

## ✅ Completed Items

- ✅ Database schema supports OAuth accounts
- ✅ Nullable password_hash for OAuth-only users
- ✅ Composite primary key prevents duplicate OAuth links
- ✅ Foreign key CASCADE delete
- ✅ OAuth state parameter for CSRF protection
- ✅ GitHub OAuth flow implementation (encryption pending)
- ✅ TODO comments added to all relevant files
- ✅ All 263 tests passing

---

**Last Updated:** February 11, 2026
**Status:** 🔴 **CRITICAL SECURITY ISSUES PRESENT** - Do not deploy to production
**Next Action:** Implement token encryption (Priority 1)
