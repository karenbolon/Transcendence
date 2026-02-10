# Architecture Documentation Summary

**Project:** ft_transcendence (42 School)  
**Tech Stack:** SvelteKit + Lucia Auth + PostgreSQL + Docker  
**Date:** January 2025

---

## 📚 Documentation Overview

This project has comprehensive architecture documentation covering both traditional authentication and OAuth 2.0 implementation. All documents are located in `/docs/`.

### Core Documentation Files

1. **`AUTH_ARCHITECTURE.md`** - Traditional Authentication (Email/Password)
   - Complete authentication vs authorization concepts
   - Flow diagrams (registration, login, authenticated requests)
   - Database schema design (users, sessions)
   - Password security with Argon2id
   - Session management with Lucia Auth
   - Security best practices
   - Testing strategy
   - 9-phase implementation checklist

2. **`OAUTH_ARCHITECTURE.md`** - OAuth 2.0 Implementation
   - OAuth 2.0 overview and Authorization Code Flow
   - Provider integration guides (42 Intra, Google, GitHub)
   - Account linking and unlinking flows
   - Database schema (oauth_accounts table)
   - Security considerations (state parameter, token encryption)
   - Token refresh strategy
   - Test-first approach
   - 9-phase implementation checklist

3. **`REFERENCE_FASTAPI_NEXTJS_OAUTH.md`** - Real-World Implementation Reference
   - Analysis of FastAPI + Next.js OAuth implementation
   - Separation of concerns patterns
   - Cookie management strategies
   - Domain independence architecture
   - SvelteKit-specific adaptations
   - Common pitfalls and how to avoid them

---

## 🎯 Key Architectural Decisions

### 1. Hybrid Authentication System
- **Support both traditional (email/password) AND OAuth**
- Unified session management via Lucia Auth
- All users stored in same `users` table
- OAuth users linked via `oauth_accounts` table

### 2. Test-First Development
- Write tests BEFORE implementation
- Comprehensive test coverage: unit, integration, E2E
- No code pushed to git without passing tests
- Automated CI/CD pipeline with GitHub Actions

### 3. Security-First Design
- **Passwords:** Argon2id hashing (strongest available)
- **Sessions:** Lucia Auth with HttpOnly cookies
- **OAuth Tokens:** Always encrypted in database
- **CSRF Protection:** State parameter for OAuth
- **Rate Limiting:** On all auth endpoints
- **Input Validation:** Zod schemas for all inputs

### 4. Clear Separation of Concerns

#### SvelteKit Server Routes Handle:
- All authentication logic
- OAuth redirect and callback endpoints
- User creation and validation
- Session management
- Token exchange with OAuth providers

#### Frontend Components Handle:
- User interface (login forms, OAuth buttons)
- Display error/success messages
- Loading states
- Redirect after successful auth

### 5. Database Design

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  hashed_password TEXT,  -- NULLABLE (for OAuth-only users)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Sessions Table (Lucia Auth)
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL
);
```

#### OAuth Accounts Table
```sql
CREATE TABLE oauth_accounts (
  provider TEXT NOT NULL,           -- '42', 'google', 'github'
  provider_user_id TEXT NOT NULL,   -- OAuth ID from provider
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT,                -- ENCRYPTED
  refresh_token TEXT,               -- ENCRYPTED
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (provider, provider_user_id)
);
```

---

## 🔄 OAuth Implementation Strategy

### Provider Abstraction Layer
```typescript
interface OAuthProvider {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  
  getAuthorizationUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<TokenResponse>;
  getUserInfo(accessToken: string): Promise<UserInfo>;
}
```

### Redirect Chain Pattern
```
User clicks "Login with 42"
  ↓
Backend /login/42 (generates state, redirects to 42 Intra)
  ↓
User logs in on 42 Intra
  ↓
42 Intra redirects to Backend /login/42/callback?code=xxx&state=yyy
  ↓
Backend validates state, exchanges code for token
  ↓
Backend fetches user info from 42 API
  ↓
Backend finds/creates user in database
  ↓
Backend creates Lucia session
  ↓
Backend sets HttpOnly session cookie
  ↓
Backend redirects to home page
  ↓
User is logged in! ✅
```

---

## 🧪 Testing Strategy

### Phase 1: Foundation Tests (Unit)
- [ ] OAuth provider interface tests
- [ ] Password hashing tests
- [ ] Input validation tests
- [ ] Token encryption/decryption tests
- [ ] State parameter generation tests

### Phase 2: Integration Tests
- [ ] Full OAuth login flow (mocked provider)
- [ ] Account linking flow
- [ ] Account unlinking flow
- [ ] Session creation and validation
- [ ] Database operations

### Phase 3: E2E Tests (Playwright)
- [ ] Complete user journey (OAuth login)
- [ ] Complete user journey (email/password)
- [ ] Account linking from settings page
- [ ] Session persistence across page refreshes
- [ ] Multiple OAuth providers

### Phase 4: Security Tests
- [ ] CSRF attack prevention (invalid state)
- [ ] SQL injection attempts
- [ ] XSS attack prevention
- [ ] Rate limiting enforcement
- [ ] Token expiration and refresh

---

## 🚀 Implementation Phases

### ✅ Completed
- [x] Docker environment setup (PostgreSQL on port 5432, test DB on 5433)
- [x] Node.js updated to v24.13.0 (latest LTS)
- [x] Environment configuration (.env file)
- [x] Documentation complete (AUTH_ARCHITECTURE.md, OAUTH_ARCHITECTURE.md)
- [x] Reference material analyzed (FastAPI + Next.js OAuth article)

### 🎯 Next: Phase 1 - Foundation (Tests First!)
1. Set up test infrastructure (Vitest already configured)
2. Write OAuth provider interface tests
3. Write password hashing tests
4. Write validation tests
5. Write state parameter tests

### Phase 2: Database Schema
1. Write schema tests for oauth_accounts table
2. Create migration for oauth_accounts table
3. Update users table (make hashed_password nullable)
4. Test foreign key relationships and cascade deletes

### Phase 3: Provider Implementation
1. Set up 42 Intra OAuth application
2. Implement OAuth provider interface
3. Implement 42 Intra provider
4. (Optional) Implement Google provider
5. (Optional) Implement GitHub provider

### Phase 4: Security Layer
1. Implement state parameter generation and validation
2. Implement token encryption/decryption utilities
3. Test CSRF protection
4. Test redirect URI validation

### Phase 5: OAuth Routes
1. Implement `/login/42` redirect endpoint
2. Implement `/login/42/callback` endpoint
3. Implement account linking endpoints
4. Implement account unlinking endpoints

### Phase 6: Frontend UI
1. Create OAuth login buttons
2. Create settings/connections page
3. Add loading states
4. Add error/success messages

### Phase 7: Integration Tests
1. Test full OAuth login flow
2. Test account linking flow
3. Test account unlinking flow
4. Test error scenarios

### Phase 8: E2E Tests
1. Test complete user journey with Playwright
2. Test session persistence
3. Test across different providers

### Phase 9: CI/CD & Deployment
1. Set up GitHub Actions workflow
2. Configure environment variables
3. Deploy and test in production

---

## 🔑 Key Insights from FastAPI + Next.js Reference

### What Applies to Our SvelteKit Implementation

1. **Cookie Management Strategy**
   - Backend handles all auth logic
   - Frontend (SvelteKit server routes) sets cookies
   - Cookies must be set from same domain as frontend pages
   - **Advantage:** SvelteKit can do both in one place (simpler than FastAPI + Next.js)

2. **Domain Independence**
   - Pass tokens via query parameters, not cookies
   - Query parameters work across any domain configuration
   - Redirect chain maintains browser context

3. **Separation of Concerns**
   - Never split auth logic between backend and frontend
   - Backend is single source of truth
   - Frontend only handles cookie setting and UI

4. **Avoid Cross-Domain Cookies**
   - Complex, fragile, browser-restricted
   - Requires assumptions about domain structure
   - Doesn't work with PaaS platforms (Vercel, Netlify)

### What's Different in SvelteKit

1. **Simpler Architecture**
   - No need for separate Next.js API routes pattern
   - SvelteKit server routes can set cookies directly
   - One framework, one process, one container

2. **Direct Cookie Setting**
   ```typescript
   // Can do this directly in callback endpoint
   cookies.set('auth_session', sessionId, { /* attributes */ });
   ```

3. **No Extra Redirect for Cookie Setting**
   - FastAPI + Next.js: Backend → Next.js API → Home
   - SvelteKit: Backend callback → Home (cookies set in callback)

---

## 📖 How to Use This Documentation

### For Implementation
1. Start with `AUTH_ARCHITECTURE.md` to understand traditional auth
2. Read `OAUTH_ARCHITECTURE.md` for OAuth-specific concepts
3. Review `REFERENCE_FASTAPI_NEXTJS_OAUTH.md` for real-world patterns
4. Follow the 9-phase implementation checklist
5. Write tests first, then implement features

### For Review
1. Use this summary as a quick reference
2. Dive into specific docs for detailed information
3. Check reference material for edge cases and pitfalls

### For Onboarding New Team Members
1. Read this summary first (30 minutes)
2. Read `AUTH_ARCHITECTURE.md` (1-2 hours)
3. Read `OAUTH_ARCHITECTURE.md` (1-2 hours)
4. Skim `REFERENCE_FASTAPI_NEXTJS_OAUTH.md` for patterns (30 minutes)
5. Review existing code with documentation in hand

---

## 🛡️ Security Checklist

Before pushing to production:

- [ ] All passwords hashed with Argon2id
- [ ] All OAuth tokens encrypted in database
- [ ] State parameter validated on all OAuth callbacks
- [ ] CSRF protection enabled on all auth endpoints
- [ ] Rate limiting configured on all auth routes
- [ ] HTTPS enforced in production
- [ ] HttpOnly cookies with secure flag
- [ ] SameSite=Lax for session cookies
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] XSS prevention (SvelteKit auto-escaping)
- [ ] Secrets stored in environment variables
- [ ] Client secrets never exposed to frontend
- [ ] Token expiration properly implemented
- [ ] Session expiration properly implemented
- [ ] Refresh token rotation implemented

---

## 📝 Best Practices

1. **Always Test First**
   - Write test → Watch it fail → Implement feature → Watch it pass
   - Never skip tests

2. **Never Store Secrets in Code**
   - Use environment variables
   - Use different secrets for dev/staging/production
   - Rotate secrets regularly

3. **Encrypt Everything Sensitive**
   - OAuth access tokens
   - OAuth refresh tokens
   - Never store plain text

4. **Validate Everything**
   - User input
   - OAuth responses
   - State parameters
   - Token expiration

5. **Log Securely**
   - Never log passwords or tokens
   - Log auth attempts for security monitoring
   - Include enough context for debugging

6. **Document As You Go**
   - Update docs when making architectural changes
   - Document decisions and reasoning
   - Keep examples up to date

---

## 🔗 External Resources

- **Lucia Auth Documentation:** https://lucia-auth.com/
- **SvelteKit Documentation:** https://kit.svelte.dev/
- **OAuth 2.0 Specification:** https://oauth.net/2/
- **42 Intra OAuth Guide:** https://api.intra.42.fr/apidoc/guides/web_application_flow
- **Argon2id Paper:** https://github.com/P-H-C/phc-winner-argon2
- **OWASP Auth Cheatsheet:** https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

## 📞 Questions or Issues?

If you encounter issues during implementation:

1. Check the relevant architecture document first
2. Review the reference material for similar patterns
3. Check existing tests for examples
4. Search Lucia Auth docs for specific issues
5. Review SvelteKit docs for framework-specific questions

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Living Document - Update as architecture evolves
