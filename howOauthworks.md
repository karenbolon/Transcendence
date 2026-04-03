# How OAuth Works

## Goal

This project supports OAuth sign-in with:

- GitHub
- 42 Intra

The OAuth implementation is designed to:

- let users register or sign in without a local password
- store provider tokens encrypted at rest
- reuse an existing local account when the provider email matches
- create a normal Lucia session after OAuth succeeds

## Main Files

- `src/routes/(api)/(auth)/login/+page.server.ts`
- `src/routes/(api)/(auth)/register/+page.server.ts`
- `src/routes/(api)/(auth)/auth/callback/github/+server.ts`
- `src/routes/(api)/(auth)/auth/callback/42/+server.ts`
- `src/lib/server/auth/oauth.ts`
- `src/lib/server/auth/token-encryption.ts`
- `src/db/schema/oauth_accounts.ts`
- `src/db/schema/oauth_states.ts`
- `src/hooks.server.ts`
- `drizzle/0012_add_oauth_auth.sql`

## High-Level Flow

### 1. User starts OAuth from login or register

The login and register actions call:

- `generateOAuthState()`
- `buildOAuthAuthorizationUrl(provider, state)`

The generated state is stored in the `oauth_states` table and the user is redirected to the provider authorization URL.

### 2. Provider redirects back to the callback route

The callback routes are:

- `/auth/callback/github`
- `/auth/callback/42`

Each callback:

- reads `code` and `state` from the query string
- validates the state against `oauth_states`
- marks the state as used to prevent replay
- exchanges the authorization code for tokens
- fetches the provider user profile

### 3. Local account resolution

The callback then resolves the local user in this order:

1. Look for an existing `oauth_accounts` row for `(provider, providerUserId)`.
2. If none exists, look for an existing local user by email.
3. If no user exists, create a new local user with `password_hash = null`.

This means OAuth users are first-class users in the same `users` table, but they may not have a local password.

### 4. Token storage

Provider tokens are encrypted before saving to `oauth_accounts`.

Stored fields include:

- provider
- provider user id
- local user id
- encrypted access token
- encrypted refresh token
- expiry
- scopes
- provider metadata

### 5. Session creation

After the local user is found or created, `createAndSetSession()` creates a Lucia session and sets the session cookie.

## Token Encryption

OAuth tokens are encrypted in `src/lib/server/auth/token-encryption.ts`.

Current behavior:

- uses AES-256-GCM
- requires `OAUTH_ENCRYPTION_KEY`
- expects a 64-character hex key
- stores encrypted values in the format:

`iv:authTag:ciphertext`

Available helpers:

- `initializeEncryptionKey()`
- `generateEncryptionKey()`
- `isTokenEncryptionConfigured()`
- `isValidEncryptedTokenFormat()`
- `encryptToken()`
- `decryptToken()`
- `isTokenValid()`

`src/hooks.server.ts` initializes the encryption configuration at startup.

## Database Design

### `oauth_accounts`

Purpose:

- link one provider identity to one local user
- store encrypted tokens

Important constraints:

- unique `(user_id, provider)`
- unique `(provider, provider_user_id)`

### `oauth_states`

Purpose:

- temporary CSRF protection for OAuth initiation

Each state:

- is unique
- expires after a short time
- is marked `used = true` immediately after a valid callback

## What Was Broken Before This Cleanup

These were the main problems found during review:

- duplicate callback routes existed in two route trees and caused SvelteKit route conflicts
- old callback files imported OAuth helper names that no longer existed
- two incompatible OAuth schema files existed for the same table
- OAuth migrations were duplicated and the Drizzle journal entry was malformed
- token encryption implementation, startup code, and tests had drifted apart
- OAuth-only users could be created with `password_hash = null` but could not self-delete from the existing modal flow

## What Was Fixed

- kept one canonical callback implementation under `src/routes/(api)/(auth)/auth/callback/*`
- removed duplicate legacy callback files
- kept one canonical schema file: `src/db/schema/oauth_accounts.ts`
- replaced duplicate OAuth migration files with `drizzle/0012_add_oauth_auth.sql`
- repaired the Drizzle journal entry
- restored the token-encryption helper API expected by the app
- aligned encryption behavior with the active auth tests
- allowed account deletion to proceed for OAuth-only users without requiring a password

## Important Implementation Notes

### Password-null users

OAuth-created users use:

- `password_hash = null`

That means:

- password login must reject them
- email/password settings routes must reject password-based updates for them
- account deletion must not hard-require a password for them

### Environment variables

OAuth uses provider-specific environment variables such as:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_AUTHORIZE_URL`
- `GITHUB_TOKEN_URL`
- `GITHUB_USER_URL`
- `GITHUB_USER_EMAILS_URL`
- `GITHUB_CALLBACK_URL`
- `FORTYTWO_CLIENT_ID`
- `FORTYTWO_CLIENT_SECRET`
- `FORTYTWO_AUTHORIZE_URL`
- `FORTYTWO_TOKEN_URL`
- `FORTYTWO_USER_URL`
- `FORTYTWO_CALLBACK_URL`
- `OAUTH_ENCRYPTION_KEY`

For provider `42`, the env prefix is `FORTYTWO_`.

## Testing Notes

Useful commands:

- `npm run check`
- `npm run test:unit -- --run src/lib/server/auth/test_auth/token-encryption.test.ts`

During cleanup, the token-encryption test suite passed after the API contract was restored.

## Remaining Notes

- `npm run check` still reports toast accessibility warnings in `src/lib/component/common/Toast.svelte`, but no TypeScript or route errors remain.
- If production callback URLs are finalized later in `main`, keep them consistent with `*_CALLBACK_URL` values rather than mixing multiple redirect URI patterns.

## Recommended Future Improvements

- add dedicated tests for OAuth callback flows with mocked provider responses
- add UI that clearly tells OAuth-only users when password fields are optional or unavailable
- add connected-account management if users will later be able to link/unlink providers
- document the final production callback URLs once deployment is settled
