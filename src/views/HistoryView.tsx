import { useCallback, useEffect, useMemo, useState } from 'react'
import ProductionHistoryPanel from '../components/ProductionHistoryPanel'
import {
  deleteProductionSnapshot,
  fetchProductionSnapshots,
  snapshotMatchesQuery,
  type ProductionSnapshotRow,
} from '../lib/productionHistory'
import { isSupabaseConfigured } from '../lib/supabase'

type Props = {
  onLoadInEditor: (row: ProductionSnapshotRow) => void
  onOpenNewJob: () => void
  refreshKey: number
  onDataChanged?: () => void
}

export default function HistoryView({
  onLoadInEditor,
  onOpenNewJob,
  refreshKey,
  onDataChanged,
}: Props) {
  const [rows, setRows] = useState<ProductionSnapshotRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchProductionSnapshots()
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    setRows(data ?? [])
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, refreshKey])

  const filtered = useMemo(
    () => rows.filter((r) => snapshotMatchesQuery(r, search)),
    [rows, search],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleteBusyId(id)
      setError(null)
      const { error: delErr } = await deleteProductionSnapshot(id)
      setDeleteBusyId(null)
      if (delErr) {
        setError(delErr)
        return
      }
      await refresh()
      onDataChanged?.()
    },
    [refresh, onDataChanged],
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-4 text-sm text-zinc-600">
        Kayıtları arayın; düzenlemek için <strong>Yükle</strong> ile &quot;Yeni iş
        oluştur&quot; ekranına aktarın.
      </p>
      <ProductionHistoryPanel
        snapshots={filtered}
        searchQuery={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        listLoading={loading}
        listError={error}
        onLoadSnapshot={onLoadInEditor}
        onDeleteSnapshot={(id) => void handleDelete(id)}
        deleteBusyId={deleteBusyId}
        onSaveSnapshot={() => {}}
        saveBusy={false}
        saveFeedback={null}
        loadedRecordId={null}
        disabledReason={
          isSupabaseConfigured
            ? null
            : 'Supabase URL / anon key eksik. .env veya Vercel ortam değişkenlerini kontrol edin.'
        }
        onNewBlankForm={onOpenNewJob}
        dateLocked={false}
        onUseTodayDate={() => {}}
        showSaveToCloud={false}
        onOpenNewJob={onOpenNewJob}
      />
    </div>
  )
}
