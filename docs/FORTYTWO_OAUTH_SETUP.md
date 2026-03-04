# 42 Intra OAuth Setup Guide

Complete guide for setting up 42 Intra OAuth authentication for ft_transcendence.

---

## 📋 Prerequisites

- 42 Intra account
- Access to 42 API applications

---

## 🚀 Step 1: Create a 42 API Application

### 1.1 Navigate to 42 API Dashboard

Go to: **https://profile.intra.42.fr/oauth/applications**

Or:
1. Login to intra.42.fr
2. Click your profile icon (top right)
3. Go to "Settings" → "API" → "Register a new application"

### 1.2 Register New Application

Click **"New Application"** button

### 1.3 Fill Application Details

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `ft_transcendence` | Or your preferred app name |
| **Redirect URI** | `http://localhost:5173/auth/callback/42` | **CRITICAL**: Must match exactly |
| **Scopes** | `public` | Basic scope for public profile info |

**Important Notes:**
- ⚠️ **Redirect URI must be EXACT** - no trailing slash
- For localhost development, use `http://localhost:5173`
- For production, replace with your production URL: `https://yourdomain.com/auth/callback/42`

### 1.4 Save Application

Click **"Save"** or **"Submit"**

### 1.5 Get Your Credentials

After creation, you'll see:

```
Application ID (UID):     abc123def456...
Secret:                   xyz789abc123... (click to reveal)
```

- **UID** = Your Client ID
- **Secret** = Your Client Secret

⚠️ **Save these immediately!** You'll need them in the next step.

---

## 🔧 Step 2: Configure Environment Variables

### 2.1 Open Your `.env` File

```bash
cd /home/j/Desktop/Transcendence
nano .env  # or use your preferred editor
```

### 2.2 Add 42 OAuth Credentials

Add these lines to your `.env`:

```bash
# 42 Intra OAuth
FORTYTWO_CLIENT_ID=your_uid_here_abc123def456
FORTYTWO_CLIENT_SECRET=your_secret_here_xyz789abc123

# OAuth Redirect URI (should already exist)
PUBLIC_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

### 2.3 Example `.env` File

Your complete `.env` should look like:

```bash
# Database
DATABASE_URL=postgres://root:mysecretpassword@localhost:5432/db

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.1234567890abcdef
GITHUB_CLIENT_SECRET=github_secret_here

# 42 Intra OAuth
FORTYTWO_CLIENT_ID=abc123def456...
FORTYTWO_CLIENT_SECRET=xyz789abc123...

# OAuth Settings
PUBLIC_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

### 2.4 Save and Close

Save the file (Ctrl+O, Enter, Ctrl+X for nano)

---

## ✅ Step 3: Test the OAuth Flow

### 3.1 Start Development Server

```bash
npm run dev
```

Or with make:
```bash
make dev
```

### 3.2 Navigate to Login Page

Open your browser to: **http://localhost:5173/login**

### 3.3 Click "42 Intra" Button

You should see two OAuth buttons:
- GitHub
- 42 Intra

Click **"42 Intra"**

### 3.4 Authorize on 42 Intra

You'll be redirected to the 42 Intra authorization page:

```
https://api.intra.42.fr/oauth/authorize?...
```

Click **"Authorize"**

### 3.5 Verify Success

After authorization:
1. ✅ Redirected back to your app
2. ✅ Logged in automatically
3. ✅ Redirected to `/dashboard`
4. ✅ New user account created (or existing account recognized)

---

## 🧪 Test Scenarios

### Scenario 1: New User Registration

1. Logout (if logged in)
2. Clear browser data for localhost
3. Click "42 Intra" button
4. Authorize
5. **Expected:** New account created with 42 Intra data

### Scenario 2: Returning User

1. Logout
2. Click "42 Intra" button again
3. **Expected:** Recognized as existing user, logged in immediately

### Scenario 3: Account Linking

1. Create account with email: `your42email@student.42.fr` + password
2. Logout
3. Login with 42 Intra using same email
4. **Expected:** 42 account linked to existing password account

### Scenario 4: Multiple OAuth Providers

1. Login with GitHub
2. Logout
3. Login with 42 Intra (same email)
4. **Expected:** Both OAuth accounts linked to same user

---

## 🔍 How It Works

### OAuth Flow Diagram

```
┌─────────────┐
│  User Login │
│    Page     │
└──────┬──────┘
       │ Click "42 Intra"
       ↓
┌─────────────────────┐
│ /login/42           │
│ Generate state      │
│ Store in cookie     │
└──────┬──────────────┘
       │ Redirect
       ↓
┌─────────────────────────────┐
│ 42 Intra Authorization Page │
│ https://api.intra.42.fr/... │
└──────┬──────────────────────┘
       │ User clicks "Authorize"
       ↓
┌────────────────────────────┐
│ /auth/callback/42          │
│ ?code=ABC&state=XYZ        │
├────────────────────────────┤
│ 1. Validate state (CSRF)   │
│ 2. Exchange code for token │
│ 3. Fetch user info from 42 │
│ 4. Create/link account     │
│ 5. Create session          │
└──────┬─────────────────────┘
       │ Redirect
       ↓
┌─────────────┐
│  Dashboard  │
│ (Logged in) │
└─────────────┘
```

### User Data Retrieved from 42

```typescript
{
  id: "123456",                    // 42 user ID
  login: "username",               // 42 username
  email: "user@student.42.fr",    // 42 email
  displayname: "Full Name",        // Display name
  image: {
    link: "https://cdn.42.fr/..."  // Avatar URL
  }
}
```

---

## 🐛 Troubleshooting

### Issue: "OAuth state mismatch"

**Cause:** CSRF protection failure

**Solutions:**
- Clear browser cookies
- Try again
- Make sure cookies are enabled

### Issue: "No authorization code provided"

**Cause:** OAuth flow interrupted

**Solutions:**
- Check redirect URI matches exactly: `http://localhost:5173/auth/callback/42`
- No trailing slash!
- No extra parameters

### Issue: "Email is required"

**Cause:** 42 profile doesn't have email

**Solutions:**
- This is rare for 42 accounts
- Check your 42 profile settings
- Contact 42 support if email is missing

### Issue: "Failed to exchange code for token"

**Cause:** Invalid credentials or configuration

**Solutions:**
1. Verify `FORTYTWO_CLIENT_ID` is correct (UID from 42 dashboard)
2. Verify `FORTYTWO_CLIENT_SECRET` is correct
3. Check for extra spaces in `.env` file
4. Regenerate credentials if needed

### Issue: "Invalid redirect_uri"

**Cause:** Redirect URI mismatch

**Solutions:**
1. Check 42 app settings: `http://localhost:5173/auth/callback/42`
2. Check `.env`: `PUBLIC_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback`
3. Must match exactly (no trailing slashes!)

### Issue: Can't find 42 Intra button

**Solutions:**
- Navigate to `http://localhost:5173/login` or `/register`
- Restart dev server: `npm run dev`
- Clear browser cache

---

## 🔐 Security Notes

### ✅ Implemented
- CSRF protection via state parameter
- HttpOnly cookies
- Session management
- Foreign key constraints

### ⚠️ TODO Before Production
- Token encryption (currently plain text!)
- Secure cookies (set `secure: true` for HTTPS)
- Rate limiting on OAuth endpoints
- Token refresh mechanism

See **`OAUTH_SECURITY_TODO.md`** for complete security checklist.

---

## 📁 Implementation Files

### Created Files

1. **`src/routes/(api)/(auth)/login/42/+server.ts`**
   - Initiates 42 OAuth flow
   - Generates CSRF state
   - Redirects to 42 authorization

2. **`src/routes/(api)/auth/callback/42/+server.ts`**
   - Handles OAuth callback
   - Validates state
   - Exchanges code for token
   - Creates/links user account
   - Creates session

### Modified Files

1. **`src/routes/(api)/(auth)/login/+page.svelte`**
   - Added 42 Intra button

2. **`src/routes/(api)/(auth)/register/+page.svelte`**
   - Added 42 Intra button

3. **`src/lib/server/auth/oauth.ts`**
   - Already had 42 configuration

---

## 📊 Database Changes

### OAuth Accounts Table

When you login with 42 Intra, a record is created:

```sql
INSERT INTO oauth_accounts (
  provider,
  provider_user_id,
  user_id,
  access_token,     -- TODO: Encrypt!
  refresh_token,    -- TODO: Encrypt!
  expires_at,
  created_at,
  updated_at
) VALUES (
  '42',
  '123456',         -- Your 42 user ID
  1,                -- Your app user ID
  'token_here',
  'refresh_here',
  '2026-03-11 12:00:00',
  NOW(),
  NOW()
);
```

### Users Table

New users created via 42 OAuth:

```sql
INSERT INTO users (
  username,
  email,
  name,
  password_hash,    -- NULL for OAuth-only users
  avatar_url,
  created_at
) VALUES (
  'username',
  'user@student.42.fr',
  'Full Name',
  NULL,             -- No password needed!
  'https://cdn.42.fr/...',
  NOW()
);
```

---

## 🎯 Production Deployment

### Update Redirect URI

1. Go to: https://profile.intra.42.fr/oauth/applications
2. Edit your application
3. Change Redirect URI to: `https://yourdomain.com/auth/callback/42`
4. Update `.env` on production server:

```bash
PUBLIC_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/callback
```

5. Set secure cookies:

```typescript
// In login/42/+server.ts
cookies.set('oauth_state', state, {
  secure: true,  // Enable for production HTTPS
  // ...
});
```

---

## ✅ Verification Checklist

- [ ] Created 42 API application
- [ ] Added credentials to `.env`
- [ ] Started dev server
- [ ] Tested 42 login flow
- [ ] Verified new user creation
- [ ] Tested returning user login
- [ ] Tested account linking (same email)
- [ ] Tested multiple OAuth providers

---

## 📚 Additional Resources

- **42 API Documentation:** https://api.intra.42.fr/apidoc
- **42 OAuth Guide:** https://api.intra.42.fr/apidoc/guides/web_application_flow
- **Security Checklist:** See `OAUTH_SECURITY_TODO.md`
- **GitHub OAuth Setup:** See `GITHUB_OAUTH_SETUP.md`

---

## 🆘 Getting Help

### Common Issues

1. **"Application not found"** → Check CLIENT_ID matches UID
2. **"Invalid redirect_uri"** → Check exact match in 42 dashboard
3. **"State mismatch"** → Clear cookies and try again
4. **"Email required"** → Rare; contact 42 support

### Debugging

Enable detailed logging:

```typescript
// In callback/42/+server.ts
console.log('Token data:', tokenData);
console.log('OAuth user:', oauthUser);
```

Check database:

```bash
npm run db:studio
# Navigate to oauth_accounts table
```

---

**Last Updated:** February 11, 2026  
**Status:** ✅ Implementation Complete  
**Next Step:** Configure your 42 API application and test!
