import { api } from './client'
import type { Asset, TestExecution, TestProtocol } from '../types/domain'

export const ncrApi = {
  create: (data: { asset_id?: string; source_category?: string; source_activity?: string; severity?: string; description: string }) =>
    api.post<{ ncr_id: string; ncr_code: string }>('/workstreams/ncr', data),
}

export const punchListApi = {
  create: (data: { asset_id?: string; source_category?: string; source_activity?: string; punch_type?: string; description: string }) =>
    api.post<{ punch_id: string; punch_code: string }>('/workstreams/punch-list', data),
}

export const assetsApi = {
  list: () => api.get<Asset[]>('/mdm/assets'),
}

export const protocolsApi = {
  list: (domainId?: string) =>
    api.get<TestProtocol[]>(domainId ? `/mdm/protocols?domain_id=${encodeURIComponent(domainId)}` : '/mdm/protocols'),
}

export const executionsApi = {
  list: (filters: { asset_id?: string; test_type?: string }) => {
    const p = new URLSearchParams()
    if (filters.asset_id) p.set('asset_id', filters.asset_id)
    if (filters.test_type) p.set('test_type', filters.test_type)
    return api.get<TestExecution[]>(`/workstreams/test-executions?${p}`)
  },
  get: (id: string) => api.get<TestExecution>(`/workstreams/test-executions/${id}`),
  update: (id: string, data: { status?: string; result?: string }) =>
    api.put<TestExecution>(`/workstreams/test-executions/${id}`, data),
  updateAnswer: (
    executionId: string,
    answerId: string,
    data: {
      pass_fail?: boolean | null
      numeric_value?: number | null
      text_value?: string | null
      notes?: string | null
      answered_by?: string
    },
  ) => api.put<unknown>(`/workstreams/test-executions/${executionId}/answers/${answerId}`, data),
  uploadEvidence: (executionId: string, answerId: string, file: File) =>
    api.postFile<unknown>(`/workstreams/test-executions/${executionId}/answers/${answerId}/evidence`, file),
}
