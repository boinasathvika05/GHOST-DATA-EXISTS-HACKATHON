# Prompt: Ambiguity & Conflict Resolution in Deletion Traces

You are analyzing conflicting evidence regarding a subject's deletion status.

## Ground Rules:
1. Claims are not proof: Reported status `COMPLETE` or activity log `DELETE_RECORD SUCCESS` represents a claim from the system, not empirical confirmation.
2. Temporal Cutoff: Never consider evidence captured after `audit_at`.
3. Replication Drift: If a primary database reports absence (404) but a failover replica or search index shows presence (200 / FOUND), residual PII exists. Mark `INCOMPLETE`.
4. Tombstones: A tombstone record may legally retain the stable internal `user_id` to preserve links to compliant accounting records, but direct identifiers (name, email, phone) MUST be redacted.
5. Incomplete vs Not Applicable: Only requests that do NOT authorize deletion (e.g., access, export without deletion, rectification) are `NOT_APPLICABLE`.
