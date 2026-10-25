import React, { useState } from 'react';
import {
  ShieldAlert,
  Workflow,
  Archive,
  Trash2,
  EyeOff,
  UserCheck,
  CheckCircle2,
  Copy,
  Terminal,
  FileCode,
  Check
} from 'lucide-react';
import { AuditCaseResult, RemediationOperation } from '../types';

interface RemediationCenterProps {
  cases: AuditCaseResult[];
}

export const RemediationCenter: React.FC<RemediationCenterProps> = ({ cases }) => {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const incompleteCases = cases.filter((c) => c.deletion_status === 'INCOMPLETE');

  // Collect operations count
  const opCounts: Record<string, number> = {
    DISABLE_DATA_FLOW: 0,
    BLOCK_RESTORE: 0,
    DELETE_RECORD: 0,
    REDACT_RECORD: 0,
    ANONYMIZE_RECORD: 0,
  };

  incompleteCases.forEach((c) => {
    c.steps.forEach((s) => {
      if (s.phase === 'REMEDIATION' && opCounts[s.operation] !== undefined) {
        opCounts[s.operation]++;
      }
    });
  });

  const generateBashScript = (): string => {
    return `#!/usr/bin/env bash
# GhostTrace AI — Automated Remediation Orchestrator
# Generated for ${incompleteCases.length} Incomplete Deletion Cases
set -euo pipefail

echo "== [STAGE 1] Disabling Active Sync Connectors =="
# Stop processes that can recreate data before touching records
curl -X POST https://api.northstar.internal/connectors/disable -d '{"case_ids": ${JSON.stringify(incompleteCases.slice(0, 5).map(c => c.case_id))}}'

echo "== [STAGE 2] Blocking Disaster Recovery Restores =="
# Block restore access on point-in-time archives
curl -X POST https://api.northstar.internal/backups/block-restore -d '{"status": "BLOCKED"}'

echo "== [STAGE 3] Purging Residual Records & Replicas =="
# Remove uncoordinated copies from search index & read replicas
curl -X POST https://api.northstar.internal/records/purge

echo "== [STAGE 4] Redacting & Anonymizing Telemetry =="
# Strip PII from support messages and anonymize cohort profiles
curl -X POST https://api.northstar.internal/compliance/redact

echo "== Remediation Completed. Run GhostTrace verify to re-audit. =="
`;
  };

  const generateSqlScript = (): string => {
    return `-- GhostTrace AI: Remediation Script for SQL Replicas
-- Removes residual records and redacts tombstones
BEGIN TRANSACTION;

-- 1. Remove residual records in failover replicas
DELETE FROM customer_profiles_failover_replica 
WHERE account_status = 'ACTIVE' 
  AND user_id IN (SELECT user_id FROM deletion_subjects_view);

-- 2. Redact tombstones (preserve only stable user_id, nullify direct PII)
UPDATE customer_tombstones 
SET full_name = NULL, email = NULL, phone = NULL, email_hash = NULL
WHERE tombstone_status = 'REDACTED';

-- 3. Invalidate search cluster documents
DELETE FROM search_documents_primary 
WHERE source_resource_id IN (SELECT resource_id FROM deleted_accounts_view);

COMMIT;
`;
  };

  const handleCopy = (type: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedScript(type);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-5 rounded-xl bg-[#101521] border border-[#1C2436] space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Ordered Remediation Center</h2>
        </div>
        <p className="text-xs text-[#929DB0] leading-relaxed">
          GhostTrace AI generates non-destructive, strictly ordered remediation plans to transition incomplete requests into verifiable complete states. Connectors and backup hazards are resolved first before mutating dependent downstream records.
        </p>
      </div>

      {/* Operation Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#101521] border border-[#1C2436]">
          <div className="flex items-center gap-1.5 text-xs text-[#929DB0] mb-1">
            <Workflow className="w-3.5 h-3.5 text-[#59D9FF]" />
            <span>DISABLE FLOW</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {opCounts.DISABLE_DATA_FLOW}
          </div>
          <div className="text-[10px] text-[#929DB0] mt-0.5">Priority 1</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#101521] border border-[#1C2436]">
          <div className="flex items-center gap-1.5 text-xs text-[#929DB0] mb-1">
            <Archive className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span>BLOCK RESTORE</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {opCounts.BLOCK_RESTORE}
          </div>
          <div className="text-[10px] text-[#929DB0] mt-0.5">Priority 2</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#101521] border border-[#1C2436]">
          <div className="flex items-center gap-1.5 text-xs text-[#929DB0] mb-1">
            <Trash2 className="w-3.5 h-3.5 text-coral-400 text-[#EF4444]" />
            <span>DELETE RECORD</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {opCounts.DELETE_RECORD}
          </div>
          <div className="text-[10px] text-[#929DB0] mt-0.5">Priority 3</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#101521] border border-[#1C2436]">
          <div className="flex items-center gap-1.5 text-xs text-[#929DB0] mb-1">
            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            <span>REDACT RECORD</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {opCounts.REDACT_RECORD}
          </div>
          <div className="text-[10px] text-[#929DB0] mt-0.5">Priority 4</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#101521] border border-[#1C2436]">
          <div className="flex items-center gap-1.5 text-xs text-[#929DB0] mb-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ANONYMIZE</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {opCounts.ANONYMIZE_RECORD}
          </div>
          <div className="text-[10px] text-[#929DB0] mt-0.5">Priority 5</div>
        </div>
      </div>

      {/* Script Generation Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bash Script */}
        <div className="p-5 rounded-xl bg-[#101521] border border-[#1C2436] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-white">
              <Terminal className="w-4 h-4 text-[#8B7CFF]" />
              <span>remediate_flows.sh (Automated API Calls)</span>
            </div>
            <button
              onClick={() => handleCopy('bash', generateBashScript())}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151C2A] hover:bg-[#1C2436] text-xs text-white border border-[#2A344A] transition-colors"
            >
              {copiedScript === 'bash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8B7CFF]" />}
              <span>{copiedScript === 'bash' ? 'Copied' : 'Copy Bash'}</span>
            </button>
          </div>
          <pre className="p-3.5 rounded-lg bg-[#080B12] border border-[#1C2436] text-[11px] font-mono text-[#59D9FF] overflow-x-auto max-h-[300px]">
            {generateBashScript()}
          </pre>
        </div>

        {/* SQL Remediation */}
        <div className="p-5 rounded-xl bg-[#101521] border border-[#1C2436] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-white">
              <FileCode className="w-4 h-4 text-[#59D9FF]" />
              <span>remediate_replicas.sql (Database Transactions)</span>
            </div>
            <button
              onClick={() => handleCopy('sql', generateSqlScript())}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151C2A] hover:bg-[#1C2436] text-xs text-white border border-[#2A344A] transition-colors"
            >
              {copiedScript === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#59D9FF]" />}
              <span>{copiedScript === 'sql' ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>
          <pre className="p-3.5 rounded-lg bg-[#080B12] border border-[#1C2436] text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[300px]">
            {generateSqlScript()}
          </pre>
        </div>
      </div>
    </div>
  );
};
