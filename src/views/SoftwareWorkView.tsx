import { useCallback, useLayoutEffect, useState } from 'react'
import {
  insertSoftwareWorkLog,
  toLocalISODate,
  updateSoftwareWorkLog,
  type SoftwareWorkRow,
} from '../lib/softwareHistory'
import { isSupabaseConfigured } from '../lib/supabase'

export type SoftwareWorkViewProps = {
  initialEntry?: SoftwareWorkRow | null
  onSaved?: () => void
}

export default function SoftwareWorkView({
  initialEntry = null,
  onSaved,
}: SoftwareWorkViewProps) {
  const [workDate, setWorkDate] = useState(() => toLocalISODate(new Date()))
  const [title, setTitle] = useState('')
  const [hoursStr, setHoursStr] = useState('1')
  const [tur, setTur] = useState('')
  const [proje, setProje] = useState('')
  const [description, setDescription] = useState('')
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!initialEntry) return
    setWorkDate(initialEntry.work_date)
    setTitle(initialEntry.title)
    setHoursStr(String(initialEntry.hours))
    setTur(initialEntry.tur)
    setProje(initialEntry.proje)
    setDescription(initialEntry.description)
    setLoadedId(initialEntry.id)
    setSaveFeedback(null)
  }, [initialEntry?.id])

  const handleNewBlank = useCallback(() => {
    setWorkDate(toLocalISODate(new Date()))
    setTitle('')
    setHoursStr('1')
    setTur('')
    setProje('')
    setDescription('')
    setLoadedId(null)
    setSaveFeedback(null)
  }, [])

  const hoursNum = (() => {
    const n = parseFloat(hoursStr.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : 0
  })()

  const handleSave = useCallback(async () => {
    setSaveFeedback(null)
    if (!isSupabaseConfigured) {
      setSaveFeedback('Supabase yapılandırılmadı.')
      return
    }
    if (!title.trim()) {
      setSaveFeedback('Başlık girin.')
      return
    }
    setSaveBusy(true)
    const payload = {
      work_date: workDate,
      title: title.trim(),
      hours: hoursNum,
      tur: tur.trim(),
      proje: proje.trim(),
      description: description.trim(),
    }
    try {
      if (loadedId) {
        const { error } = await updateSoftwareWorkLog(loadedId, payload)
        if (error) {
          setSaveFeedback(error)
          return
        }
        setSaveFeedback('Kayıt güncellendi.')
      } else {
        const { id, error } = await insertSoftwareWorkLog(payload)
        if (error) {
          setSaveFeedback(error)
          return
        }
        if (id) setLoadedId(id)
        setSaveFeedback('Geçmişe kaydedildi.')
      }
      onSaved?.()
    } finally {
      setSaveBusy(false)
    }
  }, [workDate, title, hoursNum, tur, proje, description, loadedId, onSaved])

  const previewDateTr = (() => {
    const p = workDate.split('-')
    if (p.length !== 3) return workDate
    return `${p[2]}.${p[1]}.${p[0]}`
  })()

  const inputCls =
    'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10'

  const labelCls = 'text-xs font-medium uppercase tracking-wide text-zinc-500'

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8 lg:flex-row lg:items-start">
      <div className="flex-1 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Yazılım çalışması</h2>
          <p className="mt-1 text-sm text-zinc-600">
            İmalat kartından ayrı departman. Tür ve projeyi kendiniz yazarsınız; paylaşım
            yok, sadece kayıt.
          </p>
        </div>

        <div>
          <label className={labelCls} htmlFor="sw-title">
            Başlık
          </label>
          <input
            id="sw-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="Örn. Ödeme API refaktörü"
            autoComplete="off"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="sw-date">
              Tarih
            </label>
            <input
              id="sw-date"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="sw-hours">
              Süre (saat)
            </label>
            <input
              id="sw-hours"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.25}
              value={hoursStr}
              onChange={(e) => setHoursStr(e.target.value)}
              className={inputCls}
              placeholder="2,5"
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="sw-tur">
            Tür
          </label>
          <input
            id="sw-tur"
            value={tur}
            onChange={(e) => setTur(e.target.value)}
            className={inputCls}
            placeholder="Örn. Backend, Web, DevOps…"
            autoComplete="off"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="sw-proje">
            Proje
          </label>
          <input
            id="sw-proje"
            value={proje}
            onChange={(e) => setProje(e.target.value)}
            className={inputCls}
            placeholder="Hangi projede çalıştığınız"
            autoComplete="off"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="sw-desc">
            Açıklama
          </label>
          <textarea
            id="sw-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className={`${inputCls} min-h-[120px] resize-y`}
            placeholder="Yapılan işin özeti…"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveBusy}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saveBusy ? 'Kaydediliyor…' : loadedId ? 'Kaydı güncelle' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={handleNewBlank}
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Yeni boş form
          </button>
        </div>
        {saveFeedback ? (
          <p className="text-sm text-zinc-700">{saveFeedback}</p>
        ) : null}
      </div>

      <div className="w-full shrink-0 lg:w-[min(380px,100%)]">
        <p className={`${labelCls} mb-2`}>Önizleme</p>
        <div
          className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-5 shadow-md"
          style={{
            fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
            boxShadow:
              '0 20px 25px -5px rgba(67, 56, 202, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-indigo-100 pb-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
                Yazılım raporu
              </p>
              <p className="mt-1 break-words text-lg font-bold text-zinc-900">
                {title.trim() || '—'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-zinc-500">Tarih</p>
              <p className="text-sm font-semibold tabular-nums text-zinc-900">
                {previewDateTr}
              </p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {tur.trim() ? (
              <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-900">
                {tur.trim()}
              </span>
            ) : null}
            {proje.trim() ? (
              <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-900">
                {proje.trim()}
              </span>
            ) : null}
            <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800">
              {hoursNum} saat
            </span>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-white/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Açıklama
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700">
              {description.trim() || '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
