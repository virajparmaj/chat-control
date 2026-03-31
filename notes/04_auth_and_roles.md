# Auth And Roles

## Auth Model
ChatControl uses Google OAuth for desktop apps with PKCE and a loopback HTTP callback.

Scope in use:
- `https://www.googleapis.com/auth/youtube.readonly`

That scope is enough for:
- reading the authenticated creator's channel identity
- listing active broadcasts
- polling live chat messages

## OAuth Flow
1. Main generates PKCE verifier/challenge and a random OAuth `state`.
2. Main starts a loopback HTTP server on `127.0.0.1`.
3. Browser opens the Google consent flow.
4. Callback returns to the local server.
5. Main validates `state`, exchanges the code for tokens, and stores them using Electron `safeStorage`.

## Token Storage
- Tokens are stored in the app user-data directory as an encrypted blob.
- If `safeStorage` encryption is unavailable, login fails closed instead of writing plaintext secrets.
- Refresh happens automatically when the token is near expiry.
- Failed refresh clears stored tokens.

## Logout Behavior
Logout now:
- finalizes any active monitoring session
- clears stored tokens
- clears any in-flight OAuth callback state

## Roles
There is no multi-user RBAC model in the current product.

Current assumptions:
- one desktop app instance
- one locally authenticated creator account at a time
- local history belongs to the current machine profile, not a shared workspace

## Security Decisions In Force
- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- no raw `ipcRenderer` exposure in renderer
- no plaintext token fallback
