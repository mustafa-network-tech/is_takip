import { chartColorForTitle } from '../lib/chartColors'

type Segment = { title: string; hours: number }

type Props = {
  segments: Segment[]
  /** false: yalnızca pasta (dashboard’da lejant yok) */
  showLegend?: boolean
  /** SVG boyutu (tailwind sınıfı, örn. h-36 w-36) */
  sizeClass?: string
}

export default function SoftwareHoursPieChart({
  segments,
  showLegend = true,
  sizeClass = 'h-52 w-52',
}: Props) {
  const total = segments.reduce((a, s) => a + (Number.isFinite(s.hours) ? s.hours : 0), 0)

  const cx = 100
  const cy = 100
  const r = 78
  const innerR = 38

  if (total <= 0) {
    return (
      <svg
        viewBox="0 0 200 200"
        className={`${sizeClass} shrink-0 text-zinc-300`}
        role="img"
        aria-label="Yazılım saati yok"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="rgb(244 244 245)"
          stroke="rgb(228 228 231)"
          strokeWidth={2}
        />
        <circle cx={cx} cy={cy} r={innerR} fill="white" />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize={11}
          fontWeight={600}
        >
          0 saat
        </text>
      </svg>
    )
  }

  let angle = -Math.PI / 2

  const paths = segments.map((s, i) => {
    const h = Number.isFinite(s.hours) ? s.hours : 0
    const slice = (h / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += slice
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const largeArc = slice > Math.PI ? 1 : 0
    const d = `M ${cx} ${cy} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`
    const color = chartColorForTitle(s.title)
    return (
      <path
        key={`${s.title}-${i}`}
        d={d}
        fill={color}
        stroke="white"
        strokeWidth={1.5}
        className="drop-shadow-sm"
      />
    )
  })

  const pct = (h: number) => `${Math.round((h / total) * 100)}%`

  const chart = (
    <svg
      viewBox="0 0 200 200"
      className={`${sizeClass} shrink-0`}
      role="img"
      aria-label="Yazılım saatleri başlıklara göre dağılım"
    >
      {paths}
      <circle cx={cx} cy={cy} r={innerR} fill="white" />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="#18181b"
        fontSize={12}
        fontWeight={700}
      >
        {total.toFixed(1)} saat
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="#71717a"
        fontSize={9}
      >
        toplam
      </text>
    </svg>
  )

  if (!showLegend) {
    return chart
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      {chart}
      <ul className="max-h-64 w-full max-w-md space-y-2 overflow-y-auto text-sm">
        {segments.map((s, i) => (
          <li
            key={`${s.title}-${i}`}
            className="flex items-start gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2"
          >
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: chartColorForTitle(s.title) }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">{s.title}</p>
              <p className="text-xs text-zinc-500">
                {s.hours.toFixed(2)} saat · {pct(s.hours)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
