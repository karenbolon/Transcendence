# OAuth Architecture Quick Reference

**For:** SvelteKit + Lucia Auth Implementation  
**Based on:** FastAPI + Next.js OAuth patterns  
**Last Updated:** January 2025

---

## 🎯 Core Principle

> **Backend does ALL auth logic. Frontend sets cookies ONLY.**

---

## ✅ DO THIS

### 1. Backend Handles Complete Auth Logic
```typescript
// src/routes/(api)/(auth)/login/42/callback/+server.ts

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // ✅ All logic in backend
  validateState(state);
  const token = await exchangeCodeForToken(code);
  const userInfo = await fetchUserFromProvider(token);
  const user = await findOrCreateUser(userInfo);
  const session = await lucia.createSession(user.id);
  
  // ✅ Set cookie directly (SvelteKit advantage!)
  cookies.set('auth_session', session.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    expires: session.expiresAt
  });
  
  return redirect(302, '/');
}
```

### 2. Use Query Parameters for Token Passing
```typescript
// ✅ Domain-independent, designed for data passing
const redirectUrl = `${FRONTEND_URL}/api/set-cookie?token=${jwt}&expires=${exp}`;
```

### 3. Encrypt Tokens Before Storing
```typescript
// ✅ Never store plain text tokens
await db.insert(oauthAccounts).values({
  providerId: '42',
  userId: user.id,
  accessToken: encrypt(token.access_token),  // ✅ Encrypted
  refreshToken: encrypt(token.refresh_token) // ✅ Encrypted
});
```

### 4. Always Validate State Parameter
```typescript
// ✅ CSRF protection
const storedState = cookies.get('oauth_state');
const receivedState = url.searchParams.get('state');

if (storedState !== receivedState) {
  throw new Error('Invalid state parameter - potential CSRF attack');
}
```

---

## ❌ DON'T DO THIS

### 1. ❌ Split Auth Logic Between Backend and Frontend
```typescript
// ❌ DON'T: OAuth endpoint in frontend
// src/routes/api/oauth/callback/+server.ts
const token = await exchangeCode(code); // ❌ Logic in frontend
const user = await db.users.create(/*...*/); // ❌ DB access in frontend

// Why it's bad:
// - Two backends accessing same database
// - Must keep two codebases in sync
// - Fragmented secrets management
// - Race conditions
// - Debugging nightmare
```

### 2. ❌ Use Cross-Domain Cookies
```typescript
// ❌ DON'T: Backend trying to set frontend cookie
response.set_cookie(
  'session',
  value=token,
  domain='.example.com',  // ❌ Assumes domain structure
  samesite='none'         // ❌ Complex browser restrictions
);

// Why it's bad:
// - Requires specific domain structure
// - Can't use unrelated domains
// - Doesn't work on PaaS platforms (Vercel, Netlify)
// - Browser third-party cookie restrictions
// - Different for email vs OAuth login
```

### 3. ❌ Store Tokens in Plain Text
```typescript
// ❌ DON'T
await db.insert(oauthAccounts).values({
  accessToken: token.access_token,  // ❌ Plain text = security breach
  refreshToken: token.refresh_token // ❌ Exposed if DB compromised
});
```

### 4. ❌ Skip State Parameter Validation
```typescript
// ❌ DON'T: Accept any state value
const code = url.searchParams.get('code');
const token = await exchangeCode(code); // ❌ CSRF vulnerability!
```

---

## 📊 Architecture Pattern Comparison

### FastAPI + Next.js (Separate Processes)
```
User → Backend OAuth → Provider → Backend Callback → Next.js API → Home
                                         ↓
                                   Query params with token
                                         ↓
                                    Next.js sets cookie
```

### SvelteKit (Unified Process) ✨ SIMPLER!
```
User → SvelteKit OAuth → Provider → SvelteKit Callback → Home
                                          ↓
                                    Set cookie directly
```

**Key Advantage:** No intermediate redirect needed!

---

## 🔐 Security Checklist

```typescript
// ✅ Complete OAuth callback security

export async function GET({ url, cookies }) {
  // 1. ✅ Validate state (CSRF protection)
  const state = url.searchParams.get('state');
  const storedState = cookies.get('oauth_state');
  if (state !== storedState) throw new Error('CSRF');
  
  // 2. ✅ Validate code exists
  const code = url.searchParams.get('code');
  if (!code) throw new Error('Missing code');
  
  // 3. ✅ Exchange code (use HTTPS)
  const token = await exchangeCodeForToken(code);
  
  // 4. ✅ Validate token response
  if (!token.access_token) throw new Error('Invalid token');
  
  // 5. ✅ Fetch user info securely
  const userInfo = await fetchUserInfo(token.access_token);
  
  // 6. ✅ Validate user info
  if (!userInfo.email) throw new Error('Missing email');
  
  // 7. ✅ Encrypt before storing
  const encryptedToken = encrypt(token.access_token);
  
  // 8. ✅ Create/update user atomically
  const user = await db.transaction(async (trx) => {
    // Find or create user
    // Link OAuth account with encrypted tokens
  });
  
  // 9. ✅ Create session with expiration
  const session = await lucia.createSession(user.id);
  
  // 10. ✅ Set HttpOnly, Secure cookie
  cookies.set('auth_session', session.id, {
    path: '/',
    httpOnly: true,    // ✅ XSS protection
    sameSite: 'lax',   // ✅ CSRF protection
    secure: true,      // ✅ HTTPS only
    expires: session.expiresAt
  });
  
  // 11. ✅ Clear state cookie
  cookies.delete('oauth_state');
  
  // 12. ✅ Redirect to safe location
  return redirect(302, '/');
}
```

---

## 🚀 Implementation Steps

### Step 1: Redirect Endpoint
```typescript
// src/routes/(api)/(auth)/login/42/+server.ts

export async function GET({ url, cookies }) {
  const state = generateRandomState(); // 32+ bytes
  const redirectUri = `${url.origin}/login/42/callback`;
  
  // Store state for validation
  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  });
  
  const authUrl = new URL('https://api.intra.42.fr/oauth/authorize');
  authUrl.searchParams.set('client_id', INTRA_42_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  
  return redirect(302, authUrl.toString());
}
```

### Step 2: Callback Endpoint
```typescript
// src/routes/(api)/(auth)/login/42/callback/+server.ts

export async function GET({ url, cookies }) {
  // Validate state
  const state = url.searchParams.get('state');
  const storedState = cookies.get('oauth_state');
  if (state !== storedState) {
    return new Response('Invalid state', { status: 400 });
  }
  
  // Exchange code for token
  const code = url.searchParams.get('code');
  const tokenResponse = await fetch('https://api.intra.42.fr/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: INTRA_42_CLIENT_ID,
      client_secret: INTRA_42_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/login/42/callback`
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Fetch user info
  const userResponse = await fetch('https://api.intra.42.fr/v2/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  
  const userData = await userResponse.json();
  
  // Find or create user
  let user = await db.query.users.findFirst({
    where: eq(users.email, userData.email)
  });
  
  if (!user) {
    user = await db.insert(users).values({
      id: generateId(),
      email: userData.email,
      username: userData.login,
      fullName: userData.displayname
    }).returning().then(rows => rows[0]);
  }
  
  // Link OAuth account
  await db.insert(oauthAccounts)
    .values({
      provider: '42',
      providerUserId: userData.id.toString(),
      userId: user.id,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000)
    })
    .onConflictDoUpdate({
      target: [oauthAccounts.provider, oauthAccounts.providerUserId],
      set: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000)
      }
    });
  
  // Create session
  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  
  // Set cookie
  cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  cookies.delete('oauth_state');
  
  return redirect(302, '/');
}
```

---

## 🧪 Test Examples

### Test State Validation
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('OAuth Callback - State Validation', () => {
  it('should reject callback with invalid state', async () => {
    const response = await GET({
      url: new URL('http://localhost/login/42/callback?code=abc&state=invalid'),
      cookies: { get: () => 'correct-state' }
    });
    
    expect(response.status).toBe(400);
  });
  
  it('should accept callback with valid state', async () => {
    const response = await GET({
      url: new URL('http://localhost/login/42/callback?code=abc&state=valid'),
      cookies: { get: () => 'valid' }
    });
    
    expect(response.status).toBe(302);
  });
});
```

### Test Token Encryption
```typescript
describe('Token Encryption', () => {
  it('should never store plain text tokens', async () => {
    const token = 'secret-access-token';
    const encrypted = encrypt(token);
    
    expect(encrypted).not.toBe(token);
    expect(encrypted.length).toBeGreaterThan(token.length);
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(token);
  });
});
```

---

## 📝 Common Mistakes

### Mistake 1: Forgetting to Clean Up State Cookie
```typescript
// ❌ State cookie left in browser
return redirect(302, '/');

// ✅ Always clean up
cookies.delete('oauth_state');
return redirect(302, '/');
```

### Mistake 2: Not Handling Errors
```typescript
// ❌ Unhandled error crashes server
const token = await exchangeCode(code);

// ✅ Proper error handling
try {
  const token = await exchangeCode(code);
} catch (error) {
  console.error('OAuth error:', error);
  return redirect(302, '/login?error=oauth_failed');
}
```

### Mistake 3: Exposing Client Secret
```typescript
// ❌ Client secret in frontend
const authUrl = `...&client_secret=${secret}`; // ❌ NEVER!

// ✅ Client secret stays in backend
// Only used in server-side token exchange
```

---

## 🎯 Key Takeaways

1. **Backend = Auth Logic, Frontend = Cookie Setting** (but in SvelteKit, both can be same route!)
2. **Query Parameters > Cookies** for passing tokens across domains
3. **Always Encrypt** OAuth tokens before database storage
4. **State Parameter = CSRF Protection** - never skip validation
5. **SvelteKit Simplifies** the FastAPI + Next.js pattern significantly
6. **Test First** - write tests before implementation
7. **HttpOnly Cookies** for session storage (XSS protection)
8. **Never Expose Secrets** - client secrets stay server-side only

---

## 🔗 Quick Links

- **Full Reference:** `REFERENCE_FASTAPI_NEXTJS_OAUTH.md`
- **OAuth Architecture:** `OAUTH_ARCHITECTURE.md`
- **Implementation Summary:** `ARCHITECTURE_SUMMARY.md`
- **Lucia Auth Docs:** https://lucia-auth.com/
- **42 Intra OAuth:** https://api.intra.42.fr/apidoc/guides/web_application_flow

---

**Ready to implement?** Start with Phase 1: Foundation Tests! 🚀
