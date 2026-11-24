import { useLanguage } from '../i18n'

export default function NoAccessScreen({ onLogout }: { onLogout: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-6 text-center">
      <div className="text-5xl">🔒</div>
      <h1 className="text-lg font-semibold text-white">{t('noAccess.title')}</h1>
      <p className="max-w-xs text-sm text-gray-400">{t('noAccess.message')}</p>
      <button
        onClick={onLogout}
        className="mt-4 rounded-lg border border-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-800"
      >
        {t('noAccess.logout')}
      </button>
    </div>
  )
}
