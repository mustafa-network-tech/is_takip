import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteProductionSnapshot,
  fetchProductionSnapshots,
  formatWorkDateTr as formatProdDateTr,
  snapshotMatchesQuery,
  type ProductionSnapshotRow,
} from '../lib/productionHistory'
import {
  deleteSoftwareWorkLog,
  fetchSoftwareWorkLogs,
  formatWorkDateTr as formatSwDateTr,
  softwareMatchesQuery,
  type SoftwareWorkRow,
} from '../lib/softwareHistory'
import { isSupabaseConfigured } from '../lib/supabase'

type DeptFilter = 'all' | 'production' | 'software'

type UnifiedItem =
  | { kind: 'production'; created_at: string; row: ProductionSnapshotRow }
  | { kind: 'software'; created_at: string; row: SoftwareWorkRow }

type Props = {
  onLoadProduction: (row: ProductionSnapshotRow) => void
  onLoadSoftware: (row: SoftwareWorkRow) => void
  onOpenNewProduction: () => void
  onOpenSoftware: () => void
  refreshKey: number
  onDataChanged?: () => void
}

function productionPreviewTitle(row: ProductionSnapshotRow): string {
  const g = row.groups.find((x) => x.title.trim())
  const t = g?.title.trim()
  if (t) return t
  const n = row.person_name.trim()
  if (n) return n
  return 'İmalat kartı'
}

function productionPreviewSubtitle(row: ProductionSnapshotRow): string {
  const parts = [formatProdDateTr(row.work_date)]
  if (row.person_name.trim()) parts.push(row.person_name.trim())
  return parts.join(' · ')
}

function mergeUnified(
  prod: ProductionSnapshotRow[],
  soft: SoftwareWorkRow[],
): UnifiedItem[] {
  const items: UnifiedItem[] = [
    ...prod.map((row) => ({
      kind: 'production' as const,
      created_at: row.created_at,
      row,
    })),
    ...soft.map((row) => ({
      kind: 'software' as const,
      created_at: row.created_at,
      row,
    })),
  ]
  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  return items
}

function distinctSorted(values: string[]): string[] {
  const s = new Set<string>()
  for (const v of values) {
    const t = v.trim()
    if (t) s.add(t)
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b, 'tr'))
}

export default function HistoryView({
  onLoadProduction,
  onLoadSoftware,
  onOpenNewProduction,
  onOpenSoftware,
  refreshKey,
  onDataChanged,
}: Props) {
  const [productionRows, setProductionRows] = useState<ProductionSnapshotRow[]>(
    [],
  )
  const [softwareRows, setSoftwareRows] = useState<SoftwareWorkRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all')
  const [filterTur, setFilterTur] = useState('')
  const [filterProje, setFilterProje] = useState('')
  const [deleteBusyKey, setDeleteBusyKey] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProductionRows([])
      setSoftwareRows([])
      setError('Supabase yapılandırılmadı.')
      return
    }
    setLoading(true)
    setError(null)
    const [pr, sr] = await Promise.all([
      fetchProductionSnapshots(),
      fetchSoftwareWorkLogs(),
    ])
    setLoading(false)
    const errs = [pr.error, sr.error].filter(Boolean)
    if (errs.length) {
      setError(errs.join(' · '))
    }
    setProductionRows(pr.data ?? [])
    setSoftwareRows(sr.data ?? [])
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, refreshKey])

  const turOptions = useMemo(
    () => distinctSorted(softwareRows.map((r) => r.tur)),
    [softwareRows],
  )
  const projeOptions = useMemo(
    () => distinctSorted(softwareRows.map((r) => r.proje)),
    [softwareRows],
  )

  const unifiedList = useMemo(() => {
    let prod = productionRows.filter((r) => snapshotMatchesQuery(r, search))
    let soft = softwareRows.filter((r) => softwareMatchesQuery(r, search))

    if (deptFilter === 'production') soft = []
    if (deptFilter === 'software') prod = []
    if (deptFilter !== 'production') {
      if (filterTur) {
        soft = soft.filter((s) => s.tur.trim() === filterTur)
      }
      if (filterProje) {
        soft = soft.filter((s) => s.proje.trim() === filterProje)
      }
    }

    return mergeUnified(prod, soft)
  }, [
    productionRows,
    softwareRows,
    search,
    deptFilter,
    filterTur,
    filterProje,
  ])

  const handleDelete = useCallback(
    async (item: UnifiedItem) => {
      const key = `${item.kind}-${item.row.id}`
      setDeleteBusyKey(key)
      setError(null)
      const del =
        item.kind === 'production'
          ? await deleteProductionSnapshot(item.row.id)
          : await deleteSoftwareWorkLog(item.row.id)
      setDeleteBusyKey(null)
      if (del.error) {
        setError(del.error)
        return
      }
      await refresh()
      onDataChanged?.()
    },
    [refresh, onDataChanged],
  )

  const disabledReason = isSupabaseConfigured
    ? null
    : 'Supabase URL / anon key eksik. .env veya Vercel ortam değişkenlerini kontrol edin.'

  const filterBtn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
      active
        ? 'bg-zinc-900 text-white'
        : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
    }`

  const selectCls =
    'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="text-xl font-bold text-zinc-900">Geçmiş işlerim</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Saha (paylaşımlı kart) ve yazılım birlikte. Yazılımda tür ve projeye göre
        daraltın.
      </p>

      {disabledReason ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {disabledReason}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={filterBtn(deptFilter === 'all')}
          onClick={() => setDeptFilter('all')}
        >
          Tümü
        </button>
        <button
          type="button"
          className={filterBtn(deptFilter === 'production')}
          onClick={() => setDeptFilter('production')}
        >
          Saha / imalat kartı
        </button>
        <button
          type="button"
          className={filterBtn(deptFilter === 'software')}
          onClick={() => setDeptFilter('software')}
        >
          Yazılım
        </button>
      </div>

      {deptFilter !== 'production' ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Yazılım — tür
            </label>
            <select
              className={selectCls}
              value={filterTur}
              onChange={(e) => setFilterTur(e.target.value)}
            >
              <option value="">Tüm türler</option>
              {turOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Yazılım — proje
            </label>
            <select
              className={selectCls}
              value={filterProje}
              onChange={(e) => setFilterProje(e.target.value)}
            >
              <option value="">Tüm projeler</option>
              {projeOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ara: başlık, tarih, tür, proje…"
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
        />
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? 'Yenileniyor…' : 'Yenile'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={onOpenNewProduction}
          className="rounded-md bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-700"
        >
          + Saha kartı
        </button>
        <button
          type="button"
          onClick={onOpenSoftware}
          className="rounded-md bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700"
        >
          + Yazılım kaydı
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {!loading && unifiedList.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
            Kayıt yok veya filtreye uymuyor.
          </li>
        ) : null}
        {unifiedList.map((item) => {
          const delKey = `${item.kind}-${item.row.id}`
          const busy = deleteBusyKey === delKey
          if (item.kind === 'production') {
            const r = item.row
            return (
              <li
                key={delKey}
                className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                    Saha kartı
                  </span>
                  <p className="mt-2 font-semibold text-zinc-900">
                    {productionPreviewTitle(r)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {productionPreviewSubtitle(r)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onLoadProduction(r)}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Yükle
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Bu imalat kartı kaydını silmek istiyor musunuz?',
                        )
                      ) {
                        void handleDelete(item)
                      }
                    }}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy ? '…' : 'Sil'}
                  </button>
                </div>
              </li>
            )
          }
          const r = item.row
          return (
            <li
              key={delKey}
              className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800">
                  Yazılım
                </span>
                <p className="mt-2 font-semibold text-zinc-900">
                  {r.title.trim() || '—'}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatSwDateTr(r.work_date)} · {r.hours} saat
                  {r.tur.trim() ? ` · ${r.tur.trim()}` : ''}
                  {r.proje.trim() ? ` · ${r.proje.trim()}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onLoadSoftware(r)}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  Yükle
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Bu yazılım kaydını silmek istiyor musunuz?',
                      )
                    ) {
                      void handleDelete(item)
                    }
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {busy ? '…' : 'Sil'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
