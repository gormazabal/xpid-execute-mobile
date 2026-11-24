export interface Asset {
  asset_id: string
  asset_name: string
  domain_id: string
  active_temporary_asset_id: string | null
}

export type ChecklistInputType = 'PASS_FAIL' | 'NUMERIC' | 'TEXT' | 'PHOTO'

export interface ProtocolChecklistItem {
  item_id: string
  protocol_id: string
  sort_order: number
  section_name: string
  description: string
  expected_result: string | null
  evidence_required: boolean
  input_type: ChecklistInputType
  unit: string | null
  min_value: number | null
  max_value: number | null
  is_mandatory: boolean
}

export interface ISTAsset {
  id: number
  protocol_id: string
  asset_id: string
}

export interface TestProtocol {
  protocol_id: string
  domain_id: string | null
  title: string
  test_type: string
  asset_id: string | null
  revision: string
  checklist_items: ProtocolChecklistItem[]
  ist_assets: ISTAsset[]
}

export interface TestExecutionAnswer {
  answer_id: string
  execution_id: string
  protocol_id: string
  item_id: string
  pass_fail: boolean | null
  numeric_value: number | null
  text_value: string | null
  notes: string | null
  answered_by: string | null
  answered_at: string | null
}

export interface TestExecution {
  execution_id: string
  asset_id: string | null
  domain_id: string | null
  test_type: string
  ist_protocol_id: string | null
  planned_date: string
  status: string
  result: string
  notes: string | null
  answers: TestExecutionAnswer[]
}

export type NavState =
  | { screen: 'home' }
  | { screen: 'asset-select'; testType: 'FAT' | 'SAT' }
  | { screen: 'test-list'; testType: 'FAT' | 'SAT'; asset: Asset }
  | { screen: 'ist-list' }
  | { screen: 'execution'; execution: TestExecution }
