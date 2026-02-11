# GitHub OAuth Setup Guide

This guide will walk you through setting up GitHub OAuth authentication for the Pong application.

## Prerequisites

- A GitHub account
- Access to GitHub's Developer Settings

## Step 1: Create a GitHub OAuth App

1. **Go to GitHub Developer Settings**
   - Navigate to https://github.com/settings/developers
   - Or: Click your profile → Settings → Developer settings → OAuth Apps

2. **Create New OAuth App**
   - Click "New OAuth App"
   - Fill in the application details:

### Application Details

| Field | Value | Description |
|-------|-------|-------------|
| **Application name** | `ft_transcendence` (or your preferred name) | The name users will see when authorizing |
| **Homepage URL** | `http://localhost:5173` | Your app's homepage (use production URL in production) |
| **Application description** | `Multiplayer Pong Game` | Optional description |
| **Authorization callback URL** | `http://localhost:5173/auth/callback/github` | **CRITICAL**: Must match exactly |

3. **Register Application**
   - Click "Register application"
   - You'll be redirected to your app's settings page

## Step 2: Get Your OAuth Credentials

After creating the app, you'll see:

1. **Client ID** - A public identifier (looks like: `Iv1.1234567890abcdef`)
2. **Client Secret** - Click "Generate a new client secret"
   - ⚠️ **IMPORTANT**: Copy this immediately - you won't be able to see it again!

## Step 3: Update Environment Variables

1. **Open your `.env` file** in the project root

2. **Add your GitHub OAuth credentials**:

```env
# GitHub OAuth - Replace with your actual credentials
GITHUB_CLIENT_ID=Iv1.1234567890abcdef
GITHUB_CLIENT_SECRET=your_generated_secret_here_abc123xyz789

# OAuth Redirect URL (already configured)
PUBLIC_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

3. **Save the file**

## Step 4: Test the OAuth Flow

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the login page**:
   - Go to `http://localhost:5173/login`

3. **Click "GitHub" button**:
   - You'll be redirected to GitHub's authorization page
   - GitHub will ask you to authorize the application
   - Click "Authorize"

4. **Verify success**:
   - You should be redirected back to your app
   - If successful, you'll be logged in and redirected to `/dashboard`
   - A new user account will be created (or linked if email already exists)

## Troubleshooting

### Error: "OAuth state mismatch"
- **Cause**: CSRF protection failure
- **Solution**: Clear cookies and try again. Make sure you're not blocking cookies.

### Error: "No authorization code provided"
- **Cause**: GitHub didn't send the authorization code
- **Solution**: Check that your callback URL matches exactly in GitHub settings

### Error: "Email is required"
- **Cause**: Your GitHub email is private
- **Solution**: 
  1. Go to https://github.com/settings/emails
  2. Uncheck "Keep my email addresses private"
  3. Or: Use a public email address in your GitHub profile

### Error: "Failed to exchange code for token"
- **Cause**: Invalid client credentials
- **Solution**: 
  - Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
  - Regenerate the client secret if needed

### Redirect URL Mismatch
- **Cause**: Callback URL in GitHub settings doesn't match your app
- **Solution**: 
  - GitHub setting: `http://localhost:5173/auth/callback/github`
  - Must match exactly (no trailing slash, correct port)

## Production Deployment

When deploying to production:

1. **Update GitHub OAuth App**:
   - Add production callback URL: `https://yourdomain.com/auth/callback/github`
   - Or create a separate OAuth app for production

2. **Update Environment Variables**:
   ```env
   PUBLIC_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/callback
   GITHUB_CLIENT_ID=your_production_client_id
   GITHUB_CLIENT_SECRET=your_production_secret
   ```

3. **Security Considerations**:
   - Never commit `.env` file to git
   - Use environment variables in your hosting platform
   - Enable HTTPS in production
   - Set `secure: true` for cookies in production

## OAuth Flow Diagram

```
User                    App                     GitHub
 |                       |                         |
 |--[Click GitHub]------>|                         |
 |                       |--[Redirect]------------>|
 |                       |                         |
 |<-------[Auth Page]----------------------[Show]--|
 |                       |                         |
 |--[Authorize]----------|------------------------>|
 |                       |                         |
 |                       |<--[Code + State]--------|
 |                       |                         |
 |                       |--[Exchange Code]------->|
 |                       |                         |
 |                       |<--[Access Token]--------|
 |                       |                         |
 |                       |--[Fetch User Info]----->|
 |                       |                         |
 |                       |<--[User Data]-----------|
 |                       |                         |
 |<--[Redirect /dashboard]-|                      |
 |   [Session Created]   |                         |
```

## Database Schema

OAuth accounts are stored in the `oauth_accounts` table:

```sql
CREATE TABLE oauth_accounts (
  provider TEXT NOT NULL,           -- 'github'
  provider_user_id TEXT NOT NULL,   -- GitHub user ID
  user_id INTEGER NOT NULL,         -- Link to users table
  access_token TEXT,                -- OAuth access token (TODO: encrypt)
  refresh_token TEXT,               -- OAuth refresh token (if provided)
  expires_at TIMESTAMP,             -- Token expiration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Features Implemented

✅ **OAuth Login**: Users can sign in with GitHub  
✅ **Account Creation**: New users are automatically created  
✅ **Account Linking**: Existing users (by email) can link GitHub  
✅ **CSRF Protection**: State parameter prevents CSRF attacks  
✅ **Token Storage**: Access tokens are stored (TODO: encrypt before production)  
✅ **Session Management**: Lucia sessions work seamlessly with OAuth  
✅ **Username Handling**: Duplicate usernames are handled gracefully  

## Security Notes

⚠️ **TODO Before Production**:
1. **Encrypt OAuth tokens** in the database (use `@oslojs/crypto`)
2. **Implement token refresh** logic for expired tokens
3. **Add rate limiting** to OAuth endpoints
4. **Enable HTTPS** and set `secure: true` for cookies
5. **Validate redirect URIs** more strictly

## Testing Checklist

- [ ] Fresh OAuth login creates new user
- [ ] Existing user (by email) links GitHub account
- [ ] Multiple logins with same GitHub account work
- [ ] User data is correctly populated (username, email, name, avatar)
- [ ] Session is created and works correctly
- [ ] User can access protected routes after OAuth login
- [ ] Logout works correctly
- [ ] CSRF protection works (state validation)

## Next Steps

1. **Test the implementation** thoroughly
2. **Add 42 Intra OAuth** (similar pattern)
3. **Implement token encryption** for security
4. **Add account linking UI** in user settings
5. **Implement token refresh** for long-lived sessions

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify your GitHub OAuth app settings
3. Ensure environment variables are set correctly
4. Test with a fresh browser session (clear cookies)

Happy coding! 🚀
