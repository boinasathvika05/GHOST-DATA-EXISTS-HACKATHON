/**
 * Policy rules based on deletion_rules.csv and challenge specifications.
 */
import { DeletionRule, FindingOperation, RemediationOperation, VerificationOperation } from '../types';

export const DELETION_RULES: DeletionRule[] = [
  {
    rule_id: 'rule_01',
    data_category: 'USER_PROFILE',
    condition: 'Always',
    required_action: 'DELETE',
    description: 'Primary user account and profile records must be deleted completely.',
  },
  {
    rule_id: 'rule_02',
    data_category: 'SECONDARY_IDENTIFIER',
    condition: 'Always',
    required_action: 'DELETE',
    description: 'Secondary emails, phone numbers, and alternative aliases must be removed.',
  },
  {
    rule_id: 'rule_03',
    data_category: 'SEARCH_INDEX_ENTRY',
    condition: 'Always',
    required_action: 'DELETE',
    description: 'Customer directory and search cluster index documents must be removed.',
  },
  {
    rule_id: 'rule_04',
    data_category: 'CACHE_ENTRY',
    condition: 'Always',
    required_action: 'DELETE',
    description: 'In-memory, session, and fast cache keys must be invalidated.',
  },
  {
    rule_id: 'rule_05',
    data_category: 'SUPPORT_MESSAGE',
    condition: 'Conversation contains shared customer, agent, or order context that must be retained',
    required_action: 'REDACT',
    description: 'Direct identifiers (name, email, phone) must be redacted while preserving shared order/support history.',
  },
  {
    rule_id: 'rule_06',
    data_category: 'SUPPORT_ATTACHMENT',
    condition: 'Attachment belongs only to the deletion subject',
    required_action: 'DELETE',
    description: 'Attachments and identity documents belonging only to the user must be deleted.',
  },
  {
    rule_id: 'rule_07',
    data_category: 'ANALYTICS_PROFILE',
    condition: 'Record is still attributable to a user',
    required_action: 'ANONYMIZE',
    description: 'Analytics profiles must be irreversibly unlinked by nullifying user_id, email, phone, and hash.',
  },
  {
    rule_id: 'rule_08',
    data_category: 'PRODUCT_TELEMETRY',
    condition: 'Record is still attributable to a user',
    required_action: 'ANONYMIZE',
    description: 'Telemetry and metric events must be stripped of identifying metadata.',
  },
  {
    rule_id: 'rule_09',
    data_category: 'USER_EXPORT',
    condition: 'Always',
    required_action: 'DELETE',
    description: 'Historical data export archives, download links, and zip files must be removed.',
  },
  {
    rule_id: 'rule_10',
    data_category: 'MARKETING_PROFILE',
    condition: 'Always',
    required_action: 'DELETE',
    description: 'Marketing campaign subscriptions, cohorts, and tracking tags must be deleted.',
  },
  {
    rule_id: 'rule_11',
    data_category: 'EMAIL_DELIVERY_LOG',
    condition: 'Log contains a user email address',
    required_action: 'REDACT',
    description: 'Delivery logs must have the recipient email redacted.',
  },
  {
    rule_id: 'rule_12',
    data_category: 'SECURITY_AUDIT_LOG',
    condition: 'Record is within the supplied retention period',
    required_action: 'RETAIN',
    description: 'Security and privacy audit entries must be preserved to prove compliance.',
  },
  {
    rule_id: 'rule_13',
    data_category: 'LEGAL_HOLD_RECORD',
    condition: 'A supplied legal hold is active',
    required_action: 'RETAIN',
    description: 'Records subject to legal hold must be retained until release.',
  },
  {
    rule_id: 'rule_14',
    data_category: 'BACKUP_ARCHIVE',
    condition: 'Restore access can be blocked',
    required_action: 'RETAIN',
    description: 'Backup snapshots may be retained if restore access is blocked for the deleted subject.',
  },
  {
    rule_id: 'rule_15',
    data_category: 'ACCOUNT_TOMBSTONE',
    condition: 'Account is deleted and only a stable internal user_id is needed to preserve references to retained records',
    required_action: 'REDACT',
    description: 'Account tombstone preserves stable user_id but direct identifiers (name, email, phone, hash) must be redacted.',
  },
];

export const OPERATION_SORT_ORDER: Record<string, number> = {
  // Phase 1: FINDING
  REPORT_REMAINING_RECORD: 1,
  REPORT_EXPOSED_PII: 2,
  REPORT_ACTIVE_DATA_FLOW: 3,
  REPORT_RESTORE_RISK: 4,

  // Phase 2: REMEDIATION
  DISABLE_DATA_FLOW: 10,
  BLOCK_RESTORE: 11,
  DELETE_RECORD: 12,
  REDACT_RECORD: 13,
  ANONYMIZE_RECORD: 14,

  // Phase 3: VERIFICATION
  VERIFY_RECORD_ABSENT: 20,
  VERIFY_RECORD_PRESENT: 21,
  VERIFY_RECORD_REDACTED: 22,
  VERIFY_RECORD_ANONYMIZED: 23,
  VERIFY_DATA_FLOW_DISABLED: 24,
  VERIFY_RESTORE_BLOCKED: 25,
};

export const PHASE_SORT_ORDER: Record<string, number> = {
  FINDING: 1,
  REMEDIATION: 2,
  VERIFICATION: 3,
};
