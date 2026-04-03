import type { ProjectGroup } from '../types/production'
import { supabase } from './supabase'

export type ProductionSnapshotRow = {
  id: string
  user_id: string
  created_at: string
  work_date: string
  person_name: string
  groups: ProjectGroup[]
}

function isProjectGroupArray(v: unknown): v is ProjectGroup[] {
  return Array.isArray(v)
}

export function normalizeGroupsFromDb(raw: unknown): ProjectGroup[] {
  if (!isProjectGroupArray(raw)) return []
  return raw.map((g) => ({
    id: typeof g.id === 'string' ? g.id : crypto.randomUUID(),
    title: typeof g.title === 'string' ? g.title : '',
    projectId: typeof g.projectId === 'string' ? g.projectId : '',
    lines: Array.isArray(g.lines)
      ? g.lines.map((l) => ({
          id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
          name: typeof l.name === 'string' ? l.name : '',
          quantity: typeof l.quantity === 'string' ? l.quantity : '',
          unit: typeof l.unit === 'string' ? l.unit : '',
          material: typeof l.material === 'string' ? l.material : '',
        }))
      : [],
  }))
}

export async function fetchProductionSnapshots(): Promise<{
  data: ProductionSnapshotRow[] | null
  error: string | null
}> {
  if (!supabase) return { data: null, error: 'Supabase yapılandırılmadı.' }
  const { data, error } = await supabase
    .from('production_snapshots')
    .select('id, user_id, created_at, work_date, person_name, groups')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return { data: null, error: error.message }

  const rows: ProductionSnapshotRow[] = (data ?? []).map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    created_at: row.created_at as string,
    work_date: row.work_date as string,
    person_name: (row.person_name as string) ?? '',
    groups: normalizeGroupsFromDb(row.groups),
  }))

  return { data: rows, error: null }
}

export async function insertProductionSnapshot(payload: {
  work_date: string
  person_name: string
  groups: ProjectGroup[]
}): Promise<{ id: string | null; error: string | null }> {
  if (!supabase) return { id: null, error: 'Supabase yapılandırılmadı.' }
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return { id: null, error: 'Oturum bulunamadı.' }
  }

  const { data, error } = await supabase
    .from('production_snapshots')
    .insert({
      user_id: userData.user.id,
      work_date: payload.work_date,
      person_name: payload.person_name,
      groups: payload.groups,
    })
    .select('id')
    .single()

  if (error) return { id: null, error: error.message }
  return { id: data?.id as string, error: null }
}

export async function updateProductionSnapshot(
  id: string,
  payload: { work_date: string; person_name: string; groups: ProjectGroup[] },
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase yapılandırılmadı.' }
  const { error } = await supabase
    .from('production_snapshots')
    .update({
      work_date: payload.work_date,
      person_name: payload.person_name,
      groups: payload.groups,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteProductionSnapshot(
  id: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase yapılandırılmadı.' }
  const { error } = await supabase.from('production_snapshots').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

/** Başlık, tarih (ISO veya GG.AA.YYYY), ID, isim, imalat metinlerinde arama */
export function snapshotMatchesQuery(
  row: ProductionSnapshotRow,
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

  const chunks: string[] = [
    iso,
    tr,
    row.person_name,
    ...row.groups.flatMap((g) => [
      g.title,
      g.projectId,
      ...g.lines.map((l) => [l.name, l.material, l.quantity, l.unit].join(' ')),
    ]),
  ]

  const haystack = chunks.join(' ').toLowerCase()
  if (haystack.includes(q)) return true

  const digits = q.replace(/\D/g, '')
  if (digits.length >= 2 && iso.replace(/\D/g, '').includes(digits)) return true

  return false
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
