import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

type Mode = 'signIn' | 'signUp'

export default function AuthScreen() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-100 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">
            Supabase yapılandırması gerekli
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Proje kökünde{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
              .env
            </code>{' '}
            dosyası oluşturun ve şu değişkenleri ekleyin (Supabase proje ayarları →
            API):
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-left text-xs text-zinc-100">
            {`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
          </pre>
          <p className="mt-4 text-sm text-zinc-600">
            E-posta doğrulamasını zorunlu tutmamak için Supabase Dashboard →
            Authentication → Providers → Email → &quot;Confirm email&quot; seçeneğini
            kapatın.
          </p>
        </div>
      </div>
    )
  }

  return <AuthScreenForm />
}

function AuthScreenForm() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const inputCls =
    'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setBusy(true)
    try {
      const fn = mode === 'signIn' ? signIn : signUp
      const { error } = await fn(email, password)
      if (error) {
        setMessage(error)
        return
      }
      if (mode === 'signUp') {
        setMessage('Hesabınız oluşturuldu. Giriş yapılıyor…')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Daily Production Card
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Günlük imalat kartı — giriş veya kayıt
        </p>

        <div className="mt-6 flex rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signIn')
              setMessage(null)
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'signIn'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Giriş
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signUp')
              setMessage(null)
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === 'signUp'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Kayıt ol
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wide text-zinc-500"
              htmlFor="auth-email"
            >
              E-posta
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="ornek@eposta.com"
            />
          </div>
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wide text-zinc-500"
              htmlFor="auth-password"
            >
              Şifre
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === 'signIn' ? 'current-password' : 'new-password'
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="En az 6 karakter"
            />
          </div>

          {message ? (
            <p
              className={`text-sm ${
                message.includes('oluşturuldu') || message.includes('Giriş')
                  ? 'text-emerald-700'
                  : 'text-red-600'
              }`}
            >
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {busy
              ? 'Bekleyin…'
              : mode === 'signIn'
                ? 'Giriş yap'
                : 'Kayıt ol'}
          </button>
        </form>
      </div>
    </div>
  )
}
