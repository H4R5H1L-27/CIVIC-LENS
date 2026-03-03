import { AlertTriangle, AlertCircle, Info } from "lucide-react"

export type Severity = "critical" | "warning" | "info"

interface SeverityBadgeProps {
  severity: Severity
}

const severityConfig: Record<
  Severity,
  { label: string; className: string; Icon: typeof AlertTriangle }
> = {
  critical: {
    label: "CRITICAL",
    className: "bg-crisis-red text-foreground animate-crisis-pulse",
    Icon: AlertTriangle,
  },
  warning: {
    label: "WARNING",
    className: "bg-crisis-yellow text-background",
    Icon: AlertCircle,
  },
  info: {
    label: "INFO",
    className: "bg-muted-foreground text-background",
    Icon: Info,
  },
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity]
  const { Icon } = config

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${config.className}`}
      role="status"
      aria-label={`Severity: ${config.label}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
