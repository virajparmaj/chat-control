import { describe, expect, it } from 'vitest'
import { parseDotEnv, resolveOAuthConfiguration } from './oauth-config'

describe('parseDotEnv', () => {
  it('parses basic dotenv entries and ignores comments', () => {
    expect(
      parseDotEnv(`
# comment
GOOGLE_CLIENT_ID=test-client.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET="quoted-secret"
export UNUSED=value
`)
    ).toEqual({
      GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'quoted-secret',
      UNUSED: 'value'
    })
  })
})

describe('resolveOAuthConfiguration', () => {
  it('uses process env values when present', () => {
    expect(
      resolveOAuthConfiguration(
        {
          GOOGLE_CLIENT_ID: 'shell-client.apps.googleusercontent.com',
          GOOGLE_CLIENT_SECRET: 'shell-secret'
        },
        {
          GOOGLE_CLIENT_ID: 'dotenv-client.apps.googleusercontent.com',
          GOOGLE_CLIENT_SECRET: 'dotenv-secret'
        }
      )
    ).toEqual({
      oauthConfigured: true,
      clientId: 'shell-client.apps.googleusercontent.com',
      clientSecret: 'shell-secret'
    })
  })

  it('falls back to dotenv values when process env is missing', () => {
    expect(
      resolveOAuthConfiguration(
        {},
        parseDotEnv(`
GOOGLE_CLIENT_ID=dotenv-client.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=dotenv-secret
`)
      )
    ).toEqual({
      oauthConfigured: true,
      clientId: 'dotenv-client.apps.googleusercontent.com',
      clientSecret: 'dotenv-secret'
    })
  })

  it('returns a configuration error when either required variable is missing', () => {
    expect(
      resolveOAuthConfiguration(
        {},
        {
          GOOGLE_CLIENT_ID: 'only-client.apps.googleusercontent.com'
        }
      )
    ).toEqual({
      oauthConfigured: false,
      configurationError:
        'OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then relaunch ChatControl. For local development, you can place them in .env.'
    })
  })
})
