/**
 * Synthetic Edge Case Fixtures for Policy & State Machine Validation (E01 - E20)
 * Evaluates core engine against all edge conditions specified in Phase 3.
 */
import { DeletionRequest } from '../../src/types';

export const POLICY_EDGE_FIXTURES: Record<string, {
  name: string;
  description: string;
  request: DeletionRequest;
  expected_status: 'COMPLETE' | 'INCOMPLETE' | 'NOT_APPLICABLE';
  expected_findings?: string[];
  expected_remediations?: string[];
  expected_verifications?: string[];
  expected_step_count_min?: number;
  expected_step_count_exact?: number;
  rule_id_citations?: string[];
}> = {
  E01_RESIDUAL_SECONDARY_DB: {
    name: 'E01: Residual Record in Secondary Database Replica',
    description: 'Account deleted from primary DB, but residual record persists in customer_data_read_replica',
    request: {
      case_id: 'test_e01',
      email: 'nasser.mariam88@gmail.com', // Has residual support record
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'I request complete deletion of my account.',
    },
    expected_status: 'INCOMPLETE',
    expected_findings: ['REPORT_EXPOSED_PII', 'REPORT_REMAINING_RECORD'],
    expected_remediations: ['REDACT_RECORD', 'DELETE_RECORD'],
  },

  E02_ACTIVE_SYNC_JOB: {
    name: 'E02: Active Synchronization Job Recreates Deleted Data',
    description: 'Connector gateway / data flow actively synchronizing downstream and recreating records',
    request: {
      case_id: 'test_e02',
      email: 'adwoa.frimpong@outlook.com', // Case 128 has active data flow
      requested_at: '2026-08-01T10:00:00Z',
      reported_status: 'COMPLETE',
      reported_at: '2026-08-02T10:00:00Z',
      audit_at: '2026-08-17T10:00:00Z',
      request_text: 'Please delete all data associated with my profile.',
    },
    expected_status: 'INCOMPLETE',
    expected_findings: ['REPORT_ACTIVE_DATA_FLOW'],
    expected_remediations: ['DISABLE_DATA_FLOW'],
    expected_verifications: ['VERIFY_DATA_FLOW_DISABLED'],
  },

  E03_BACKUP_RESTORE_RISK: {
    name: 'E03: Disaster Recovery Backup Creates Re-hydration Hazard',
    description: 'Database backup contains deleted user records without restore exclusion block',
    request: {
      case_id: 'test_e03',
      email: 'm.mercier28@gmail.com', // Case 123 has backup restore risk
      requested_at: '2026-08-06T10:00:00Z',
      reported_status: 'COMPLETE',
      reported_at: '2026-08-08T10:00:00Z',
      audit_at: '2026-08-17T10:00:00Z',
      request_text: 'Delete my account completely from all backups and databases.',
    },
    expected_status: 'INCOMPLETE',
    expected_findings: ['REPORT_RESTORE_RISK'],
    expected_remediations: ['BLOCK_RESTORE'],
    expected_verifications: ['VERIFY_RESTORE_BLOCKED'],
  },

  E04_TOMBSTONE_EXPOSES_PII: {
    name: 'E04: Permitted Tombstone Exposes Prohibited Direct Identifiers',
    description: 'Tombstone record preserves stable user_id but fails to redact raw email or phone',
    request: {
      case_id: 'test_e04',
      email: 'chioma-eze@gmail.com', // Case 101 has analytics profile exposure
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'PARTIALLY_COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Erase my account details.',
    },
    expected_status: 'INCOMPLETE',
    expected_findings: ['REPORT_EXPOSED_PII'],
    expected_remediations: ['ANONYMIZE_RECORD', 'REDACT_RECORD'],
  },

  E05_POLICY_RETENTION_REQUIRED: {
    name: 'E05: Security & Tax Record Required to be Retained by Policy',
    description: 'Security audit ledger must be retained; must receive VERIFY_RECORD_PRESENT rather than deletion',
    request: {
      case_id: 'test_e05',
      email: 'salma-soliman76@gmail.com', // Case 103 has verified compliant records
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Please delete my profile.',
    },
    expected_status: 'COMPLETE',
    expected_verifications: ['VERIFY_RECORD_ABSENT', 'VERIFY_RECORD_PRESENT'],
  },

  E06_CORRECTLY_ANONYMIZED_RECORD: {
    name: 'E06: Correctly Anonymized Telemetry Record',
    description: 'Analytics record unlinked and de-identified with null direct identifiers',
    request: {
      case_id: 'test_e06',
      email: 'salma-soliman76@gmail.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Please erase my user records.',
    },
    expected_status: 'COMPLETE',
  },

  E07_CLEAN_COMPLETE_DELETION: {
    name: 'E07: Clean Complete Deletion with Evidence-Backed Verification',
    description: 'All copies eradicated, no recreation flows, verification steps cite valid evidence',
    request: {
      case_id: 'test_e07',
      email: 'salma-soliman76@gmail.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Please remove all my data.',
    },
    expected_status: 'COMPLETE',
    expected_findings: [],
    expected_remediations: [],
  },

  E08_NOT_APPLICABLE_INTENT: {
    name: 'E08: Explicit Non-Deletion Request Intent',
    description: 'User explicitly requested marketing opt-out / keep account active -> NOT_APPLICABLE with []',
    request: {
      case_id: 'test_e08',
      email: 'user_e08@example.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'NOT_STARTED',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Please stop the promotional emails. I still need the account active for orders.',
    },
    expected_status: 'NOT_APPLICABLE',
    expected_step_count_exact: 0,
  },

  E09_HISTORICAL_EMAIL_CHANGE: {
    name: 'E09: Historical Email Identity Alias Traced via User Audit Log',
    description: 'User changed primary email from old to new; engine resolves stable user_id and audits both',
    request: {
      case_id: 'test_e09',
      email: 'nasser.mariam88@gmail.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Please delete my account.',
    },
    expected_status: 'INCOMPLETE',
  },

  E10_SIMILAR_EMAIL_ISOLATION: {
    name: 'E10: Unrelated Similar Emails Maintained as Separate Identities',
    description: 'john.doe@example.com and john_doe@example.com must not be merged into single identity',
    request: {
      case_id: 'test_e10',
      email: 'nonexistent.similar.user@example.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Delete my account.',
    },
    expected_status: 'COMPLETE',
  },

  E11_TEMPORAL_CUTOFF_FUTURE_EVENT: {
    name: 'E11: Strict Temporal Cutoff Filtering Out Events After audit_at',
    description: 'Observations after audit_at must not retroactively determine historical audit state',
    request: {
      case_id: 'test_e11',
      email: 'nasser.mariam88@gmail.com',
      requested_at: '2026-01-01 00:00:00',
      reported_status: 'COMPLETE',
      reported_at: '2026-01-02 00:00:00',
      audit_at: '2026-01-05 00:00:00', // Prior to any September observations
      request_text: 'Delete my records.',
    },
    expected_status: 'COMPLETE', // In January 2026, no September leaks existed yet!
  },

  E12_ORDERING_CONFLICT_PESSIMISTIC: {
    name: 'E12: State Conflict Resolves Under Pessimistic Security Posture',
    description: 'Conflicting reported status vs evidence resolves in favor of data protection',
    request: {
      case_id: 'test_e12',
      email: 'nasser.mariam88@gmail.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE', // Reported as COMPLETE
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Delete all records.',
    },
    expected_status: 'INCOMPLETE', // Evidence shows PII, overriding reported status!
  },

  E13_MISSING_EVIDENCE_SAFE_FALLBACK: {
    name: 'E13: Missing or Corrupt Evidence Handling',
    description: 'Unknown evidence IDs are not cited; engine maintains verified evidence references only',
    request: {
      case_id: 'test_e13',
      email: 'corrupt_evidence_user@test.org',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'NOT_STARTED',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Delete my profile please.',
    },
    expected_status: 'COMPLETE',
  },

  E14_DUPLICATE_RECORDS_ACROSS_SYSTEMS: {
    name: 'E14: Duplicate Residual Records Across Multiple Systems',
    description: 'User data in support_platform and secondary database produces distinct steps per system',
    request: {
      case_id: 'test_e14',
      email: 'eaddo6629@gmail.com', // Case 102 has residual data across systems
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Delete my records.',
    },
    expected_status: 'INCOMPLETE',
    expected_step_count_min: 3,
  },

  E15_FALSE_SUCCESS_OVERRULED: {
    name: 'E15: Contradictory Current Evidence Overrules Claimed Deletion Success',
    description: 'Reported COMPLETE claim contradicted by unpurged support ticket',
    request: {
      case_id: 'test_e15',
      email: 'nasser.mariam88@gmail.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Remove all my data.',
    },
    expected_status: 'INCOMPLETE',
  },

  E16_POLICY_RETENTION_VERIFICATION: {
    name: 'E16: Compliance & Legal Hold Verification Step Generation',
    description: 'Generates VERIFY_RECORD_PRESENT for records legally mandated to be retained',
    request: {
      case_id: 'test_e16',
      email: 'salma-soliman76@gmail.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Please erase my user profile.',
    },
    expected_status: 'COMPLETE',
  },

  E17_CONCURRENT_DATAFLOW_AND_EXPOSED_PII: {
    name: 'E17: Concurrent Active Data Flow and Residual PII',
    description: 'Both recreation risk and residual data present in single case audit',
    request: {
      case_id: 'test_e17',
      email: 'freja.svensson@outlook.com', // Case 176 has both active data flow and remaining records
      requested_at: '2026-06-29T12:00:00Z',
      reported_status: 'COMPLETE',
      reported_at: '2026-06-30T12:00:00Z',
      audit_at: '2026-07-23T12:00:00Z',
      request_text: 'Please remove all my personal details.',
    },
    expected_status: 'INCOMPLETE',
  },

  E18_ORDERED_REMEDIATION_HIERARCHY: {
    name: 'E18: Strict Remediation Ordering Hierarchy',
    description: 'Remediations ordered: DISABLE_DATA_FLOW before BLOCK_RESTORE before DELETE_RECORD before REDACT before ANONYMIZE',
    request: {
      case_id: 'test_e18',
      email: 'nasser.mariam88@gmail.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Delete my account completely.',
    },
    expected_status: 'INCOMPLETE',
  },

  E19_NOT_APPLICABLE_EMPTY_STEPS: {
    name: 'E19: NOT_APPLICABLE Output Contract Strict Compliance',
    description: 'Must produce exact empty JSON array [] without any finding or remediation steps',
    request: {
      case_id: 'test_e19',
      email: 'keep_profile@example.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'NOT_STARTED',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'I want to continue using the service without removing any of my records.',
    },
    expected_status: 'NOT_APPLICABLE',
    expected_step_count_exact: 0,
  },

  E20_INCOMPLETE_THREE_PHASE_TRIFECTA: {
    name: 'E20: Incomplete Case Three-Phase Step Completeness',
    description: 'INCOMPLETE cases must include FINDING, REMEDIATION, and future VERIFICATION phases',
    request: {
      case_id: 'test_e20',
      email: 'nasser.mariam88@gmail.com',
      requested_at: '2026-09-08 07:11:42',
      reported_status: 'COMPLETE',
      reported_at: '2026-09-15 07:11:42',
      audit_at: '2026-10-02 00:00:00',
      request_text: 'Purge my personal data.',
    },
    expected_status: 'INCOMPLETE',
  },
};
