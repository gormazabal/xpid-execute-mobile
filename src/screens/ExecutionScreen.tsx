import { useEffect, useMemo, useState } from 'react'
import { executionsApi, ncrApi, protocolsApi, punchListApi } from '../api'
import type { ProtocolChecklistItem, TestExecution, TestExecutionAnswer, TestProtocol } from '../types/domain'
import TopBar from '../components/TopBar'
import StatusPill from '../components/StatusPill'

function computeAutoStatus(
  pairs: Array<{ answer: TestExecutionAnswer; item: ProtocolChecklistItem }>,
  current: string,
): string {
  if (current === 'APPROVED' || current === 'CLOSED') return current
  const total = pairs.length
  if (total === 0) return 'DEFINED'
  const answered = pairs.filter(({ answer }) => answer.answered_at !== null).length
  if (answered === 0) return 'READY'
  if (answered < total) return 'IN_PROGRESS'
  const mandatoryFailed = pairs.some(({ item, answer }) => item.is_mandatory && answer.pass_fail === false)
  const anyFailed = pairs.some(({ answer }) => answer.pass_fail === false)
  if (mandatoryFailed) return 'FAIL'
  if (anyFailed) return 'CONDITIONAL_PASS'
  return 'PASS'
}

export default function ExecutionScreen({
  execution,
  onBack,
  onUpdated,
  onClose,
}: {
  execution: TestExecution
  onBack: () => void
  onUpdated: (updated: TestExecution) => void
  onClose: () => void
}) {
  const [protocols, setProtocols] = useState<TestProtocol[]>([])
  const [loadingProtocols, setLoadingProtocols] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createdRecord, setCreatedRecord] = useState<{ type: 'NCR' | 'PUNCH'; code: string } | null>(null)

  useEffect(() => {
    setLoadingProtocols(true)
    const fetch = execution.ist_protocol_id
      ? protocolsApi.list()
      : protocolsApi.list(execution.domain_id ?? undefined)

    fetch
      .then((all) => {
        const forType = all.filter((p) => p.test_type === execution.test_type)
        if (execution.ist_protocol_id) {
          const specific = forType.find((p) => p.protocol_id === execution.ist_protocol_id)
          setProtocols(specific ? [specific] : [])
        } else if (execution.asset_id) {
          const assetSpecific = forType.filter((p) => p.asset_id === execution.asset_id)
          setProtocols(assetSpecific.length > 0 ? assetSpecific : forType.filter((p) => p.asset_id === null))
        } else {
          setProtocols(forType.filter((p) => p.asset_id === null))
        }
      })
      .catch(() => setProtocols([]))
      .finally(() => setLoadingProtocols(false))
  }, [execution.execution_id])

  const answersByProtocol = useMemo(() =>
    protocols.map((protocol) => ({
      protocol,
      pairs: [...protocol.checklist_items]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          item,
          answer: execution.answers.find((a) => a.item_id === String(item.item_id)) ?? {
            answer_id: '',
            execution_id: execution.execution_id,
            protocol_id: protocol.protocol_id,
            item_id: String(item.item_id),
            pass_fail: null,
            numeric_value: null,
            text_value: null,
            notes: null,
            answered_by: null,
            answered_at: null,
          },
        })),
    })), [protocols, execution.answers])

  const allPairs = answersByProtocol.flatMap((g) => g.pairs)

  const answered = allPairs.filter(({ answer }) => answer.answered_at !== null).length
  const total = allPairs.length
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0

  const updateAnswer = async (
    answer: TestExecutionAnswer,
    item: ProtocolChecklistItem,
    patch: { pass_fail?: boolean | null; numeric_value?: number | null; text_value?: string | null },
    notes?: string,
    evidenceFile?: File,
    issueData?: { description: string; severity?: string; punch_type?: string },
  ) => {
    if (!answer.answer_id) return
    setSaving(answer.answer_id)
    setError(null)
    try {
      // If FAIL: create NCR or Punch List first — if this fails, abort without saving the answer
      if (patch.pass_fail === false && issueData) {
        const base = {
          asset_id: execution.asset_id ?? undefined,
          source_category: execution.test_type,
          source_activity: item.description,
          description: issueData.description,
        }
        if (item.is_mandatory) {
          const ncr = await ncrApi.create({ ...base, severity: issueData.severity ?? 'MINOR' })
          setCreatedRecord({ type: 'NCR', code: ncr.ncr_code })
        } else {
          const punch = await punchListApi.create({ ...base, punch_type: issueData.punch_type ?? 'B_PUNCH' })
          setCreatedRecord({ type: 'PUNCH', code: punch.punch_code })
        }
      }

      await executionsApi.updateAnswer(execution.execution_id, answer.answer_id, {
        ...patch,
        ...(notes ? { notes } : {}),
        answered_by: 'mobile-user',
      })
      if (evidenceFile) {
        await executionsApi.uploadEvidence(execution.execution_id, answer.answer_id, evidenceFile)
      }
      const updated = await executionsApi.get(execution.execution_id)
      const updatedPairs = protocols.flatMap((p) =>
        p.checklist_items.map((i) => ({
          item: i,
          answer: updated.answers.find((a) => a.item_id === String(i.item_id)) ?? {
            answer_id: '', execution_id: updated.execution_id,
            protocol_id: p.protocol_id, item_id: String(i.item_id),
            pass_fail: null, numeric_value: null, text_value: null,
            notes: null, answered_by: null, answered_at: null,
          },
        })),
      )
      const newStatus = computeAutoStatus(updatedPairs, updated.status)
      if (newStatus !== updated.status) {
        const statusUpdated = await executionsApi.update(execution.execution_id, { status: newStatus })
        onUpdated({ ...statusUpdated, answers: updated.answers })
      } else {
        onUpdated(updated)
      }
    } catch {
      setError(item.is_mandatory
        ? 'Error al crear NCR. Respuesta no guardada.'
        : 'Error al crear Punch List. Respuesta no guardada.')
    } finally {
      setSaving(null)
    }
  }

  const EDITABLE_STATUSES = new Set(['READY', 'IN_PROGRESS', 'RETEST_REQUIRED'])
  const isEditable = EDITABLE_STATUSES.has(execution.status)

  const isIST = execution.test_type === 'IST'
  const istProtocolTitle = protocols.find((p) => p.protocol_id === execution.ist_protocol_id)?.title

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopBar
        title={`${execution.test_type}${istProtocolTitle ? ' – ' + istProtocolTitle : ''}`}
        onBack={onBack}
      />

      {/* Info header */}
      <div className="shrink-0 bg-surface1 border-b border-border1 px-4 py-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted">Tipo</span>
          <span className="text-text2">{execution.test_type}</span>
          {!isIST && execution.domain_id && (
            <>
              <span className="text-muted">Dominio</span>
              <span className="text-text2">{execution.domain_id}</span>
            </>
          )}
          <span className="text-muted">Fecha planificada</span>
          <span className="text-text2">
            {new Date(execution.planned_date).toLocaleDateString('es-CL')}
          </span>
          <span className="text-muted">Estado</span>
          <StatusPill status={execution.status} />
          <span className="text-muted">Progreso</span>
          <span className="text-text2">{answered}/{total} ítems</span>
        </div>

        {total > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border1">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}


        {error && <p className="mt-2 text-xs text-rose-soft">{error}</p>}
        {createdRecord && (
          <div className={`mt-2 flex items-center justify-between rounded-lg border px-3 py-2 ${createdRecord.type === 'NCR' ? 'border-rose/30 bg-rose/5' : 'border-amber/30 bg-amber/5'}`}>
            <p className="text-xs text-text2">
              <span className={`font-semibold ${createdRecord.type === 'NCR' ? 'text-rose-soft' : 'text-amber'}`}>
                {createdRecord.type === 'NCR' ? 'NCR' : 'Punch List'}
              </span>{' '}
              creado: <span className="font-mono">{createdRecord.code}</span>
            </p>
            <button onClick={() => setCreatedRecord(null)} className="ml-2 text-faint text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="flex-1 overflow-y-auto">
        {loadingProtocols ? (
          <p className="pt-8 text-center text-sm text-muted">Cargando checklist…</p>
        ) : answersByProtocol.length === 0 ? (
          <div className="mx-4 mt-4 rounded-xl border border-amber/20 bg-amber/5 px-4 py-3">
            <p className="text-sm font-medium text-amber">Sin protocolo disponible</p>
            <p className="mt-0.5 text-xs text-muted">
              Esta prueba fue creada sin protocolo asignado.
            </p>
          </div>
        ) : (
          answersByProtocol.map(({ protocol, pairs }) => (
            <div key={protocol.protocol_id}>
              {/* Protocol title */}
              <div className="sticky top-0 z-10 bg-bg/95 px-4 py-2 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                  {protocol.title}
                  <span className="ml-2 font-normal normal-case text-muted/60">({protocol.revision})</span>
                </p>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-2 px-4 pb-2">
                {pairs.map(({ item, answer }) => (
                  <ChecklistCard
                    key={String(item.item_id)}
                    item={item}
                    answer={answer}
                    saving={saving === answer.answer_id}
                    editable={isEditable}
                    onUpdate={(patch, notes, file, issueData) => updateAnswer(answer, item, patch, notes, file, issueData)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        {/* Bottom padding for safe area */}
        <div className="h-8" />
      </div>
    </div>
  )
}

// ─── Checklist Card ───────────────────────────────────────────────────────────

type PendingPatch = {
  pass_fail?: boolean | null
  numeric_value?: number | null
  text_value?: string | null
}

const NCR_SEVERITIES = ['CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION'] as const
const PUNCH_TYPES = ['A_PUNCH', 'B_PUNCH', 'C_PUNCH'] as const

function ChecklistCard({
  item,
  answer,
  saving,
  editable,
  onUpdate,
}: {
  item: ProtocolChecklistItem
  answer: TestExecutionAnswer
  saving: boolean
  editable: boolean
  onUpdate: (
    patch: PendingPatch,
    notes?: string,
    file?: File,
    issueData?: { description: string; severity?: string; punch_type?: string },
  ) => void
}) {
  const [numericInput, setNumericInput] = useState(answer.numeric_value?.toString() ?? '')
  const [textInput, setTextInput]       = useState(answer.text_value ?? '')

  // State machine stages (only one active at a time):
  // null           → normal input controls
  // 'pass-fail'    → NUMERIC/TEXT: ask user PASS or FAIL
  // 'confirm'      → show result + evidence picker (for PASS)
  // 'issue-form'   → NCR / Punch List form (for FAIL)
  const [stage, setStage] = useState<'pass-fail' | 'confirm' | 'issue-form' | null>(null)
  const [pending, setPending] = useState<PendingPatch>({})

  // Issue form fields
  const [issueDesc,      setIssueDesc]      = useState('')
  const [issueSeverity,  setIssueSeverity]  = useState<string>('MINOR')
  const [issuePunchType, setIssuePunchType] = useState<string>('B_PUNCH')

  // Evidence (PASS + evidence_required)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [preview,      setPreview]      = useState<string | null>(null)

  const isAnswered = answer.answered_at !== null
  const pf         = answer.pass_fail
  const disabled   = !editable || saving

  // ── helpers ──────────────────────────────────────────────────────────────
  const evaluateNumericPass = (val: number): boolean | null => {
    if (item.min_value === null && item.max_value === null) return null
    const aboveMin = item.min_value === null || val >= item.min_value
    const belowMax = item.max_value === null || val <= item.max_value
    return aboveMin && belowMax
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setEvidenceFile(file)
    setPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  const resetAll = () => {
    setStage(null)
    setPending({})
    setIssueDesc('')
    setIssueSeverity('MINOR')
    setIssuePunchType('B_PUNCH')
    setEvidenceFile(null)
    setPreview(null)
  }

  const goToIssueForm = (patch: PendingPatch) => {
    setPending(patch)
    setIssueDesc('')
    setStage('issue-form')
  }

  const goToConfirm = (patch: PendingPatch) => {
    setPending(patch)
    setEvidenceFile(null)
    setPreview(null)
    setStage('confirm')
  }

  // ── entry points from input controls ─────────────────────────────────────

  // PASS_FAIL item: direct click
  const handlePassFail = (isPass: boolean) => {
    if (!editable) return
    if (isPass) goToConfirm({ pass_fail: true })
    else        goToIssueForm({ pass_fail: false })
  }

  // NUMERIC: after pressing OK
  const handleNumericOK = () => {
    const val = parseFloat(numericInput)
    if (isNaN(val)) return
    const evalResult = evaluateNumericPass(val)
    if (evalResult !== null) {
      // Range known — auto-evaluate
      if (evalResult) goToConfirm({ numeric_value: val, pass_fail: true })
      else            goToIssueForm({ numeric_value: val, pass_fail: false })
    } else {
      // No range — ask user PASS or FAIL
      setPending({ numeric_value: val })
      setStage('pass-fail')
    }
  }

  // TEXT: after pressing OK
  const handleTextOK = () => {
    const val = textInput.trim()
    if (!val) return
    setPending({ text_value: val })
    setStage('pass-fail')
  }

  // ── stage transitions ──────────────────────────────────────────────────

  // 'pass-fail' stage: user picks PASS or FAIL
  const choosePassFail = (isPass: boolean) => {
    const patch = { ...pending, pass_fail: isPass }
    if (isPass) goToConfirm(patch)
    else        goToIssueForm(patch)
  }

  // 'confirm' stage: user confirms PASS
  const confirmPass = () => {
    onUpdate(pending, undefined, evidenceFile ?? undefined)
    resetAll()
  }

  // 'issue-form' stage: user submits NCR/Punch
  const confirmIssue = () => {
    if (!issueDesc.trim()) return
    onUpdate(pending, undefined, undefined, {
      description:  issueDesc.trim(),
      severity:     issueSeverity,
      punch_type:   issuePunchType,
    })
    resetAll()
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const evidenceRequired  = item.evidence_required
  const canConfirmPass    = !evidenceRequired || evidenceFile !== null

  const pendingIsPass = pending.pass_fail === true
  const pendingIsFail = pending.pass_fail === false
  const valueLabel = pending.numeric_value != null
    ? `${pending.numeric_value} ${item.unit ?? ''}`.trim()
    : pending.text_value ?? ''

  const passBg = pf === true && stage === null
    ? 'bg-emerald/20 border-emerald/50 text-emerald'
    : editable ? 'bg-surface2 border-border1 text-muted active:bg-emerald/10'
    : 'bg-surface2 border-border1 text-muted/40'
  const failBg = pf === false && stage === null
    ? 'bg-rose/20 border-rose/50 text-rose-soft'
    : editable ? 'bg-surface2 border-border1 text-muted active:bg-rose/10'
    : 'bg-surface2 border-border1 text-muted/40'

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={`rounded-xl border px-4 py-3 ${isAnswered && stage === null ? 'border-border1' : 'border-border1/60'} bg-surface1 ${!editable ? 'opacity-75' : ''}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text1 leading-snug">{item.description}</p>
          {item.section_name  && <p className="mt-0.5 text-xs text-faint">{item.section_name}</p>}
          {item.expected_result && <p className="mt-0.5 text-xs text-muted">Esperado: {item.expected_result}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {item.is_mandatory && (
            <span className="rounded bg-rose/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-soft">OBLIGATORIO</span>
          )}
          {item.evidence_required && (
            <span className="rounded bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">EVIDENCIA</span>
          )}
        </div>
      </div>

      {/* ── Stage: NCR / Punch List form ── */}
      {stage === 'issue-form' && (
        <div className="rounded-lg border border-rose/30 bg-rose/5 px-3 py-3 mb-2">
          <p className="text-[11px] font-semibold text-rose-soft mb-2">
            {item.is_mandatory ? 'Registrar NCR' : 'Registrar Punch List'}
          </p>
          {valueLabel && (
            <p className="text-xs text-muted mb-2">Valor registrado: <span className="font-medium text-text2">{valueLabel}</span></p>
          )}

          {item.is_mandatory ? (
            <div className="mb-3">
              <label className="mb-1 block text-[11px] text-muted uppercase tracking-wide">Severidad</label>
              <select value={issueSeverity} onChange={(e) => setIssueSeverity(e.target.value)}
                className="w-full rounded-lg bg-surface2 border border-border1 px-3 py-2 text-sm text-text1 outline-none focus:border-accent">
                {NCR_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : (
            <div className="mb-3">
              <label className="mb-1 block text-[11px] text-muted uppercase tracking-wide">Tipo</label>
              <select value={issuePunchType} onChange={(e) => setIssuePunchType(e.target.value)}
                className="w-full rounded-lg bg-surface2 border border-border1 px-3 py-2 text-sm text-text1 outline-none focus:border-accent">
                {PUNCH_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-[11px] text-muted uppercase tracking-wide">Descripción *</label>
            <textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} rows={3}
              placeholder={item.is_mandatory ? 'Descripción de la no conformidad…' : 'Descripción del punch list…'}
              className="w-full rounded-lg bg-surface2 border border-border1 px-3 py-2 text-sm text-text1 placeholder:text-faint outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button disabled={saving || !issueDesc.trim()} onClick={confirmIssue}
              className="flex-1 rounded-lg bg-rose/20 border border-rose/30 py-2 text-sm font-semibold text-rose-soft disabled:opacity-40 active:bg-rose/30">
              {saving ? 'Guardando…' : item.is_mandatory ? 'Registrar NCR' : 'Registrar Punch List'}
            </button>
            <button disabled={saving} onClick={resetAll}
              className="rounded-lg bg-surface2 border border-border1 px-4 py-2 text-sm text-muted active:bg-surface2/80">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Stage: PASS / FAIL choice (for NUMERIC/TEXT without range) ── */}
      {stage === 'pass-fail' && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-3 mb-2">
          <p className="text-xs text-muted mb-1">Valor registrado:</p>
          <p className="text-base font-bold text-accent mb-3">{valueLabel}</p>
          <p className="text-[11px] text-muted mb-2">¿El resultado es conforme?</p>
          <div className="flex gap-2">
            <button disabled={disabled} onClick={() => choosePassFail(true)}
              className="flex-1 rounded-lg border border-emerald/50 bg-emerald/10 py-2.5 text-sm font-semibold text-emerald active:bg-emerald/20 disabled:opacity-50">
              PASS
            </button>
            <button disabled={disabled} onClick={() => choosePassFail(false)}
              className="flex-1 rounded-lg border border-rose/50 bg-rose/10 py-2.5 text-sm font-semibold text-rose-soft active:bg-rose/20 disabled:opacity-50">
              FAIL
            </button>
          </div>
          <button disabled={disabled} onClick={resetAll}
            className="mt-2 w-full rounded-lg bg-surface2 border border-border1 py-1.5 text-xs text-muted active:bg-surface2/80">
            Cancelar
          </button>
        </div>
      )}

      {/* ── Stage: confirm PASS (+ optional evidence) ── */}
      {stage === 'confirm' && (
        <div className="rounded-lg border border-emerald/30 bg-emerald/5 px-3 py-3 mb-2">
          <p className="text-xs text-muted mb-1">Confirmando resultado:</p>
          <p className="text-base font-bold text-emerald mb-2">
            PASS{valueLabel ? ` – ${valueLabel}` : ''}
          </p>

          {evidenceRequired && (
            <div className="mb-3">
              <label className="mb-1 block text-[11px] font-semibold text-amber">Evidencia requerida *</label>
              {preview && <img src={preview} alt="preview" className="mb-2 w-full rounded-lg object-cover max-h-40 border border-border1" />}
              {evidenceFile && !preview && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface2 border border-border1 px-3 py-2">
                  <span className="text-xs text-accent">📄</span>
                  <span className="truncate text-xs text-text2">{evidenceFile.name}</span>
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-amber/30 bg-amber/10 py-2 text-xs font-semibold text-amber active:bg-amber/20">
                  <span>📷 Cámara</span>
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFileChange} />
                </label>
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border1 bg-surface2 py-2 text-xs font-semibold text-muted active:bg-surface2/80">
                  <span>📁 Archivo</span>
                  <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={handleFileChange} />
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button disabled={saving || !canConfirmPass} onClick={confirmPass}
              className="flex-1 rounded-lg bg-emerald/20 border border-emerald/30 py-2 text-sm font-semibold text-emerald disabled:opacity-40 active:bg-emerald/30">
              {saving ? 'Guardando…' : 'Confirmar PASS'}
            </button>
            <button disabled={saving} onClick={resetAll}
              className="rounded-lg bg-surface2 border border-border1 px-4 py-2 text-sm text-muted active:bg-surface2/80">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Normal input controls (stage === null) ── */}
      {stage === null && (
        <>
          {item.input_type === 'PASS_FAIL' && (
            <div className="flex gap-2">
              <button disabled={disabled} onClick={() => handlePassFail(true)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${passBg} disabled:opacity-50`}>
                PASS
              </button>
              <button disabled={disabled} onClick={() => handlePassFail(false)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${failBg} disabled:opacity-50`}>
                FAIL
              </button>
            </div>
          )}

          {item.input_type === 'NUMERIC' && (
            <>
              <div className="flex gap-2">
                <input type="number" value={numericInput}
                  onChange={(e) => editable && setNumericInput(e.target.value)}
                  readOnly={!editable} placeholder={item.unit ?? '0'}
                  className={`flex-1 rounded-lg bg-surface2 border border-border1 px-3 py-2.5 text-sm text-text1 placeholder:text-faint outline-none ${editable ? 'focus:border-accent' : 'cursor-default'}`}
                />
                <button disabled={disabled || !numericInput} onClick={handleNumericOK}
                  className="rounded-lg bg-accent/20 border border-accent/30 px-4 py-2.5 text-sm font-semibold text-accent disabled:opacity-40">
                  OK
                </button>
              </div>
              {(item.min_value !== null || item.max_value !== null) && (
                <p className="mt-1 text-[10px] text-faint">Rango: {item.min_value ?? '—'} – {item.max_value ?? '—'} {item.unit ?? ''}</p>
              )}
            </>
          )}

          {item.input_type === 'TEXT' && (
            <div className="flex flex-col gap-2">
              <textarea value={textInput} onChange={(e) => editable && setTextInput(e.target.value)}
                readOnly={!editable} rows={2}
                placeholder={editable ? 'Ingresa el resultado…' : ''}
                className={`w-full rounded-lg bg-surface2 border border-border1 px-3 py-2 text-sm text-text1 placeholder:text-faint outline-none resize-none ${editable ? 'focus:border-accent' : 'cursor-default'}`}
              />
              {editable && (
                <button disabled={saving || !textInput.trim()} onClick={handleTextOK}
                  className="self-end rounded-lg bg-accent/20 border border-accent/30 px-4 py-2 text-sm font-semibold text-accent disabled:opacity-40">
                  OK
                </button>
              )}
            </div>
          )}

          {item.input_type === 'PHOTO' && (
            <p className="text-xs text-muted italic">Evidencia fotográfica — usar la aplicación de escritorio.</p>
          )}
        </>
      )}
    </div>
  )
}
