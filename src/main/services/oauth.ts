import { app, shell, safeStorage } from 'electron'
import { createServer, type Server } from 'http'
import { URL } from 'url'
import { dirname, join, resolve } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import crypto from 'crypto'
import { readDotEnvFile, resolveOAuthConfiguration } from './oauth-config'

interface TokenData {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']
const TOKEN_FILE = 'auth-tokens.enc'
const DOT_ENV_FILE = '.env'

function getTokenPath(): string {
  return join(app.getPath('userData'), TOKEN_FILE)
}

let cachedDotEnvValues: Record<string, string> | null = null

function getDotEnvSearchPaths(): string[] {
  const seen = new Set<string>()
  const candidates: string[] = []

  const addCandidate = (path: string): void => {
    const resolvedPath = resolve(path)
    if (seen.has(resolvedPath)) return
    seen.add(resolvedPath)
    candidates.push(resolvedPath)
  }

  const appPath = app.getAppPath()
  let current = resolve(appPath)

  for (let index = 0; index < 6; index += 1) {
    addCandidate(join(current, DOT_ENV_FILE))

    const parent = dirname(current)
    if (parent === current) {
      break
    }

    current = parent
  }

  return candidates
}

function getRuntimeDotEnvValues(): Record<string, string> {
  if (cachedDotEnvValues) {
    return cachedDotEnvValues
  }

  for (const candidate of getDotEnvSearchPaths()) {
    const values = readDotEnvFile(candidate)
    if (Object.keys(values).length > 0) {
      cachedDotEnvValues = values
      return values
    }
  }

  cachedDotEnvValues = {}
  return cachedDotEnvValues
}

export function getOAuthConfigurationStatus(): {
  oauthConfigured: boolean
  configurationError?: string
} {
  const resolved = resolveOAuthConfiguration(process.env, getRuntimeDotEnvValues())

  return {
    oauthConfigured: resolved.oauthConfigured,
    configurationError: resolved.configurationError
  }
}

function getClientCredentials(): { clientId: string; clientSecret: string } {
  const resolved = resolveOAuthConfiguration(process.env, getRuntimeDotEnvValues())

  if (!resolved.oauthConfigured || !resolved.clientId || !resolved.clientSecret) {
    throw new Error(resolved.configurationError ?? 'OAuth credentials are not configured.')
  }

  return { clientId: resolved.clientId, clientSecret: resolved.clientSecret }
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

// ── Token Persistence (using safeStorage for encryption) ──

function saveTokens(tokens: StoredTokens): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure token storage is unavailable on this device.')
  }

  const json = JSON.stringify(tokens)
  const encrypted = safeStorage.encryptString(json)
  writeFileSync(getTokenPath(), encrypted)
}

function loadTokens(): StoredTokens | null {
  const tokenPath = getTokenPath()
  if (!existsSync(tokenPath)) return null
  if (!safeStorage.isEncryptionAvailable()) return null

  try {
    const raw = readFileSync(tokenPath)
    const json = safeStorage.decryptString(raw)
    return JSON.parse(json) as StoredTokens
  } catch {
    return null
  }
}

function clearTokens(): void {
  const tokenPath = getTokenPath()
  if (existsSync(tokenPath)) {
    unlinkSync(tokenPath)
  }
}

// ── OAuth Flow ──

let callbackServer: Server | null = null
let expectedOAuthState: string | null = null
let authTimeout: ReturnType<typeof setTimeout> | null = null

async function startOAuthFlow(): Promise<StoredTokens> {
  const { clientId, clientSecret } = getClientCredentials()
  const { verifier, challenge } = generatePKCE()
  expectedOAuthState = crypto.randomBytes(16).toString('hex')

  return new Promise((resolve, reject) => {
    let settled = false

    const settle = (fn: () => void): void => {
      if (settled) return
      settled = true
      fn()
    }

    // Start local HTTP server on a random port
    callbackServer = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1`)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')
        const state = url.searchParams.get('state')

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(
            '<html><body><h2>Authorization denied</h2><p>You can close this window.</p></body></html>'
          )
          settle(() => reject(new Error(`OAuth error: ${error}`)))
          cleanup()
          return
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end('<html><body><h2>Missing authorization code</h2></body></html>')
          return
        }

        if (!state || state !== expectedOAuthState) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end('<html><body><h2>Invalid OAuth state</h2></body></html>')
          settle(() => reject(new Error('OAuth state validation failed')))
          cleanup()
          return
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `http://127.0.0.1:${(callbackServer?.address() as { port: number })?.port}`,
            grant_type: 'authorization_code',
            code_verifier: verifier
          })
        })

        if (!tokenResponse.ok) {
          const errBody = await tokenResponse.text()
          throw new Error(`Token exchange failed: ${errBody}`)
        }

        const tokenData = (await tokenResponse.json()) as TokenData

        const tokens: StoredTokens = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + tokenData.expires_in * 1000
        }

        saveTokens(tokens)

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<html><body style="font-family:system-ui;text-align:center;padding:40px">' +
            '<h2>Signed in to ChatControl</h2>' +
            '<p>You can close this window and return to the app.</p>' +
            '</body></html>'
        )

        settle(() => resolve(tokens))
        cleanup()
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2>Authentication failed</h2></body></html>')
        settle(() => reject(err))
        cleanup()
      }
    })

    callbackServer.listen(0, '127.0.0.1', () => {
      const port = (callbackServer!.address() as { port: number }).port
      const redirectUri = `http://127.0.0.1:${port}`

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', SCOPES.join(' '))
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')
      authUrl.searchParams.set('code_challenge', challenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')
      authUrl.searchParams.set('state', expectedOAuthState!)

      shell.openExternal(authUrl.toString())
    })

    // Timeout after 5 minutes
    authTimeout = setTimeout(
      () => {
        settle(() => reject(new Error('OAuth flow timed out')))
        cleanup()
      },
      5 * 60 * 1000
    )
  })
}

function cleanup(): void {
  expectedOAuthState = null
  if (authTimeout) {
    clearTimeout(authTimeout)
    authTimeout = null
  }
  if (callbackServer) {
    callbackServer.close()
    callbackServer = null
  }
}

// ── Token Refresh ──

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const { clientId, clientSecret } = getClientCredentials()

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Token refresh failed: ${errBody}`)
  }

  const tokenData = (await response.json()) as TokenData

  const tokens: StoredTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || refreshToken,
    expiresAt: Date.now() + tokenData.expires_in * 1000
  }

  saveTokens(tokens)
  return tokens
}

// ── Public API ──

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokens()
  if (!tokens) return null

  // Refresh if within 5 minutes of expiry
  if (Date.now() > tokens.expiresAt - 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken)
      return refreshed.accessToken
    } catch {
      clearTokens()
      return null
    }
  }

  return tokens.accessToken
}

export async function login(): Promise<StoredTokens> {
  return startOAuthFlow()
}

export function logout(): void {
  clearTokens()
  cleanup()
}

export function hasStoredTokens(): boolean {
  return loadTokens() !== null
}

export { loadTokens, type StoredTokens }
