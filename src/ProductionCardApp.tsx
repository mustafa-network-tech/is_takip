import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import ProductionHistoryPanel from './components/ProductionHistoryPanel'
import { useAuth } from './context/AuthContext'
import {
  deleteProductionSnapshot,
  fetchProductionSnapshots,
  insertProductionSnapshot,
  normalizeGroupsFromDb,
  parseWorkDateToLocalDate,
  snapshotMatchesQuery,
  toLocalISODate,
  updateProductionSnapshot,
  type ProductionSnapshotRow,
} from './lib/productionHistory'
import { isSupabaseConfigured } from './lib/supabase'
import type { ImalatLine, ProjectGroup } from './types/production'

/** html2canvas Tailwind’in oklab() çıktısını çözemediği için yalnızca hex/rgba */
const ROW_CARD_THEMES: {
  shell: CSSProperties
  head: CSSProperties
  body: CSSProperties
}[] = [
  {
    shell: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#7dd3fc',
      backgroundColor: '#f0f9ff',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    head: {
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: '#7dd3fc',
      backgroundColor: '#e0f2fe',
    },
    body: { backgroundColor: '#f0f9ff' },
  },
  {
    shell: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#6ee7b7',
      backgroundColor: '#ecfdf5',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    head: {
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: '#6ee7b7',
      backgroundColor: '#d1fae5',
    },
    body: { backgroundColor: '#ecfdf5' },
  },
  {
    shell: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#fcd34d',
      backgroundColor: '#fffbeb',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    head: {
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: '#fcd34d',
      backgroundColor: '#fef3c7',
    },
    body: { backgroundColor: '#fffbeb' },
  },
  {
    shell: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#c4b5fd',
      backgroundColor: '#f5f3ff',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    head: {
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: '#c4b5fd',
      backgroundColor: '#ede9fe',
    },
    body: { backgroundColor: '#f5f3ff' },
  },
  {
    shell: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#fda4af',
      backgroundColor: '#fff1f2',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    head: {
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: '#fda4af',
      backgroundColor: '#ffe4e6',
    },
    body: { backgroundColor: '#fff1f2' },
  },
  {
    shell: {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#67e8f9',
      backgroundColor: '#ecfeff',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    head: {
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: '#67e8f9',
      backgroundColor: '#cffafe',
    },
    body: { backgroundColor: '#ecfeff' },
  },
]

const CARD_OUTER_STYLE: CSSProperties = {
  fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
  backgroundColor: '#f9f9f9',
  color: '#18181b',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '#d4d4d8',
  boxShadow:
    '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
}

function formatStampForFilename(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}-${hh}${min}`
}

/** Kart üstü: GG.AA.YYYY */
function formatCardDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function newImalatLine(): ImalatLine {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: '',
    unit: '',
    material: '',
  }
}

function newGroup(): ProjectGroup {
  return {
    id: crypto.randomUUID(),
    title: '',
    projectId: '',
    lines: [newImalatLine()],
  }
}

function isLikelyIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export default function ProductionCardApp() {
  const { user, signOut } = useAuth()
  const [personName, setPersonName] = useState('Mustafa Öner')
  const [cardDate, setCardDate] = useState(() => new Date())
  const [dateLocked, setDateLocked] = useState(false)
  const [groups, setGroups] = useState<ProjectGroup[]>(() => [newGroup()])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [iosImageUrl, setIosImageUrl] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const [historyRows, setHistoryRows] = useState<ProductionSnapshotRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [loadedRecordId, setLoadedRecordId] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null)

  const refreshHistory = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setHistoryLoading(true)
    setHistoryError(null)
    const { data, error } = await fetchProductionSnapshots()
    setHistoryLoading(false)
    if (error) {
      setHistoryError(error)
      return
    }
    setHistoryRows(data ?? [])
  }, [])

  useEffect(() => {
    void refreshHistory()
  }, [refreshHistory])

  useEffect(() => {
    if (dateLocked) return
    const tick = () => setCardDate(new Date())
    tick()
    const t = setInterval(tick, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [dateLocked])

  const filteredHistory = useMemo(
    () => historyRows.filter((r) => snapshotMatchesQuery(r, historySearch)),
    [historyRows, historySearch],
  )

  const handleLoadSnapshot = useCallback((row: ProductionSnapshotRow) => {
    setPersonName(row.person_name)
    const normalized = normalizeGroupsFromDb(row.groups)
    setGroups(normalized.length ? normalized : [newGroup()])
    setCardDate(parseWorkDateToLocalDate(row.work_date))
    setDateLocked(true)
    setLoadedRecordId(row.id)
    setSaveFeedback(null)
  }, [])

  const handleNewBlankForm = useCallback(() => {
    setPersonName('Mustafa Öner')
    setGroups([newGroup()])
    setCardDate(new Date())
    setDateLocked(false)
    setLoadedRecordId(null)
    setSaveFeedback(null)
  }, [])

  const handleUseTodayDate = useCallback(() => {
    setCardDate(new Date())
    setDateLocked(false)
  }, [])

  const handleSaveSnapshot = useCallback(async () => {
    setSaveFeedback(null)
    if (!isSupabaseConfigured) {
      setSaveFeedback('Supabase yapılandırılmadı.')
      return
    }
    setSaveBusy(true)
    const work_date = toLocalISODate(cardDate)
    const payload = {
      work_date,
      person_name: personName.trim(),
      groups,
    }
    try {
      if (loadedRecordId) {
        const { error } = await updateProductionSnapshot(loadedRecordId, payload)
        if (error) {
          setSaveFeedback(error)
          return
        }
        setSaveFeedback('Kayıt güncellendi.')
      } else {
        const { id, error } = await insertProductionSnapshot(payload)
        if (error) {
          setSaveFeedback(error)
          return
        }
        if (id) setLoadedRecordId(id)
        setSaveFeedback('Geçmişe kaydedildi.')
      }
      await refreshHistory()
    } finally {
      setSaveBusy(false)
    }
  }, [cardDate, personName, groups, loadedRecordId, refreshHistory])

  const handleDeleteSnapshot = useCallback(
    async (id: string) => {
      setDeleteBusyId(id)
      setHistoryError(null)
      const { error } = await deleteProductionSnapshot(id)
      setDeleteBusyId(null)
      if (error) {
        setHistoryError(error)
        return
      }
      if (loadedRecordId === id) {
        setLoadedRecordId(null)
        setSaveFeedback(null)
      }
      await refreshHistory()
    },
    [loadedRecordId, refreshHistory],
  )

  const updateGroup = useCallback((groupId: string, patch: Partial<ProjectGroup>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
    )
  }, [])

  const addGroup = useCallback(() => {
    setGroups((prev) => [...prev, newGroup()])
  }, [])

  const removeGroup = useCallback((groupId: string) => {
    setGroups((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((g) => g.id !== groupId)
    })
  }, [])

  const addImalatLine = useCallback((groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, lines: [...g.lines, newImalatLine()] } : g,
      ),
    )
  }, [])

  const removeImalatLine = useCallback((groupId: string, lineId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        if (g.lines.length <= 1) return g
        return { ...g, lines: g.lines.filter((l) => l.id !== lineId) }
      }),
    )
  }, [])

  const updateImalatLine = useCallback(
    (groupId: string, lineId: string, patch: Partial<ImalatLine>) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g
          return {
            ...g,
            lines: g.lines.map((l) =>
              l.id === lineId ? { ...l, ...patch } : l,
            ),
          }
        }),
      )
    },
    [],
  )

  const downloadCard = useCallback(async () => {
    const el = cardRef.current
    if (!el) return
    setExporting(true)
    setExportError(null)
    setIosImageUrl(null)

    const stamp = formatStampForFilename(new Date())
    const filename = `gunluk-imalat-karti-${stamp}.png`

    try {
      let canvas: HTMLCanvasElement
      try {
        canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: '#f9f9f9',
          useCORS: true,
          logging: false,
        })
      } catch {
        canvas = await html2canvas(el, {
          scale: 1,
          backgroundColor: '#f9f9f9',
          useCORS: true,
          logging: false,
        })
      }

      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
      })
      if (!blob) {
        setExportError('PNG oluşturulamadı. Sayfayı yenileyip tekrar deneyin.')
        return
      }

      // WhatsApp vb. paylaşımda `text`/`title` çoğu zaman görüntünün altında yazı olarak çıkar
      const fileForShare = new File([blob], 'imalat.png', { type: 'image/png' })
      const canShareFile =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [fileForShare] })

      if (canShareFile) {
        try {
          await navigator.share({ files: [fileForShare] })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      const ios = isLikelyIOS()
      if (ios) {
        const w = window.open(url, '_blank', 'noopener,noreferrer')
        if (!w) {
          setIosImageUrl(url)
          return
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
        return
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 2500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setExportError(
        msg
          ? `İndirme hatası: ${msg}`
          : 'İndirme başarısız. Farklı tarayıcı veya Chrome ile deneyin.',
      )
    } finally {
      setExporting(false)
    }
  }, [])

  const inputCls =
    'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10'

  const labelCls = 'text-xs font-medium uppercase tracking-wide text-zinc-500'

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Sol: giriş */}
      <aside className="flex w-full shrink-0 flex-col border-zinc-200 bg-white lg:w-[min(440px,100%)] lg:border-r">
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
                Daily Production Card
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                WhatsApp için günlük imalat kartı oluşturun
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {user?.email ? (
                <span
                  className="max-w-[11rem] truncate text-[11px] text-zinc-500"
                  title={user.email}
                >
                  {user.email}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          <ProductionHistoryPanel
            snapshots={filteredHistory}
            searchQuery={historySearch}
            onSearchChange={setHistorySearch}
            onRefresh={refreshHistory}
            listLoading={historyLoading}
            listError={historyError}
            onLoadSnapshot={handleLoadSnapshot}
            onDeleteSnapshot={(id) => void handleDeleteSnapshot(id)}
            deleteBusyId={deleteBusyId}
            onSaveSnapshot={() => void handleSaveSnapshot()}
            saveBusy={saveBusy}
            saveFeedback={saveFeedback}
            loadedRecordId={loadedRecordId}
            disabledReason={
              isSupabaseConfigured
                ? null
                : 'Supabase URL / anon key eksik. .env veya Vercel ortam değişkenlerini kontrol edin.'
            }
            onNewBlankForm={handleNewBlankForm}
            dateLocked={dateLocked}
            onUseTodayDate={handleUseTodayDate}
          />

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Kart üstü: solda ad, sağda tarih (etiketsiz; tarih otomatik)
            </p>
            <label className={labelCls} htmlFor="person-name">
              İsim
            </label>
            <input
              id="person-name"
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Ad Soyad"
              className={inputCls}
              autoComplete="name"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`${labelCls} m-0`}>Projeler / adresler</span>
              <button
                type="button"
                onClick={addGroup}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                + Yeni adres / proje
              </button>
            </div>

            <ul className="flex flex-col gap-4">
              {groups.map((group, gIndex) => (
                <li
                  key={group.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-700">
                      Proje {gIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGroup(group.id)}
                      disabled={groups.length <= 1}
                      className="text-xs font-medium text-red-600/90 hover:text-red-700 disabled:pointer-events-none disabled:opacity-30"
                    >
                      Projeyi kaldır
                    </button>
                  </div>

                  <div className="mb-3 rounded-lg border border-zinc-200/80 bg-white/90 p-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Kartta: başlık solda, ID sağda (aynı satır)
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <label className={labelCls}>Başlık</label>
                        <input
                          type="text"
                          value={group.title}
                          onChange={(e) =>
                            updateGroup(group.id, { title: e.target.value })
                          }
                          placeholder="Örn. Başak Sokak"
                          className={inputCls}
                          autoComplete="off"
                        />
                      </div>
                      <div className="w-full shrink-0 sm:w-[9.5rem]">
                        <label className={labelCls}>ID</label>
                        <input
                          type="text"
                          value={group.projectId}
                          onChange={(e) =>
                            updateGroup(group.id, { projectId: e.target.value })
                          }
                          placeholder="43354026"
                          className={inputCls}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`${labelCls} m-0`}>
                        Bu adresteki imalatlar
                      </span>
                      <button
                        type="button"
                        onClick={() => addImalatLine(group.id)}
                        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                      >
                        + İmalat satırı
                      </button>
                    </div>

                    <ul className="flex flex-col gap-2">
                      {group.lines.map((line, li) => (
                        <li
                          key={line.id}
                          className="rounded-lg border border-zinc-200 bg-white p-2.5"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-zinc-500">
                              İmalat {li + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeImalatLine(group.id, line.id)
                              }
                              disabled={group.lines.length <= 1}
                              className="text-[11px] font-medium text-red-600/90 hover:text-red-700 disabled:pointer-events-none disabled:opacity-30"
                            >
                              Satırı sil
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <label className={labelCls}>İmalat</label>
                              <input
                                type="text"
                                value={line.name}
                                onChange={(e) =>
                                  updateImalatLine(group.id, line.id, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="İş / üretim tanımı"
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Miktar</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="any"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateImalatLine(group.id, line.id, {
                                    quantity: e.target.value,
                                  })
                                }
                                placeholder="0"
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Birim</label>
                              <input
                                type="text"
                                value={line.unit}
                                onChange={(e) =>
                                  updateImalatLine(group.id, line.id, {
                                    unit: e.target.value,
                                  })
                                }
                                placeholder="adet, m, kg…"
                                className={inputCls}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={labelCls}>
                                Kullanılan malzeme{' '}
                                <span className="font-normal normal-case text-zinc-400">
                                  (opsiyonel)
                                </span>
                              </label>
                              <input
                                type="text"
                                value={line.material}
                                onChange={(e) =>
                                  updateImalatLine(group.id, line.id, {
                                    material: e.target.value,
                                  })
                                }
                                placeholder="Boş bırakılabilir — doluysa kartta görünür"
                                className={inputCls}
                                autoComplete="off"
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Sağ: önizleme */}
      <main className="flex flex-1 flex-col items-center bg-zinc-100/90 px-4 py-8">
        <div className="mb-4 flex w-full max-w-2xl flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={downloadCard}
            disabled={exporting}
            className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
          >
            {exporting ? 'Hazırlanıyor…' : 'Kartı indir / paylaş'}
          </button>
        </div>

        {exportError ? (
          <p className="mb-4 max-w-md px-2 text-center text-sm text-red-600">
            {exportError}
          </p>
        ) : (
          <p className="mb-4 max-w-md px-2 text-center text-xs text-zinc-500">
            Telefonda önce paylaşım penceresi açılabilir (WhatsApp / Kaydet).
            iPhone’da dosya inmezse açılan görüntüye uzun basıp kaydedin.
          </p>
        )}

        <div
          ref={cardRef}
          className="w-full max-w-[560px] rounded-2xl p-4 sm:p-6"
          style={CARD_OUTER_STYLE}
        >
          <div
            className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-4 sm:mb-5"
            style={{ borderBottom: '1px solid #e4e4e7' }}
          >
            <div
              className="min-w-0 flex-1 text-left"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#18181b',
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
            >
              {personName.trim() || '—'}
            </div>
            <div
              className="shrink-0 text-right"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#18181b',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCardDate(cardDate)}
            </div>
          </div>

          {/* Her proje: üst satırda başlık sol, ID sağ; altta çoklu imalat */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {groups.map((group, groupIndex) => {
              const theme =
                ROW_CARD_THEMES[groupIndex % ROW_CARD_THEMES.length]
              const titleText = group.title.trim()
              const idText = group.projectId.trim()
              return (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-xl"
                  style={theme.shell}
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-[12px] font-semibold sm:px-3.5 sm:py-3"
                    style={{ ...theme.head, color: '#18181b' }}
                  >
                    <span
                      className="min-w-0 flex-1 text-left leading-snug"
                      style={{ color: '#18181b' }}
                    >
                      {titleText || '—'}
                    </span>
                    <span
                      className="shrink-0 text-right tabular-nums leading-snug"
                      style={{ color: '#18181b' }}
                    >
                      {idText ? `ID ${idText}` : '—'}
                    </span>
                  </div>
                  <div style={theme.body}>
                    {group.lines.map((line, li) => {
                      const mat = line.material.trim()
                      const showMaterial = mat.length > 0
                      const isLastLine = li === group.lines.length - 1
                      return (
                        <div
                          key={line.id}
                          style={{
                            borderBottom: isLastLine
                              ? undefined
                              : '1px solid rgba(0, 0, 0, 0.08)',
                          }}
                        >
                          <div
                            className="grid grid-cols-[1fr_minmax(3rem,auto)_minmax(2.75rem,auto)] items-start gap-x-2 gap-y-1 px-3 py-2.5 text-[13px] sm:gap-x-3 sm:px-3.5 sm:py-3"
                            style={{
                              wordBreak: 'break-word',
                              color: '#18181b',
                            }}
                          >
                            <div className="min-w-0 self-center text-left leading-snug">
                              {line.name.trim() || '\u00a0'}
                            </div>
                            <div className="self-center text-right tabular-nums leading-snug">
                              {line.quantity.trim() || '\u00a0'}
                            </div>
                            <div className="self-center text-center leading-snug">
                              {line.unit.trim() || '\u00a0'}
                            </div>
                          </div>
                          {showMaterial ? (
                            <div
                              className="px-3 sm:px-3.5"
                              style={{
                                paddingBottom: 10,
                                paddingTop: 2,
                                color: '#52525b',
                                fontSize: 11,
                                lineHeight: 1.4,
                                wordBreak: 'break-word',
                              }}
                            >
                              {mat}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {iosImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Kart görseli"
        >
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <p className="mb-3 text-sm leading-snug text-zinc-700">
              Görseli kaydetmek için üzerine <strong>uzun basın</strong> veya
              paylaşım menüsünden WhatsApp’ı seçin.
            </p>
            <img
              src={iosImageUrl}
              alt="İmalat kartı"
              className="w-full rounded-lg border border-zinc-200"
            />
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white"
              onClick={() => {
                URL.revokeObjectURL(iosImageUrl)
                setIosImageUrl(null)
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
