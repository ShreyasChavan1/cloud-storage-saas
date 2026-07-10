interface StorageRingProps {
  value: number
  max: number
  size?: number
}

export function StorageRing({ value, max, size = 96 }: StorageRingProps) {
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(1, value / max)
  const offset = circumference * (1 - pct)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-100 dark:stroke-dark-surface2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-brand-500 transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold text-ink-900 dark:text-white">
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  )
}
