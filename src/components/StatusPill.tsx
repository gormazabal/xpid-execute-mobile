const TONE: Record<string, string> = {
  DEFINED: 'bg-faint/20 text-faint',
  PROTOCOL_PREPARATION: 'bg-faint/20 text-faint',
  PROTOCOL_REVIEW: 'bg-accent/20 text-accent',
  READY: 'bg-accent/20 text-accent',
  BLOCKED: 'bg-rose/20 text-rose-soft',
  IN_PROGRESS: 'bg-amber/20 text-amber',
  PASS: 'bg-emerald/20 text-emerald',
  CONDITIONAL_PASS: 'bg-amber/20 text-amber',
  FAIL: 'bg-rose/20 text-rose-soft',
  RETEST_REQUIRED: 'bg-amber/20 text-amber',
  APPROVED: 'bg-emerald/20 text-emerald',
  CLOSED: 'bg-faint/20 text-faint',
}

export default function StatusPill({ status }: { status: string }) {
  const cls = TONE[status] ?? 'bg-surface2 text-muted'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}
