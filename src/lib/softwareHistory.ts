import { supabase } from './supabase'

export type SoftwareWorkRow = {
  id: string
  user_id: string
  created_at: string
  work_date: string
  title: string
  hours: number
  /** Serbest metin tür (ör. API, Refactor) */
  tur: string
  /** Hangi projede çalışıldığı */
  proje: string
  description: string
}

/** Eski satırlarda category kolonu varsa türe map edilir */
function mapRow(row: Record<string, unknown>): SoftwareWorkRow {
  const turRaw =
    (row.tur as string) ??
    (row.category as string) ??
    ''
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    created_at: row.created_at as string,
    work_date: row.work_date as string,
    title: (row.title as string) ?? '',
    hours: Number(row.hours) || 0,
    tur: String(turRaw).trim(),
    proje: String((row.proje as string) ?? '').trim(),
    description: (row.description as string) ?? '',
  }
}

export async function fetchSoftwareWorkLogs(): Promise<{
  data: SoftwareWorkRow[] | null
  error: string | null
}> {
  if (!supabase) return { data: null, error: 'Supabase yapılandırılmadı.' }
  const qNew = supabase
    .from('software_work_logs')
    .select(
      'id, user_id, created_at, work_date, title, hours, tur, proje, description',
    )
    .order('created_at', { ascending: false })
    .limit(400)

  const { data, error } = await qNew

  if (error) {
    const { data: d2, error: e2 } = await supabase
      .from('software_work_logs')
      .select(
        'id, user_id, created_at, work_date, title, hours, description, category',
      )
      .order('created_at', { ascending: false })
      .limit(400)
    if (e2) return { data: null, error: error.message }
    const rows = (d2 ?? []).map((r) =>
      mapRow({
        ...(r as object),
        tur: (r as { category?: string }).category,
        proje: '',
      } as Record<string, unknown>),
    )
    return { data: rows, error: null }
  }

  const rows: SoftwareWorkRow[] = (data ?? []).map((row) =>
    mapRow(row as Record<string, unknown>),
  )
  return { data: rows, error: null }
}

/** Seçilen ayda başlığa göre toplam saat (pasta grafik) */
export async function fetchSoftwareHoursByTitleForMonth(
  year: number,
  monthIndex: number,
): Promise<{ data: { title: string; hours: number }[]; error: string | null }> {
  if (!supabase) return { data: [], error: null }
  const m = String(monthIndex + 1).padStart(2, '0')
  const start = `${year}-${m}-01`
  const lastD = new Date(year, monthIndex + 1, 0).getDate()
  const end = `${year}-${m}-${String(lastD).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('software_work_logs')
    .select('title, hours')
    .gte('work_date', start)
    .lte('work_date', end)

  if (error) return { data: [], error: error.message }

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const t = String((row as { title?: string }).title ?? '').trim() || '(Başlıksız)'
    const h = Number((row as { hours?: number }).hours) || 0
    map.set(t, (map.get(t) ?? 0) + h)
  }
  const arr = Array.from(map.entries()).map(([title, hours]) => ({ title, hours }))
  arr.sort((a, b) => b.hours - a.hours)
  return { data: arr, error: null }
}

export type SoftwareDayEntry = { title: string; hours: number }

/** Seçilen ayda her güne yazılım satırları (takvim için) */
export async function fetchSoftwareByDateForMonth(
  year: number,
  monthIndex: number,
): Promise<{ data: Map<string, SoftwareDayEntry[]>; error: string | null }> {
  if (!supabase) return { data: new Map(), error: null }
  const m = String(monthIndex + 1).padStart(2, '0')
  const start = `${year}-${m}-01`
  const lastD = new Date(year, monthIndex + 1, 0).getDate()
  const end = `${year}-${m}-${String(lastD).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('software_work_logs')
    .select('work_date, title, hours')
    .gte('work_date', start)
    .lte('work_date', end)

  if (error) return { data: new Map(), error: error.message }

  const acc = new Map<string, Map<string, number>>()
  for (const row of data ?? []) {
    const wd = String((row as { work_date?: string }).work_date ?? '')
    if (!wd) continue
    const title =
      String((row as { title?: string }).title ?? '').trim() || '(Başlıksız)'
    const h = Number((row as { hours?: number }).hours) || 0
    if (!acc.has(wd)) acc.set(wd, new Map())
    const inner = acc.get(wd)!
    inner.set(title, (inner.get(title) ?? 0) + h)
  }

  const out = new Map<string, SoftwareDayEntry[]>()
  for (const [wd, inner] of acc) {
    const arr = [...inner.entries()].map(([title, hours]) => ({ title, hours }))
    arr.sort((a, b) => b.hours - a.hours)
    out.set(wd, arr)
  }
  return { data: out, error: null }
}

export async function insertSoftwareWorkLog(payload: {
  work_date: string
  title: string
  hours: number
  tur: string
  proje: string
  description: string
}): Promise<{ id: string | null; error: string | null }> {
  if (!supabase) return { id: null, error: 'Supabase yapılandırılmadı.' }
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return { id: null, error: 'Oturum bulunamadı.' }
  }

  const { data, error } = await supabase
    .from('software_work_logs')
    .insert({
      user_id: userData.user.id,
      work_date: payload.work_date,
      title: payload.title.trim(),
      hours: payload.hours,
      description: payload.description.trim(),
      tur: payload.tur.trim(),
      proje: payload.proje.trim(),
    })
    .select('id')
    .single()

  if (error) return { id: null, error: error.message }
  return { id: data?.id as string, error: null }
}

export async function updateSoftwareWorkLog(
  id: string,
  payload: {
    work_date: string
    title: string
    hours: number
    tur: string
    proje: string
    description: string
  },
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase yapılandırılmadı.' }
  const { error } = await supabase
    .from('software_work_logs')
    .update({
      work_date: payload.work_date,
      title: payload.title.trim(),
      hours: payload.hours,
      tur: payload.tur.trim(),
      proje: payload.proje.trim(),
      description: payload.description.trim(),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteSoftwareWorkLog(
  id: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase yapılandırılmadı.' }
  const { error } = await supabase.from('software_work_logs').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export function softwareMatchesQuery(
  row: SoftwareWorkRow,
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const iso = row.work_date
  const parts = iso.split('-')
  const tr =
    parts.length === 3
      ? `${parts[2]}.${parts[1]}.${parts[0]}`
      : iso
  const hay = [
    iso,
    tr,
    row.title,
    row.description,
    row.tur,
    row.proje,
    String(row.hours),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function formatWorkDateTr(isoDate: string): string {
  const p = isoDate.split('-')
  if (p.length !== 3) return isoDate
  return `${p[2]}.${p[1]}.${p[0]}`
}

export function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseWorkDateToLocalDate(iso: string): Date {
  const p = iso.split('-').map(Number)
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return new Date()
  return new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0)
}
