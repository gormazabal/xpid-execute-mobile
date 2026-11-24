import { useEffect, useState } from 'react'
import { assetsApi, executionsApi } from '../api'
import type { Asset } from '../types/domain'
import TopBar from '../components/TopBar'

export default function AssetScreen({
  testType,
  onBack,
  onSelect,
}: {
  testType: 'FAT' | 'SAT'
  onBack: () => void
  onSelect: (asset: Asset) => void
}) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      assetsApi.list(),
      executionsApi.list({ test_type: testType }),
    ])
      .then(([allAssets, executions]) => {
        const assetIdsWithTests = new Set(
          executions.filter((e) => e.asset_id).map((e) => e.asset_id as string),
        )
        const filtered = allAssets
          .filter((a) => assetIdsWithTests.has(a.asset_id))
          .sort((x, y) => x.asset_name.localeCompare(y.asset_name, 'es'))
        setAssets(filtered)
      })
      .catch(() => setError('No se pudo cargar la lista de activos.'))
      .finally(() => setLoading(false))
  }, [testType])

  const filtered = assets.filter((a) =>
    a.asset_name.toLowerCase().includes(search.toLowerCase()) ||
    a.asset_id.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopBar title={`${testType} – Selecciona activo`} onBack={onBack} />

      <div className="px-4 pt-3 pb-2">
        <input
          type="search"
          placeholder="Buscar activo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl bg-surface1 px-4 py-3 text-sm text-text1 placeholder:text-faint outline-none border border-border1 focus:border-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <p className="pt-8 text-center text-sm text-muted">Cargando activos…</p>
        ) : error ? (
          <p className="pt-8 text-center text-sm text-rose-soft">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted">Sin resultados.</p>
        ) : (
          <ul className="flex flex-col gap-2 pt-1">
            {filtered.map((a) => (
              <li key={a.asset_id}>
                <button
                  onClick={() => onSelect(a)}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface1 border border-border1 px-4 py-3.5 text-left active:bg-surface2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium text-text1">
                      <span className="truncate">{a.asset_name}</span>
                      {a.active_temporary_asset_id && (
                        <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none border bg-amber-500/15 text-amber-300 border-amber-500/40">TEMP</span>
                      )}
                    </p>
                    <p className="text-xs text-muted">{a.domain_id}</p>
                  </div>
                  <span className="shrink-0 text-faint">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
