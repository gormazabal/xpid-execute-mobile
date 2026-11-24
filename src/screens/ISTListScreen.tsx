import { useEffect, useState } from 'react'
import { executionsApi } from '../api'
import type { TestExecution } from '../types/domain'
import TopBar from '../components/TopBar'
import StatusPill from '../components/StatusPill'
import { useLanguage } from '../i18n'

export default function ISTListScreen({
  onBack,
  onSelect,
}: {
  onBack: () => void
  onSelect: (e: TestExecution) => void
}) {
  const { t, lang } = useLanguage()
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    executionsApi.list({ test_type: 'IST' })
      .then(setExecutions)
      .catch(() => setError(t('istList.error')))
      .finally(() => setLoading(false))
  }, [])

  const dateLocale = lang === 'en' ? 'en-US' : 'es-CL'

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopBar title={t('istList.topBarTitle')} onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-6">
        {loading ? (
          <p className="pt-8 text-center text-sm text-muted">{t('istList.loading')}</p>
        ) : error ? (
          <p className="pt-8 text-center text-sm text-rose-soft">{error}</p>
        ) : executions.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted">{t('istList.noTests')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {executions.map((e) => (
              <li key={e.execution_id}>
                <button
                  onClick={() => onSelect(e)}
                  className="flex w-full flex-col gap-2 rounded-xl bg-surface1 border border-border1 px-4 py-4 text-left active:bg-surface2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-amber">IST</span>
                    <StatusPill status={e.status} />
                  </div>
                  {e.ist_protocol_id && (
                    <p className="text-sm font-medium text-text1">{e.ist_protocol_id}</p>
                  )}
                  <p className="text-xs text-muted">
                    {new Date(e.planned_date).toLocaleDateString(dateLocale, {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{t('istList.result')}{e.result}</span>
                    <span>{e.answers.length} {t('istList.items')}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
