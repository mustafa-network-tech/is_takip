import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchWorkDateCountsForMonth } from '../lib/productionHistory'
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

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

type Props = {
  refreshKey: number
}

export default function DashboardView({ refreshKey }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const year = cursor.getFullYear()
  const monthIndex = cursor.getMonth()

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCounts(new Map())
      setError('Supabase yapılandırılmadı.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { counts: c, error: err } = await fetchWorkDateCountsForMonth(
      year,
      monthIndex,
    )
    setLoading(false)
    if (err) {
      setError(err)
      setCounts(new Map())
      return
    }
    setCounts(c)
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

  const rows = useMemo(() => {
    const list: {
      day: number
      iso: string
      weekday: string
      count: number
    }[] = []
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${year}-${pad2(monthIndex + 1)}-${pad2(d)}`
      const dt = new Date(year, monthIndex, d)
      const weekday = dt.toLocaleDateString('tr-TR', { weekday: 'short' })
      list.push({
        day: d,
        iso,
        weekday,
        count: counts.get(iso) ?? 0,
      })
    }
    return list
  }, [year, monthIndex, lastDay, counts])

  const title = `${MONTH_NAMES_TR[monthIndex]} ${year}`

  const shiftMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Bu ay kayıtlı{' '}
            <strong className="text-zinc-900">{distinctWorkDays}</strong> gün, toplam{' '}
            <strong className="text-zinc-900">{totalRecords}</strong> kayıt.
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid grid-cols-[2.5rem_4.5rem_1fr_6rem] gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:grid-cols-[3rem_6rem_1fr_8rem]">
          <span className="text-center">Gün</span>
          <span>Hafta</span>
          <span>Tarih</span>
          <span className="text-right">Kayıt</span>
        </div>
        <div className="max-h-[min(520px,60dvh)] overflow-y-auto sm:max-h-none">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              Yükleniyor…
            </p>
          ) : (
            rows.map((r) => (
              <div
                key={r.iso}
                className={`grid grid-cols-[2.5rem_4.5rem_1fr_6rem] items-center gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0 sm:grid-cols-[3rem_6rem_1fr_8rem] ${
                  r.count > 0 ? 'bg-emerald-50/40' : 'bg-white'
                }`}
              >
                <span className="text-center tabular-nums font-medium text-zinc-800">
                  {r.day}
                </span>
                <span className="capitalize text-zinc-600">{r.weekday}</span>
                <span className="tabular-nums text-zinc-700">
                  {pad2(r.day)}.{pad2(monthIndex + 1)}.{year}
                </span>
                <span className="text-right">
                  {r.count > 0 ? (
                    <span className="inline-flex min-w-[2.25rem] justify-end rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                      {r.count}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Kayıt sayısı, o güne ait Supabase’teki kart kayıtlarının adedidir. Aynı gün birden
        fazla kayıt varsa sayı 1’den büyük olur.
      </p>
    </div>
  )
}
