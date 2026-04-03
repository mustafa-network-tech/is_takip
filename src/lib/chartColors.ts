/** Grafiklerde tutarlı, ayırt edilebilir renkler */
export const CHART_COLORS = [
  '#4f46e5',
  '#0891b2',
  '#059669',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#ea580c',
  '#0d9488',
  '#1e40af',
  '#b45309',
  '#52525b',
  '#be123c',
  '#16a34a',
  '#ca8a04',
  '#9333ea',
  '#dc2626',
  '#0284c7',
  '#65a30d',
  '#c026d3',
] as const

export function chartColorAt(index: number): string {
  return CHART_COLORS[((index % CHART_COLORS.length) + CHART_COLORS.length) % CHART_COLORS.length]
}

/** Aynı başlık her zaman aynı renk (takvim + pasta uyumu) */
export function chartColorForTitle(title: string): string {
  let h = 0
  for (let i = 0; i < title.length; i++) {
    h = (h * 31 + title.charCodeAt(i)) >>> 0
  }
  return chartColorAt(h % CHART_COLORS.length)
}
