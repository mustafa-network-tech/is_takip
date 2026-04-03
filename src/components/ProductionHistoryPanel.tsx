import type { ProductionSnapshotRow } from '../lib/productionHistory'
import { formatWorkDateTr } from '../lib/productionHistory'

type Props = {
  snapshots: ProductionSnapshotRow[]
  searchQuery: string
  onSearchChange: (q: string) => void
  onRefresh: () => void
  listLoading: boolean
  listError: string | null
  onLoadSnapshot: (row: ProductionSnapshotRow) => void
  onDeleteSnapshot: (id: string) => void
  deleteBusyId: string | null
  onSaveSnapshot: () => void
  saveBusy: boolean
  saveFeedback: string | null
  loadedRecordId: string | null
  disabledReason: string | null
  onNewBlankForm: () => void
  dateLocked: boolean
  onUseTodayDate: () => void
  /** false: sadece liste (Yeni iş sayfasındaki bulut kaydı gizlenir) */
  showSaveToCloud?: boolean
  /** Liste-only modda “Yeni iş oluştur” ile düzenleyiciye git */
  onOpenNewJob?: () => void
}

function previewTitles(row: ProductionSnapshotRow, max = 2): string {
  const titles = row.groups
    .map((g) => g.title.trim())
    .filter(Boolean)
    .slice(0, max)
  if (titles.length === 0) return '—'
  const more = row.groups.some((g) => g.title.trim()) && titles.length < row.groups.length
  return titles.join(' · ') + (more ? '…' : '')
}

export default function ProductionHistoryPanel({
  snapshots,
  searchQuery,
  onSearchChange,
  onRefresh,
  listLoading,
  listError,
  onLoadSnapshot,
  onDeleteSnapshot,
  deleteBusyId,
  onSaveSnapshot,
  saveBusy,
  saveFeedback,
  loadedRecordId,
  disabledReason,
  onNewBlankForm,
  dateLocked,
  onUseTodayDate,
  showSaveToCloud = true,
  onOpenNewJob,
}: Props) {
  const inputCls =
    'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10'

  if (disabledReason) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900">
        <h2 className="text-base font-bold text-amber-950">Geçmiş işlerim</h2>
        <p className="mt-2 font-medium">Geçmiş kayıtlar şu an kullanılamıyor</p>
        <p className="mt-1 text-xs text-amber-800/90">{disabledReason}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-zinc-900">Geçmiş işlerim</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={listLoading}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {listLoading ? 'Yenileniyor…' : 'Listeyi yenile'}
          </button>
          {showSaveToCloud ? (
            <button
              type="button"
              onClick={onNewBlankForm}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Boş forma dön
            </button>
          ) : onOpenNewJob ? (
            <button
              type="button"
              onClick={onOpenNewJob}
              className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700"
            >
              Yeni iş oluştur
            </button>
          ) : null}
        </div>
      </div>

      {showSaveToCloud && dateLocked ? (
        <p className="mt-2 text-[11px] text-zinc-600">
          Kart tarihi geçmiş kayıttan geliyor.{' '}
          <button
            type="button"
            onClick={onUseTodayDate}
            className="font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-2 hover:decoration-zinc-600"
          >
            Bugünün tarihine al
          </button>
        </p>
      ) : null}

      <div className="mt-3">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500" htmlFor="history-search">
          Ara (başlık, tarih, ID, isim)
        </label>
        <input
          id="history-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Örn. Başak, 15.04, 43354…"
          className={inputCls}
          autoComplete="off"
        />
      </div>

      {showSaveToCloud ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onSaveSnapshot}
            disabled={saveBusy}
            className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
          >
            {saveBusy
              ? 'Kaydediliyor…'
              : loadedRecordId
                ? 'Bu kaydı güncelle'
                : 'Mevcut kartı geçmişe kaydet'}
          </button>
          {saveFeedback ? (
            <p className="mt-2 text-xs text-zinc-600">{saveFeedback}</p>
          ) : null}
        </div>
      ) : null}

      {listError ? (
        <p className="mt-3 text-xs text-red-600">{listError}</p>
      ) : null}

      <ul className="mt-3 max-h-[min(320px,45dvh)] space-y-2 overflow-y-auto pr-0.5 sm:max-h-[min(380px,50dvh)]">
        {snapshots.length === 0 && !listLoading ? (
          <li className="rounded-lg border border-dashed border-zinc-200 bg-white/80 px-3 py-6 text-center text-xs text-zinc-500">
            {showSaveToCloud ? (
              <>
                Henüz kayıt yok. Formu doldurup &quot;Mevcut kartı geçmişe kaydet&quot; ile
                ekleyin.
              </>
            ) : (
              <>
                Henüz kayıt yok. &quot;Yeni iş oluştur&quot; ile kart ekleyip kaydedin.
              </>
            )}
          </li>
        ) : null}
        {snapshots.map((row) => (
          <li
            key={row.id}
            className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-800">
                {formatWorkDateTr(row.work_date)}
                <span className="font-normal text-zinc-400"> · </span>
                <span className="font-medium text-zinc-600">
                  {row.person_name.trim() || '—'}
                </span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                {previewTitles(row)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => onLoadSnapshot(row)}
                className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-800"
              >
                Yükle
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Bu geçmiş kaydını silmek istediğinize emin misiniz?',
                    )
                  ) {
                    onDeleteSnapshot(row.id)
                  }
                }}
                disabled={deleteBusyId === row.id}
                className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleteBusyId === row.id ? '…' : 'Sil'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
