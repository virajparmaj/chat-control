import { Layers, Youtube, Shield, AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

export function LoginScreen(): React.JSX.Element {
  const { login, loading, error, status } = useAuthStore()
  const configurationMessage =
    !status.oauthConfigured &&
    (status.configurationError ??
      'OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then relaunch ChatControl.')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Layers className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ChatControl</h1>
            <p className="text-xs text-muted-foreground">Super Chat Inbox</p>
          </div>
        </div>

        {/* Description */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Never miss a Super Chat during your livestream. Track, triage, and respond to paid
            messages in a clean overlay.
          </p>
        </div>

        {/* Sign in button */}
        <button
          onClick={login}
          disabled={loading || !status.oauthConfigured}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Youtube className="w-5 h-5 text-red-600" />
          )}
          {loading ? 'Signing in...' : 'Sign in with YouTube'}
        </button>

        {configurationMessage && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-secondary border border-border">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">OAuth setup required</p>
              <p className="text-xs text-muted-foreground">{configurationMessage}</p>
            </div>
          </div>
        )}

        {!configurationMessage && error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Trust indicators */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Uses official YouTube API only</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Read-only access to your live chat</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>All data stays on your device</span>
          </div>
        </div>
      </div>
    </div>
  )
}
