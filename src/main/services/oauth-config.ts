import { existsSync, readFileSync } from 'fs'

const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID'
const GOOGLE_CLIENT_SECRET = 'GOOGLE_CLIENT_SECRET'

export interface ResolvedOAuthConfiguration {
  oauthConfigured: boolean
  configurationError?: string
  clientId?: string
  clientSecret?: string
}

function normalizeResolvedValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function unquoteValue(rawValue: string): string {
  const trimmed = rawValue.trim()

  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    const inner = trimmed.slice(1, -1)
    if (trimmed.startsWith('"')) {
      return inner
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
    }

    return inner
  }

  const inlineCommentIndex = trimmed.indexOf(' #')
  return inlineCommentIndex >= 0 ? trimmed.slice(0, inlineCommentIndex).trim() : trimmed
}

export function parseDotEnv(content: string): Record<string, string> {
  const values: Record<string, string> = {}

  for (const rawLine of content.split(/\r?\n/u)) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const normalizedLine = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
    const separatorIndex = normalizedLine.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = normalizedLine.slice(0, separatorIndex).trim()
    if (!key) continue

    const value = normalizedLine.slice(separatorIndex + 1)
    values[key] = unquoteValue(value)
  }

  return values
}

export function readDotEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {}
  }

  try {
    return parseDotEnv(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

export function resolveOAuthConfiguration(
  env: NodeJS.ProcessEnv,
  dotEnvValues: Record<string, string> = {}
): ResolvedOAuthConfiguration {
  const clientId =
    normalizeResolvedValue(env[GOOGLE_CLIENT_ID]) ?? normalizeResolvedValue(dotEnvValues[GOOGLE_CLIENT_ID])
  const clientSecret =
    normalizeResolvedValue(env[GOOGLE_CLIENT_SECRET]) ??
    normalizeResolvedValue(dotEnvValues[GOOGLE_CLIENT_SECRET])

  if (!clientId || !clientSecret) {
    return {
      oauthConfigured: false,
      configurationError:
        'OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then relaunch ChatControl. For local development, you can place them in .env.'
    }
  }

  return {
    oauthConfigured: true,
    clientId,
    clientSecret
  }
}
