/**
 * GhostTrace AI — Type Definitions
 * Data contracts for audit engine, evidence exploration, identity resolution,
 * remediation planning, evaluation laboratory, and cost analytics.
 */

export type DeletionStatus = 'COMPLETE' | 'INCOMPLETE' | 'NOT_APPLICABLE';

export type StepPhase = 'FINDING' | 'REMEDIATION' | 'VERIFICATION';

export type FindingOperation =
  | 'REPORT_REMAINING_RECORD'
  | 'REPORT_EXPOSED_PII'
  | 'REPORT_ACTIVE_DATA_FLOW'
  | 'REPORT_RESTORE_RISK';

export type RemediationOperation =
  | 'DISABLE_DATA_FLOW'
  | 'BLOCK_RESTORE'
  | 'DELETE_RECORD'
  | 'REDACT_RECORD'
  | 'ANONYMIZE_RECORD';

export type VerificationOperation =
  | 'VERIFY_RECORD_ABSENT'
  | 'VERIFY_RECORD_PRESENT'
  | 'VERIFY_RECORD_REDACTED'
  | 'VERIFY_RECORD_ANONYMIZED'
  | 'VERIFY_DATA_FLOW_DISABLED'
  | 'VERIFY_RESTORE_BLOCKED';

export type StepOperation = FindingOperation | RemediationOperation | VerificationOperation;

export type StepState =
  | 'PRESENT'
  | 'ABSENT'
  | 'REDACTED'
  | 'ANONYMIZED'
  | 'ACTIVE'
  | 'DISABLED'
  | 'BLOCKED';

export interface AuditStep {
  step_no: number;
  phase: StepPhase;
  system_id: string;
  resource_id: string;
  operation: StepOperation;
  state: StepState;
  evidence_id: string;
}

export interface UserIdentity {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  email_hash: string;
  updated_at: string;
  historical_emails?: string[];
  historical_phones?: string[];
  historical_names?: string[];
}

export interface UserAuditLog {
  audit_id: string;
  user_id: string;
  event_time: string;
  field_name: string;
  old_value: string;
  new_value: string;
}

export interface DeletionRequest {
  case_id: string;
  email: string;
  requested_at: string;
  reported_status: 'COMPLETE' | 'PARTIALLY_COMPLETE' | 'NOT_STARTED';
  reported_at: string;
  audit_at: string;
  request_text: string;
}

export interface DeletionRule {
  rule_id: string;
  system_name?: string;
  data_category?: string;
  condition?: string;
  action?: string;
  required_action?: 'DELETE' | 'REDACT' | 'ANONYMIZE' | 'RETAIN';
  sla?: string;
  ordering?: number;
  description?: string;
}

export interface EvidenceFileManifest {
  file_id: string;
  file_path: string;
  origin: string;
  captured_at: string;
  category?: 'database' | 'log' | 'record' | 'document' | 'image';
}

export interface SystemActivity {
  activity_id: string;
  event_time: string;
  event_type: string;
  source_system: string;
  target_system: string;
  resource_id: string;
  reported_result: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  details: string;
}

export interface AuditCaseResult {
  case_id: string;
  email: string;
  requested_at: string;
  reported_status: 'COMPLETE' | 'PARTIALLY_COMPLETE' | 'NOT_STARTED';
  reported_at: string;
  audit_at: string;
  request_text: string;
  deletion_status: DeletionStatus;
  steps: AuditStep[];
  matched_user?: UserIdentity;
  findingsCount: number;
  remediationsCount: number;
  verificationsCount: number;
  cited_evidence_ids: string[];
  risk_factors: {
    active_data_flows: number;
    restore_risks: number;
    exposed_pii: number;
    remaining_records: number;
  };
  policy_citations: string[];
  temporal_cutoff_passed: boolean;
}

export interface OverviewMetrics {
  total_cases: number;
  complete_cases: number;
  incomplete_cases: number;
  not_applicable_cases: number;
  remaining_records_count: number;
  exposed_pii_count: number;
  active_data_flows_count: number;
  restore_risks_count: number;
  audit_progress_percentage: number;
  evaluation_run: boolean;
  evaluation_status_accuracy?: number;
  evaluation_step_f1?: number;
}

export interface EvaluationResult {
  total_sample_cases: number;
  matched_cases: number;
  status_accuracy: number;
  exact_sequence_accuracy: number;
  step_precision: number;
  step_recall: number;
  step_f1: number;
  field_accuracy: number;
  evidence_reference_validity: number;
  schema_validity: boolean;
  duplicate_cases: number;
  missing_cases: number;
  custom_cases: {
    id: string;
    name: string;
    scenario: string;
    expected_status: DeletionStatus;
    actual_status: DeletionStatus;
    passed: boolean;
    reasoning: string;
  }[];
  failures: string[];
  improvements: string[];
  metrics?: {
    status_accuracy: number;
    sequence_accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  sample_evaluations?: Array<{
    case_id: string;
    expected_status: string;
    predicted_status: string;
    status_match: boolean;
    expected_step_count: number;
    predicted_step_count: number;
    steps_match: boolean;
    notes: string;
  }>;
  synthetic_cases?: Array<{
    test_id: string;
    scenario: string;
    description: string;
    passed: boolean;
    input_payload: any;
    expected_status: string;
    steps: any[];
  }>;
}

export interface EvaluationReport {
  metrics: {
    status_accuracy: number;
    sequence_accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  sample_evaluations: Array<{
    case_id: string;
    expected_status: string;
    predicted_status: string;
    status_match: boolean;
    expected_step_count: number;
    predicted_step_count: number;
    steps_match: boolean;
    notes: string;
  }>;
  synthetic_cases: Array<{
    test_id: string;
    scenario: string;
    description: string;
    passed: boolean;
    input_payload: any;
    expected_status: string;
    steps: any[];
  }>;
}

export interface UsageReportData {
  provider: string;
  model_name: string;
  model_calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  average_tokens_per_request: number;
  estimated_cost_usd: number;
  estimated_total_cost?: number;
  estimated_cost_per_request_usd: number;
  per_model_breakdown: {
    model: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
  }[];
}

export interface UsageReport {
  total_cost_usd: number;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_calls: number;
  models: Array<{
    model_name: string;
    calls: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
  }>;
  calls_breakdown: Array<{
    task: string;
    target: string;
    prompt_tokens: number;
    completion_tokens: number;
    latency_ms: number;
    cost_usd: number;
  }>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'identity' | 'system' | 'resource' | 'data_flow' | 'backup' | 'tombstone';
  system_id?: string;
  status?: StepState | 'COMPLIANT' | 'RISK' | 'RETAINED';
  details?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'belongs_to' | 'replicates_to' | 'indexed_by' | 'backed_up_to' | 'synced_to' | 'tombstone_ref';
  risk?: boolean;
}

export interface IdentityEvidenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
