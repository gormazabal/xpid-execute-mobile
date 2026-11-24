import { useLanguage } from '../i18n'

export default function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border1 bg-surface1 px-4 py-3.5">
      <button
        onClick={onBack}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-text2 active:bg-border1 transition-colors"
        aria-label={t('topBar.back')}
      >
        ‹
      </button>
      <h1 className="flex-1 truncate text-sm font-semibold text-text1">{title}</h1>
    </div>
  )
}
