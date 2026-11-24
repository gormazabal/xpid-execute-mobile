import { useEffect, useState } from 'react'
import { executionsApi } from '../api'
import type { Asset, TestExecution } from '../types/domain'
import TopBar from '../components/TopBar'
import StatusPill from '../components/StatusPill'
import { useLanguage } from '../i18n'

export default function TestListScreen({
  testType,
  asset,
  onBack,
  onSelect,
}: {
  testType: 'FAT' | 'SAT'
  asset: Asset
  onBack: () => void
  onSelect: (e: TestExecution) => void
}) {
  const { t, lang } = useLanguage()
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    executionsApi.list({ asset_id: asset.asset_id, test_type: testType })
      .then(setExecutions)
      .catch(() => setError(t('testList.error')))
      .finally(() => setLoading(false))
  }, [asset.asset_id, testType])

  const dateLocale = lang === 'en' ? 'en-US' : 'es-CL'

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopBar title={`${testType} – ${asset.asset_name}`} onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-6">
        {loading ? (
          <p className="pt-8 text-center text-sm text-muted">{t('testList.loading')}</p>
        ) : error ? (
          <p className="pt-8 text-center text-sm text-rose-soft">{error}</p>
        ) : executions.length === 0 ? (
          <div className="pt-8 text-center">
            <p className="text-sm text-muted">{t('testList.noTests', { testType })}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {executions.map((e) => (
              <li key={e.execution_id}>
                <button
                  onClick={() => onSelect(e)}
                  className="flex w-full flex-col gap-2 rounded-xl bg-surface1 border border-border1 px-4 py-4 text-left active:bg-surface2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-faint">{testType}</span>
                    <StatusPill status={e.status} />
                  </div>
                  <p className="text-sm font-medium text-text1">
                    {new Date(e.planned_date).toLocaleDateString(dateLocale, {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{t('testList.result')}{e.result}</span>
                    <span>{e.answers.length} {t('testList.items')}</span>
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
