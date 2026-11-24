export default function HomeScreen({
  onFAT,
  onSAT,
  onIST,
}: {
  onFAT: () => void
  onSAT: () => void
  onIST: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-5 pt-safe-top pb-safe-bottom">
      {/* Header */}
      <div className="pt-10 pb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">xPID Execute</p>
        <h1 className="mt-1 text-2xl font-bold text-text1">Control de Pruebas</h1>
        <p className="mt-1 text-sm text-muted">Selecciona el tipo de prueba</p>
      </div>

      {/* Type buttons */}
      <div className="flex flex-col gap-4">
        <TypeButton
          label="FAT"
          sublabel="Factory Acceptance Test"
          color="bg-blue/10 border-accent/30 active:bg-blue/20"
          badge="bg-accent/20 text-accent"
          onClick={onFAT}
        />
        <TypeButton
          label="SAT"
          sublabel="Site Acceptance Test"
          color="bg-emerald/10 border-emerald/30 active:bg-emerald/20"
          badge="bg-emerald/20 text-emerald"
          onClick={onSAT}
        />
        <TypeButton
          label="IST"
          sublabel="Integration System Test"
          color="bg-amber/10 border-amber/30 active:bg-amber/20"
          badge="bg-amber/20 text-amber"
          onClick={onIST}
        />
      </div>
    </div>
  )
}

function TypeButton({
  label,
  sublabel,
  color,
  badge,
  onClick,
}: {
  label: string
  sublabel: string
  color: string
  badge: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-5 text-left transition-colors ${color}`}
    >
      <span className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${badge}`}>
        {label}
      </span>
      <div>
        <p className="font-semibold text-text1">{label}</p>
        <p className="text-sm text-muted">{sublabel}</p>
      </div>
      <span className="ml-auto text-faint">›</span>
    </button>
  )
}
