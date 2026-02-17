# OAuth Implementation Checklist

**Project:** ft_transcendence  
**Date Started:** ___________  
**Date Completed:** ___________  
**Implemented By:** ___________

---

## ✅ Pre-Implementation

- [ ] Read `OAUTH_IMPLEMENTATION_SUMMARY.md`
- [ ] Read `LUCIA_OAUTH_IMPLEMENTATION.md`
- [ ] Bookmark `OAUTH_QUICK_REFERENCE.md`
- [ ] Node.js v18+ installed
- [ ] PostgreSQL running
- [ ] Docker environment working
- [ ] Lucia Auth already configured
- [ ] Database migrations working

---

## 🔧 Setup Phase

### OAuth Application Registration

- [ ] **42 Intra OAuth App Created**
  - [ ] Client ID copied to `.env`
  - [ ] Client Secret copied to `.env`
  - [ ] Redirect URI: `http://localhost:5173/login/42/callback`
  - [ ] Tested credentials work

- [ ] **GitHub OAuth App Created** (Optional)
  - [ ] Client ID copied to `.env`
  - [ ] Client Secret copied to `.env`
  - [ ] Redirect URI: `http://localhost:5173/login/github/callback`
  - [ ] Tested credentials work

- [ ] **Google OAuth App Created** (Optional)
  - [ ] Client ID copied to `.env`
  - [ ] Client Secret copied to `.env`
  - [ ] Redirect URI configured
  - [ ] Tested credentials work

### Environment Configuration

```bash
# .env file checklist
- [ ] INTRA_42_CLIENT_ID set
- [ ] INTRA_42_CLIENT_SECRET set
- [ ] GITHUB_CLIENT_ID set (if using)
- [ ] GITHUB_CLIENT_SECRET set (if using)
- [ ] GOOGLE_CLIENT_ID set (if using)
- [ ] GOOGLE_CLIENT_SECRET set (if using)
- [ ] DATABASE_URL set
- [ ] NODE_ENV set
```

### Dependencies

```bash
- [ ] Run: npm install @lucia-auth/oauth
- [ ] Verify: package.json includes @lucia-auth/oauth
- [ ] Run: npm install (if needed)
- [ ] No dependency errors
```

---

## 🗄️ Database Phase

### Schema Updates

- [ ] **Add username column to users table**
  ```sql
  ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
  ```

- [ ] **Make hashed_password nullable**
  ```sql
  ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;
  ```

- [ ] **Create oauth_accounts table**
  ```sql
  CREATE TABLE oauth_accounts (
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (provider, provider_user_id)
  );
  ```

### Migrations

```bash
- [ ] Run: npm run db:generate
- [ ] Review generated migration
- [ ] Run: npm run db:migrate
- [ ] Verify tables exist in database
- [ ] Check foreign keys created correctly
```

### Type Updates

- [ ] **Update src/app.d.ts**
  ```typescript
  namespace Lucia {
    type DatabaseUserAttributes = {
      email: string;
      username: string;      // ✅ Added
      full_name: string | null;
    };
  }
  ```

- [ ] Run: `npx svelte-kit sync`
- [ ] No TypeScript errors
- [ ] IDE recognizes new types

---

## 🔌 Lucia Configuration Phase

### Provider Setup

- [ ] **Update src/lib/server/auth/lucia.ts**
  ```typescript
  - [ ] Import @lucia-auth/oauth providers
  - [ ] Import environment variables
  - [ ] Configure getUserAttributes
  - [ ] Initialize githubAuth (if using)
  - [ ] Initialize googleAuth (if using)
  - [ ] Export auth instance
  - [ ] Export OAuth provider instances
  ```

- [ ] **Create custom 42 Intra provider** (if needed)
  - [ ] Create src/lib/server/oauth/providers/intra-42.ts
  - [ ] Implement Intra42Provider class
  - [ ] Export intra42() factory function
  - [ ] Test provider initialization

- [ ] Run: `npx svelte-kit sync`
- [ ] No TypeScript errors

---

## 🛣️ Routes Phase

### 42 Intra OAuth Routes

- [ ] **Create redirect endpoint**
  - [ ] File: `src/routes/(api)/(auth)/login/42/+server.ts`
  - [ ] Generate authorization URL
  - [ ] Generate and store state parameter
  - [ ] Set state cookie (HttpOnly, secure in prod)
  - [ ] Redirect to 42 Intra
  - [ ] Test manually (should redirect to 42)

- [ ] **Create callback endpoint**
  - [ ] File: `src/routes/(api)/(auth)/login/42/callback/+server.ts`
  - [ ] Validate state parameter
  - [ ] Exchange code for token
  - [ ] Fetch user data from 42 API
  - [ ] Find or create user
  - [ ] Link OAuth account
  - [ ] Create Lucia session
  - [ ] Set session cookie
  - [ ] Clean up state cookie
  - [ ] Redirect to home page
  - [ ] Add error handling
  - [ ] Test full flow

### GitHub OAuth Routes (Optional)

- [ ] **Create redirect endpoint**
  - [ ] File: `src/routes/(api)/(auth)/login/github/+server.ts`
  - [ ] Same pattern as 42 Intra
  - [ ] Test manually

- [ ] **Create callback endpoint**
  - [ ] File: `src/routes/(api)/(auth)/login/github/callback/+server.ts`
  - [ ] Same pattern as 42 Intra
  - [ ] Test full flow

### Google OAuth Routes (Optional)

- [ ] **Create redirect endpoint**
  - [ ] File: `src/routes/(api)/(auth)/login/google/+server.ts`
  - [ ] Same pattern as 42 Intra
  - [ ] Test manually

- [ ] **Create callback endpoint**
  - [ ] File: `src/routes/(api)/(auth)/login/google/callback/+server.ts`
  - [ ] Same pattern as 42 Intra
  - [ ] Test full flow

---

## 🎨 UI Phase

### Login Page

- [ ] **Update src/routes/(auth)/login/+page.svelte**
  - [ ] Add "Sign in with 42" button/link
  - [ ] Add "Sign in with GitHub" button (optional)
  - [ ] Add "Sign in with Google" button (optional)
  - [ ] Style OAuth buttons
  - [ ] Test buttons redirect correctly

- [ ] **Update src/routes/(auth)/login/+page.server.ts**
  - [ ] Add load function
  - [ ] Redirect authenticated users to home
  - [ ] Test redirect works

### Profile Page

- [ ] **Update src/routes/+page.svelte**
  - [ ] Display user ID
  - [ ] Display email
  - [ ] Display username (from OAuth)
  - [ ] Display full name
  - [ ] Add logout form
  - [ ] Style profile page

- [ ] **Update src/routes/+page.server.ts**
  - [ ] Add load function
  - [ ] Get session and user data
  - [ ] Redirect unauthenticated users to login
  - [ ] Add logout action
  - [ ] Invalidate session on logout
  - [ ] Clear session cookie on logout
  - [ ] Redirect to login after logout
  - [ ] Test logout works

---

## 🔒 Security Phase

### State Parameter

- [ ] State generated with crypto random bytes (32+)
- [ ] State stored in HttpOnly cookie
- [ ] State validated on callback
- [ ] State cookie deleted after use
- [ ] State expires after 10 minutes
- [ ] Invalid state returns 400 error

### Cookies

- [ ] All auth cookies are HttpOnly
- [ ] Cookies are Secure in production
- [ ] Cookies have appropriate expiration
- [ ] SameSite set to 'lax'
- [ ] Path set to '/'
- [ ] State cookies cleaned up

### Error Handling

- [ ] OAuth errors caught and logged
- [ ] Generic error messages to users
- [ ] No sensitive data in error responses
- [ ] All try-catch blocks present
- [ ] Invalid code returns 400
- [ ] Server errors return 500

### Token Storage (if storing OAuth tokens)

- [ ] Tokens encrypted before database storage
- [ ] Encryption key in environment variable
- [ ] Tokens never logged
- [ ] Tokens never exposed to frontend

### Rate Limiting

- [ ] Rate limiting on OAuth endpoints
- [ ] Maximum 5 attempts per IP per 15 minutes
- [ ] Rate limit errors return 429

---

## 🧪 Testing Phase

### Unit Tests

- [ ] **State validation tests**
  - [ ] Test matching state passes
  - [ ] Test mismatched state fails
  - [ ] Test missing state fails

- [ ] **Token encryption tests** (if applicable)
  - [ ] Test encryption works
  - [ ] Test decryption works
  - [ ] Test round-trip (encrypt → decrypt)

- [ ] **User creation tests**
  - [ ] Test new user creation from OAuth
  - [ ] Test existing user login
  - [ ] Test OAuth account linking

- [ ] Run: `npm test`
- [ ] All unit tests pass

### Integration Tests

- [ ] **Full OAuth flow tests**
  - [ ] Mock 42 Intra responses
  - [ ] Test redirect generation
  - [ ] Test callback handling
  - [ ] Test user creation
  - [ ] Test session creation
  - [ ] Test cookie setting

- [ ] **Error scenario tests**
  - [ ] Test invalid code
  - [ ] Test expired state
  - [ ] Test network failures
  - [ ] Test database errors

- [ ] Run: `npm test`
- [ ] All integration tests pass

### E2E Tests

- [ ] **Login flow test**
  - [ ] Navigate to login page
  - [ ] Click OAuth button
  - [ ] Redirects to provider (check URL)
  - [ ] (Manual) Complete OAuth on provider
  - [ ] (Manual) Verify redirect to home
  - [ ] (Manual) Verify logged in

- [ ] **Logout test**
  - [ ] Click logout button
  - [ ] Session invalidated
  - [ ] Redirect to login page
  - [ ] Cannot access protected routes

- [ ] Run: `npm run test:e2e`
- [ ] All E2E tests pass

---

## 🚀 Production Phase

### Pre-Deployment

- [ ] **Update OAuth apps with production URLs**
  - [ ] 42 Intra: Add production redirect URI
  - [ ] GitHub: Add production redirect URI
  - [ ] Google: Add production redirect URI

- [ ] **Environment variables**
  - [ ] Production .env file created
  - [ ] All secrets different from development
  - [ ] NODE_ENV=production
  - [ ] Database URL for production
  - [ ] All OAuth credentials for production

- [ ] **Security review**
  - [ ] All cookies secure=true in production
  - [ ] HTTPS enforced
  - [ ] No secrets in code
  - [ ] Error messages generic
  - [ ] Rate limiting enabled

### Deployment

- [ ] Build application: `npm run build`
- [ ] No build errors
- [ ] Deploy to production server
- [ ] Verify environment variables set
- [ ] Verify database migrations run
- [ ] Verify HTTPS certificate valid

### Production Testing

- [ ] **Test 42 Intra OAuth in production**
  - [ ] Click login button
  - [ ] Redirects to 42 Intra
  - [ ] Complete OAuth flow
  - [ ] Redirected back to app
  - [ ] Logged in successfully

- [ ] **Test GitHub OAuth in production** (if using)
  - [ ] Same as above

- [ ] **Test Google OAuth in production** (if using)
  - [ ] Same as above

- [ ] **Test logout in production**
  - [ ] Logout works
  - [ ] Session cleared
  - [ ] Redirected to login

### Monitoring

- [ ] Set up error logging
- [ ] Monitor OAuth success rate
- [ ] Monitor OAuth error rate
- [ ] Set up alerts for failures
- [ ] Check logs for security issues

---

## 📊 Final Verification

### Functionality

- [ ] Users can log in with 42 Intra
- [ ] Users can log in with GitHub (if implemented)
- [ ] Users can log in with Google (if implemented)
- [ ] Profile page shows OAuth username
- [ ] Logout works correctly
- [ ] Session persists across page refreshes
- [ ] Session expires appropriately

### Security

- [ ] State parameter validated (CSRF protection)
- [ ] Cookies are HttpOnly
- [ ] Cookies are Secure in production
- [ ] HTTPS enforced in production
- [ ] Rate limiting active
- [ ] No secrets exposed
- [ ] Error messages generic
- [ ] Tokens encrypted (if stored)

### Testing

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Manual testing complete
- [ ] Production testing complete

### Documentation

- [ ] Code commented
- [ ] README updated
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Deployment process documented

---

## ✨ Success!

**Congratulations! Your OAuth implementation is complete!** 🎉

### Completion Checklist

- [ ] All phases completed
- [ ] All tests passing
- [ ] Production deployment successful
- [ ] No critical security issues
- [ ] Documentation updated
- [ ] Team trained on OAuth flow

**Implementation Time:** _____ hours  
**Challenges Encountered:** 
```
_______________________________________________________
_______________________________________________________
_______________________________________________________
```

**Lessons Learned:**
```
_______________________________________________________
_______________________________________________________
_______________________________________________________
```

---

## 🔄 Maintenance

### Regular Tasks

- [ ] **Weekly:** Check error logs
- [ ] **Monthly:** Review OAuth token expiration
- [ ] **Quarterly:** Security audit
- [ ] **As Needed:** Update OAuth credentials
- [ ] **As Needed:** Update OAuth scopes

### Future Enhancements

- [ ] Add more OAuth providers
- [ ] Implement account linking UI
- [ ] Add OAuth token refresh
- [ ] Add OAuth disconnect functionality
- [ ] Improve error messages
- [ ] Add OAuth analytics

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Ready for Use
