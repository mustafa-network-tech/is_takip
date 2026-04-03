import type { AppView } from '../appRoutes'

type Props = {
  active: AppView
  onNavigate: (view: AppView) => void
  userEmail: string | null | undefined
  onSignOut: () => void
}

const navBtn =
  'rounded-lg px-3 py-2 text-sm font-medium transition sm:px-3.5'

export default function TopNav({
  active,
  onNavigate,
  userEmail,
  onSignOut,
}: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            İş takip
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight text-zinc-900">
            Daily Production Card
          </h1>
          {userEmail ? (
            <p className="truncate text-xs text-zinc-500" title={userEmail}>
              {userEmail}
            </p>
          ) : null}
        </div>

        <nav className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`${navBtn} ${
              active === 'dashboard'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
            }`}
          >
            Ana sayfa
          </button>
          <button
            type="button"
            onClick={() => onNavigate('new-job')}
            className={`${navBtn} ${
              active === 'new-job'
                ? 'bg-sky-600 text-white'
                : 'border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100'
            }`}
          >
            Yeni iş oluştur
          </button>
          <button
            type="button"
            onClick={() => onNavigate('software')}
            className={`${navBtn} ${
              active === 'software'
                ? 'bg-indigo-600 text-white'
                : 'border border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
            }`}
          >
            Yazılım
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={`${navBtn} ${
              active === 'history'
                ? 'bg-violet-600 text-white'
                : 'border border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100'
            }`}
          >
            Geçmiş işlerim
          </button>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className={`${navBtn} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`}
          >
            Çıkış
          </button>
        </nav>
      </div>
    </header>
  )
}
