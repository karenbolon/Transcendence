# FastAPI + Next.js OAuth Implementation Reference

**Source:** [Github login with FastAPI and Next.js - Nemanja Mitic](https://nemanjamitic.com/blog/2026-02-07-github-login-fastapi-nextjs)  
**Date Analyzed:** January 2025  
**Relevance:** Architecture patterns for SvelteKit + Lucia Auth OAuth implementation

---

## Key Architectural Insights

This article provides a practical example of implementing OAuth (GitHub) with a **separated backend (FastAPI) and frontend (Next.js)** architecture. While our stack is SvelteKit + Lucia Auth, the **separation of concerns and cookie management patterns are directly applicable**.

---

## Architecture Overview

### Core Principles

1. **Backend Handles ALL Auth Logic**
   - SvelteKit server routes implements OAuth redirect and callback endpoints
   - Backend is the single source of truth for authentication
   - No splitting of auth logic between frontend and backend

2. **Frontend Handles Cookie Management ONLY**
   - SvelteKit server endpoints set/unset cookies
   - Cookies are set by the same domain where the frontend runs
   - Avoids cross-domain cookie complexity

3. **Domain Independence**
   - Backend and frontend can run on completely different, unrelated domains
   - No assumptions about subdomains (e.g., `api.example.com` vs `example.com`)
   - Tokens passed via query parameters or response body, NOT cookies

4. **Session Storage in HttpOnly Cookies**
   - Server-side rendered pages require cookies (not `localStorage`)
   - HttpOnly cookies prevent XSS attacks
   - Cookies managed by framework running on frontend domain

---

## 🔄 OAuth Flow Architecture

### Redirect Chain Pattern (FastAPI + Next.js)

```
User → Backend /login/github → GitHub Authorization → Backend /callback → Next.js API /set-cookie → Home
```

**Original Pattern (Separate Backend/Frontend):**
1. **Initiation:** User clicks "Login with GitHub"
2. **Backend Redirect:** FastAPI redirects to GitHub with client_id and redirect_uri
3. **User Consent:** User logs in and approves on GitHub
4. **Backend Callback:** GitHub redirects back to FastAPI with authorization code
5. **Token Exchange:** FastAPI exchanges code for access token
6. **User Data Fetch:** FastAPI fetches user profile from GitHub API
7. **DB Operation:** FastAPI finds/creates user in database
8. **JWT Generation:** FastAPI creates JWT access token using user's database ID
9. **Frontend Redirect:** FastAPI redirects to Next.js API route with `access_token` and `expires` as query params
10. **Cookie Setting:** Next.js API route sets HttpOnly cookie
11. **Final Redirect:** Next.js redirects to home page as logged-in user

### Simplified Pattern (SvelteKit + Lucia)

```
User → SvelteKit /login/42 → 42 Intra Authorization → SvelteKit /callback → Home
```

**SvelteKit Advantage - Direct Flow:**
1. **Initiation:** User clicks "Login with 42"
2. **Backend Redirect:** SvelteKit server route redirects to 42 Intra with client_id, redirect_uri, and state
3. **User Consent:** User logs in and approves on 42 Intra
4. **Backend Callback:** 42 Intra redirects back to SvelteKit callback with authorization code and state
5. **State Validation:** SvelteKit validates state parameter (CSRF protection)
6. **Token Exchange:** SvelteKit exchanges code for access token via Lucia OAuth
7. **User Data Fetch:** SvelteKit fetches user profile from 42 API
8. **DB Operation:** Lucia finds/creates user in database (with OAuth account linking)
9. **Session Creation:** Lucia creates session
10. **Cookie Setting:** SvelteKit sets HttpOnly session cookie **directly in callback**
11. **Final Redirect:** SvelteKit redirects to home page as logged-in user

**Key Simplification:** No intermediate cookie-setting endpoint needed! SvelteKit can set cookies directly in the OAuth callback because server routes run on the same domain as the frontend.

---

## 📊 Separation of Concerns

### SvelteKit Implementation (Simplified)

Unlike the FastAPI + Next.js pattern, SvelteKit can handle **both OAuth logic and cookie setting in the same endpoint**.

```typescript
// src/routes/(api)/(auth)/login/42/+server.ts
// Redirect endpoint - initiates OAuth flow

import { dev } from '$app/environment';
import { intra42Auth } from '$lib/server/auth/lucia';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
  // ✅ Generate authorization URL with state
  const [url, state] = await intra42Auth.getAuthorizationUrl();
  
  // ✅ Store state in cookie for CSRF protection
  cookies.set('intra_42_oauth_state', state, {
    httpOnly: true,
    secure: !dev,
    path: '/',
    maxAge: 60 * 10 // 10 minutes
  });
  
  // ✅ Redirect to 42 Intra
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString() }
  });
};
```

```typescript
// src/routes/(api)/(auth)/login/42/callback/+server.ts
// Callback endpoint - exchanges code for token AND sets cookie

import { auth, intra42Auth } from '$lib/server/auth/lucia';
import { OAuthRequestError } from '@lucia-auth/oauth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  // ✅ 1. Validate state (CSRF protection)
  const storedState = cookies.get('intra_42_oauth_state');
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  
  if (!storedState || !state || storedState !== state || !code) {
    return new Response('Invalid state parameter', { status: 400 });
  }
  
  try {
    // ✅ 2. Validate callback and get user info
    const { getExistingUser, intra42User, createUser } = 
      await intra42Auth.validateCallback(code);
    
    // ✅ 3. Get or create user
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
    
    // ✅ 4. Create Lucia session
    const session = await auth.createSession({
      userId: user.userId,
      attributes: {}
    });
    
    // ✅ 5. Set cookie DIRECTLY (no intermediate redirect!)
    locals.auth.setSession(session);
    
    // ✅ 6. Clean up state cookie
    cookies.delete('intra_42_oauth_state', { path: '/' });
    
    // ✅ 7. Redirect to home
    throw redirect(302, '/');
    
  } catch (e) {
    console.error('42 Intra OAuth error:', e);
    
    if (e instanceof OAuthRequestError) {
      return new Response('Invalid authorization code', { status: 400 });
    }
    
    return new Response('Internal server error', { status: 500 });
  }
};
```

**Key Advantage:** No separate cookie-setting endpoint needed! The callback route does everything in one place because SvelteKit server routes run on the same domain as the frontend pages.

---

## ⚠️ Suboptimal Approaches to AVOID

### 1. ❌ Splitting Auth Logic Between Backend and Frontend

**Problems:**
- Two backends coupled to same database and schema
- Deployment must stay in strict sync
- Fragmented configuration and secrets management
- Violates "single source of truth" principle
- Potential read/write race conditions
- Increased debugging complexity

### 2. ❌ Cross-Domain Cookie Management

**Example (Don't Do This):**
```python
# Backend trying to set cookie for frontend domain
response.set_cookie(
    "session",
    value=token,
    domain=".example.com",  # ❌ Assumes shared domain structure
    samesite="none",        # ❌ Requires HTTPS everywhere
    secure=True
)
```

**Problems:**
- Assumes specific domain structure (frontend and backend must share parent domain)
- Cannot use unrelated domains (e.g., `myapp.com` and `api.differenthost.com`)
- Doesn't work with PaaS platforms using public suffix domains (e.g., `vercel.app`)
- Different flow for email/password vs OAuth login
- Browser restrictions on third-party cookies

---

## ✅ Why This Architecture Works

### For SvelteKit (vs Next.js)

**SvelteKit Advantages:**
- Server routes can handle BOTH backend logic AND cookie setting
- No need for separate Next.js API routes pattern
- Simplified architecture: one framework, one process
- Still maintain separation: auth logic in `/routes/(api)/(auth)`, cookie helpers in utilities

**Pattern Translation:**

| FastAPI + Next.js | SvelteKit + Lucia |
|-------------------|-------------------|
| FastAPI endpoint handles OAuth logic | SvelteKit server route handles OAuth logic |
| Next.js API route sets cookie | Same SvelteKit route sets cookie (or helper function) |
| Two separate processes/containers | Single SvelteKit process |
| Domain independence via query params | Same domain, simpler flow |

### Cookie Management Best Practices

1. **Use Query Parameters for Token Passing**
   - Query params are domain-independent
   - Designed for passing data between HTTP requests
   - Works with any domain configuration

2. **Set Cookies from Same Domain**
   - Browser security enforces same-origin cookie policy
   - SvelteKit server routes run on same domain as pages
   - Natural fit for HttpOnly cookie management

3. **Redirect Chain Maintains Browser Context**
   - User never sees raw API responses
   - Seamless experience from login to home page
   - Browser follows entire flow naturally

---

## 🔑 Key Differences: Email/Password vs OAuth

### Email/Password Login
```typescript
// POST /api/auth/login
// 1. Receive credentials
// 2. Validate password
// 3. Create session
// 4. Set cookie in same request
// 5. Return success response
```

### OAuth Login
```typescript
// GET /login/42
// 1. Redirect to provider
// [User logs in on provider]
// GET /login/42/callback
// 2. Exchange code for token
// 3. Fetch user data
// 4. Find/create user
// 5. Create session
// 6. Redirect to cookie setter with query params
// GET /api/auth/set-cookie
// 7. Set cookie from query params
// 8. Redirect to home page
```

**Why the Extra Step?**
- OAuth callback is initiated by browser redirect, not a form POST
- Cannot set cookie directly in callback response (different flow context)
- Query parameters maintain data across redirects
- Final redirect ensures user lands on intended page, not raw API response

---

## 📝 SvelteKit vs FastAPI + Next.js Comparison

### Architecture Differences

| Aspect | FastAPI + Next.js | SvelteKit + Lucia |
|--------|-------------------|-------------------|
| **Processes** | Two separate (Python + Node.js) | One unified (Node.js) |
| **Cookie Setting** | Next.js API routes | Same server route as OAuth logic |
| **OAuth Logic** | FastAPI endpoints | SvelteKit server routes |
| **Redirect Chain** | Backend → Frontend API → Home | Backend → Home (1 less redirect!) |
| **Session Management** | Manual JWT creation | Lucia handles automatically |
| **Token Passing** | Query parameters (cross-domain) | Direct (same domain) |
| **Deployment** | Two containers | One container |
| **Complexity** | Higher (2 frameworks to sync) | Lower (1 framework) |

### Code Comparison

#### FastAPI + Next.js (Original Pattern)

**FastAPI Callback:**
```python
# backend/app/api/routes/login.py
@router.get("/auth/github/callback")
async def auth_github_callback(request: Request, session: SessionDep):
    # 1. Exchange code for token
    # 2. Fetch user data
    # 3. Create/update user
    # 4. Generate JWT
    
    # ❌ Cannot set cookie directly (different domain)
    # Must redirect to Next.js API with token in query params
    redirect_url = f"{SITE_URL}/api/auth/set-cookie?token={jwt}&expires={exp}"
    return RedirectResponse(redirect_url)
```

**Next.js API Route:**
```typescript
// frontend/pages/api/auth/set-cookie.ts
export default async function handler(req, res) {
  const { token, expires } = req.query;
  
  // ✅ Set cookie (same domain as frontend)
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; ...`);
  res.redirect(302, '/');
}
```

#### SvelteKit + Lucia (Simplified Pattern)

**SvelteKit Callback (Does Everything):**
```typescript
// src/routes/(api)/(auth)/login/42/callback/+server.ts
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  // 1. Validate state
  // 2. Exchange code for token (via Lucia)
  // 3. Fetch user data
  // 4. Create/update user (via Lucia)
  // 5. Create session (via Lucia)
  
  // ✅ Set cookie directly (same domain!)
  locals.auth.setSession(session);
  
  // ✅ Redirect to home
  throw redirect(302, '/');
};
```

### Why SvelteKit is Simpler

1. **Single Framework:** No need to sync two separate codebases
2. **Same Domain:** Server routes run on same domain as pages
3. **Lucia Integration:** Built-in session management
4. **Fewer Redirects:** Direct cookie setting eliminates intermediate step
5. **Type Safety:** End-to-end TypeScript
6. **Single Deployment:** One container instead of two

---

## 🧪 Implementation Checklist

### Phase 1: Backend OAuth Logic (SvelteKit Server Routes)

- [ ] Create `/routes/(api)/(auth)/login/42/+server.ts` redirect endpoint
  - [ ] Generate authorization URL with Lucia OAuth
  - [ ] Generate and store state parameter in cookie (CSRF protection)
  - [ ] Redirect to 42 Intra OAuth page
- [ ] Create `/routes/(api)/(auth)/login/42/callback/+server.ts` callback endpoint
  - [ ] Validate state parameter from cookie
  - [ ] Exchange authorization code for access token via Lucia
  - [ ] Fetch user profile from 42 Intra API
  - [ ] Find or create user in database (Lucia handles this)
  - [ ] Link OAuth account to user (`oauth_accounts` table)
  - [ ] Create Lucia session
  - [ ] Set HttpOnly session cookie (Lucia handles this via `locals.auth.setSession()`)
  - [ ] Clean up state cookie
  - [ ] Redirect to home page
  - [ ] Add error handling for OAuth errors

### Phase 2: Database Schema

- [ ] Create `oauth_accounts` table with composite primary key
- [ ] Foreign key to `users` table
- [ ] Store provider, provider_user_id, access_token (encrypted), refresh_token (encrypted)
- [ ] Update `users` table (make `hashed_password` nullable)
- [ ] Add `username` column to users table (for OAuth username)
- [ ] Update `app.d.ts` to include `username` in `DatabaseUserAttributes`

### Phase 3: Security

- [ ] Always encrypt tokens before storing in database
- [ ] Validate state parameter on callback
- [ ] Use HTTPS in production (enforce secure cookies)
- [ ] Implement rate limiting on OAuth endpoints
- [ ] Add CSRF protection to all auth endpoints
- [ ] Clean up state cookies after use

### Phase 4: Testing

- [ ] Unit tests for OAuth provider interface
- [ ] Integration tests for full OAuth flow
- [ ] Test account linking/unlinking
- [ ] Test error scenarios (invalid code, expired state, network failures)
- [ ] E2E tests with Playwright

---

## 📝 SvelteKit vs FastAPI + Next.js Comparison

- **Original Article:** https://nemanjamitic.com/blog/2026-02-07-github-login-fastapi-nextjs
- **OAuth 2.0 Spec:** https://oauth.net/2/
- **Lucia Auth Docs:** https://lucia-auth.com/
- **SvelteKit Cookies:** https://kit.svelte.dev/docs/types#public-types-cookies
- **42 OAuth Guide:** https://api.intra.42.fr/apidoc/guides/web_application_flow

---

## 💡 Key Takeaways for Our Implementation

1. **SvelteKit is simpler than FastAPI + Next.js** because it can handle both backend logic and cookie management in the same process
2. **Keep all auth logic in backend** (SvelteKit server routes) - never split between frontend and backend
3. **Lucia Auth provides the session management layer** - we just need to integrate OAuth providers
4. **Always use state parameter** for CSRF protection
5. **Always encrypt tokens** before storing in database
6. **Test the full redirect chain** to ensure seamless user experience
7. **Use proper TypeScript types** for all OAuth responses and database models

---

## ✨ Next Steps

1. Review this reference alongside `OAUTH_ARCHITECTURE.md`
2. Start with **Phase 1: Foundation Tests** from main implementation plan
3. Implement 42 Intra provider first (required for 42 school project)
4. Add Google/GitHub providers as time permits
5. Ensure all tests pass before committing to git

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Reference Material - Ready for Implementation
