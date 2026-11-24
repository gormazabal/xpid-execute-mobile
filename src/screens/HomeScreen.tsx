import { useAuth } from '../auth/AuthContext'
import { useLanguage, AVAILABLE_LANGS, type Lang } from '../i18n'

export default function HomeScreen({
  onFAT,
  onSAT,
  onIST,
}: {
  onFAT: () => void
  onSAT: () => void
  onIST: () => void
}) {
  const { logout, fullName, role } = useAuth()
  const { t, lang, setLang } = useLanguage()

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-5 pt-safe-top pb-safe-bottom">
      {/* TopBar */}
      <div className="flex items-center justify-between border-b border-border1 bg-surface1 -mx-5 px-5 py-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-medium text-text2 truncate">{fullName}</span>
          {role && <span className="text-[10px] text-faint capitalize">{role}</span>}
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <LangToggle lang={lang} setLang={setLang} />
          <button
            onClick={logout}
            className="rounded-lg border border-border1 px-3 py-1.5 text-[11px] text-text3 transition-colors active:bg-surface2"
          >
            {t('home.logout')}
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="pt-10 pb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">xPID Execute</p>
        <h1 className="mt-1 text-2xl font-bold text-text1">{t('home.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('home.subtitle')}</p>
      </div>

      {/* Type buttons */}
      <div className="flex flex-col gap-4">
        <TypeButton label="FAT" sublabel={t('home.fat')}
          color="bg-blue/10 border-accent/30 active:bg-blue/20"
          badge="bg-accent/20 text-accent" onClick={onFAT} />
        <TypeButton label="SAT" sublabel={t('home.sat')}
          color="bg-emerald/10 border-emerald/30 active:bg-emerald/20"
          badge="bg-emerald/20 text-emerald" onClick={onSAT} />
        <TypeButton label="IST" sublabel={t('home.ist')}
          color="bg-amber/10 border-amber/30 active:bg-amber/20"
          badge="bg-amber/20 text-amber" onClick={onIST} />
      </div>
    </div>
  )
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="rounded-lg border border-border1 bg-surface2 px-2 py-1.5 text-[11px] font-medium text-text2 outline-none focus:border-accent"
    >
      {AVAILABLE_LANGS.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  )
}

function TypeButton({ label, sublabel, color, badge, onClick }: {
  label: string; sublabel: string; color: string; badge: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-5 text-left transition-colors ${color}`}>
      <span className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${badge}`}>{label}</span>
      <div>
        <p className="font-semibold text-text1">{label}</p>
        <p className="text-sm text-muted">{sublabel}</p>
      </div>
      <span className="ml-auto text-faint">›</span>
    </button>
  )
}
