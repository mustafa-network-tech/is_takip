import { useCallback, useEffect, useMemo, useState } from 'react'
import SoftwareHoursPieChart from '../components/SoftwareHoursPieChart'
import { chartColorAt, chartColorForTitle } from '../lib/chartColors'
import { fetchWorkDateCountsForMonth } from '../lib/productionHistory'
import {
  fetchSoftwareByDateForMonth,
  fetchSoftwareHoursByTitleForMonth,
  type SoftwareDayEntry,
} from '../lib/softwareHistory'
import { isSupabaseConfigured } from '../lib/supabase'

const MONTH_NAMES_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

/** Hafta başı Pazartesi */
const WEEKDAY_SHORT_TR = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

type Props = {
  refreshKey: number
}

type CalDay = {
  type: 'day'
  day: number
  iso: string
  software: SoftwareDayEntry[]
}

export default function DashboardView({ refreshKey }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [softwareByTitle, setSoftwareByTitle] = useState<
    { title: string; hours: number }[]
  >([])
  const [softwareByDate, setSoftwareByDate] = useState<
    Map<string, SoftwareDayEntry[]>
  >(new Map())
  const [softwarePieError, setSoftwarePieError] = useState<string | null>(null)
  const [softwareCalendarError, setSoftwareCalendarError] = useState<
    string | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const year = cursor.getFullYear()
  const monthIndex = cursor.getMonth()

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCounts(new Map())
      setSoftwareByTitle([])
      setSoftwareByDate(new Map())
      setSoftwarePieError(null)
      setSoftwareCalendarError(null)
      setError('Supabase yapılandırılmadı.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setSoftwarePieError(null)
    setSoftwareCalendarError(null)
    const [wm, swTitle, swDays] = await Promise.all([
      fetchWorkDateCountsForMonth(year, monthIndex),
      fetchSoftwareHoursByTitleForMonth(year, monthIndex),
      fetchSoftwareByDateForMonth(year, monthIndex),
    ])
    setLoading(false)
    if (wm.error) {
      setError(wm.error)
      setCounts(new Map())
    } else {
      setCounts(wm.counts)
    }
    if (swTitle.error) {
      setSoftwarePieError(swTitle.error)
      setSoftwareByTitle([])
    } else {
      setSoftwareByTitle(swTitle.data)
    }
    if (swDays.error) {
      setSoftwareCalendarError(swDays.error)
      setSoftwareByDate(new Map())
    } else {
      setSoftwareByDate(swDays.data)
    }
  }, [year, monthIndex])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const lastDay = useMemo(
    () => new Date(year, monthIndex + 1, 0).getDate(),
    [year, monthIndex],
  )

  const distinctWorkDays = counts.size
  const totalRecords = useMemo(() => {
    let t = 0
    for (const v of counts.values()) t += v
    return t
  }, [counts])

  const softwareDaysInMonth = useMemo(() => {
    let n = 0
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${year}-${pad2(monthIndex + 1)}-${pad2(d)}`
      const e = softwareByDate.get(iso)
      if (e && e.length > 0 && e.some((x) => x.hours > 0)) n += 1
    }
    return n
  }, [year, monthIndex, lastDay, softwareByDate])

  /** Saha: ayın her günü eşit dilim; kayıtlı günler farklı renk */
  const workedRingGradient = useMemo(() => {
    if (lastDay <= 0) {
      return 'conic-gradient(rgb(228 228 231) 0deg 360deg)'
    }
    const step = 360 / lastDay
    const empty = '#e4e4e7'
    const parts: string[] = []
    for (let d = 1; d <= lastDay; d++) {
      const start = (d - 1) * step
      const end = d * step
      const iso = `${year}-${pad2(monthIndex + 1)}-${pad2(d)}`
      const has = (counts.get(iso) ?? 0) > 0
      const c = has ? chartColorAt(d - 1) : empty
      parts.push(`${c} ${start.toFixed(3)}deg ${end.toFixed(3)}deg`)
    }
    return `conic-gradient(${parts.join(', ')})`
  }, [lastDay, year, monthIndex, counts])

  const calendarCells = useMemo(() => {
    const sun0 = new Date(year, monthIndex, 1).getDay()
    const mondayFirstOffset = (sun0 + 6) % 7
    const cells: ({ type: 'empty' } | CalDay)[] = []
    for (let i = 0; i < mondayFirstOffset; i++) cells.push({ type: 'empty' })
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${year}-${pad2(monthIndex + 1)}-${pad2(d)}`
      const software = softwareByDate.get(iso) ?? []
      cells.push({ type: 'day', day: d, iso, software })
    }
    while (cells.length % 7 !== 0) cells.push({ type: 'empty' })
    return cells
  }, [year, monthIndex, lastDay, softwareByDate])

  const title = `${MONTH_NAMES_TR[monthIndex]} ${year}`
  const workedRatioPct =
    lastDay > 0 ? Math.round((distinctWorkDays / lastDay) * 100) : 0

  const shiftMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Saha:{' '}
            <strong className="text-zinc-900">{distinctWorkDays}</strong> / {lastDay}{' '}
            günde kayıt ·{' '}
            <strong className="text-zinc-900">{totalRecords}</strong> kart
            <span className="text-zinc-400"> · </span>
            Yazılım:{' '}
            <strong className="text-zinc-900">{softwareDaysInMonth}</strong> / {lastDay}{' '}
            günde kayıt
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            ← Önceki ay
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Sonraki ay →
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-500">Yükleniyor…</p>
      ) : (
        <div className="space-y-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            {softwarePieError ? (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                {softwarePieError}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:gap-8">
              <div className="flex min-w-0 flex-col items-center">
                <div
                  className="relative aspect-square w-full max-w-[10.5rem] shrink-0 rounded-full border-4 border-zinc-100 shadow-inner sm:max-w-[11rem]"
                  style={{ background: workedRingGradient }}
                  title={`Saha: ${distinctWorkDays} / ${lastDay} iş günü. Halkada her gün bir dilim; kayıtlı günler renkli.`}
                >
                  <div className="absolute inset-[12%] flex flex-col items-center justify-center rounded-full bg-white text-center">
                    <span className="text-xl font-bold tabular-nums text-zinc-800 sm:text-2xl">
                      {distinctWorkDays}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500 sm:text-[10px]">
                      iş günü
                    </span>
                    <span className="text-[10px] text-zinc-400 sm:text-xs">
                      / {lastDay} · %{workedRatioPct}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-center text-xs font-semibold text-zinc-800">
                  Ay özeti
                </p>
              </div>
              <div className="flex min-w-0 flex-col items-center">
                <div className="aspect-square w-full max-w-[10.5rem] shrink-0 sm:max-w-[11rem]">
                  <SoftwareHoursPieChart
                    segments={softwareByTitle}
                    showLegend={false}
                    sizeClass="h-full w-full"
                  />
                </div>
                <p className="mt-2 text-center text-xs font-semibold text-zinc-800">
                  Yazılım — başlığa göre saat
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-zinc-800">
              Takvim — yazılım (günlük)
            </h3>
            {softwareCalendarError ? (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {softwareCalendarError}
              </p>
            ) : null}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {WEEKDAY_SHORT_TR.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) =>
                cell.type === 'empty' ? (
                  <div key={`e-${idx}`} className="aspect-square rounded-lg bg-zinc-50/80" />
                ) : (
                  <CalendarSoftwareDay cell={cell} key={cell.iso} />
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarSoftwareDay({ cell }: { cell: CalDay }) {
  const total = cell.software.reduce((s, e) => s + e.hours, 0)
  const lines = cell.software.filter((e) => e.hours > 0)
  const tip = lines.length
    ? `${cell.day}. gün — ${total.toFixed(1)} saat: ${lines.map((e) => `${e.title} (${e.hours})`).join(', ')}`
    : `${cell.day}. gün — yazılım yok`

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-indigo-50/40 shadow-sm"
      title={tip}
    >
      <span className="shrink-0 bg-white/95 px-1 py-0.5 text-center text-[10px] font-bold text-zinc-800">
        {cell.day}
      </span>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-0.5 pb-1 pt-0.5">
        {total > 0 ? (
          <>
            <span className="text-[9px] font-bold leading-tight text-indigo-950">
              {total.toFixed(1)} saat
            </span>
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              {lines.map((e) => (
                <div
                  key={e.title}
                  className="flex min-w-0 items-start gap-0.5 text-[7px] leading-tight sm:text-[8px]"
                >
                  <span
                    className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: chartColorForTitle(e.title) }}
                  />
                  <span
                    className="min-w-0 flex-1 break-words text-zinc-800"
                    title={`${e.title}: ${e.hours} saat`}
                  >
                    <span className="font-medium">{e.title}</span>
                    <span className="text-zinc-500"> {e.hours}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <span className="text-[8px] text-zinc-400">—</span>
        )}
      </div>
    </div>
  )
}
