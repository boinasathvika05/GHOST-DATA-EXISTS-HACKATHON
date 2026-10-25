import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Copy,
  Clock,
  User,
  ExternalLink,
  Layers,
  ArrowRight,
  Database,
  Archive,
  Workflow,
  Eye,
  Check
} from 'lucide-react';
import { AuditCaseResult, AuditStep } from '../types';

interface CaseDetailDrawerProps {
  caseItem: AuditCaseResult | null;
  onClose: () => void;
  onNavigateToEvidence?: (fileId: string) => void;
}

export const CaseDetailDrawer: React.FC<CaseDetailDrawerProps> = ({
  caseItem,
  onClose,
  onNavigateToEvidence,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'identity' | 'raw'>('timeline');

  if (!caseItem) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(caseItem.steps, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const findings = caseItem.steps.filter((s) => s.phase === 'FINDING');
  const remediations = caseItem.steps.filter((s) => s.phase === 'REMEDIATION');
  const verifications = caseItem.steps.filter((s) => s.phase === 'VERIFICATION');

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] bg-[#0E131F] border-l border-[#1C2436] shadow-2xl z-40 flex flex-col transition-all duration-300">
      {/* Drawer Header */}
      <div className="h-16 px-6 border-b border-[#1C2436] flex items-center justify-between bg-[#080B12]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">{caseItem.case_id}</span>
          <span className="text-[#929DB0] text-xs font-mono">·</span>
          <span className="font-mono text-xs text-[#8B7CFF]">{caseItem.email}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#929DB0] hover:text-white hover:bg-[#151C2A] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1C2436] px-6 bg-[#0E131F]">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-3 px-3 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-[#8B7CFF] text-white'
              : 'border-transparent text-[#929DB0] hover:text-white'
          }`}
        >
          Remediation Plan ({caseItem.steps.length})
        </button>
        <button
          onClick={() => setActiveTab('identity')}
          className={`py-3 px-3 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'identity'
              ? 'border-[#8B7CFF] text-white'
              : 'border-transparent text-[#929DB0] hover:text-white'
          }`}
        >
          Identity & Provenance
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`py-3 px-3 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'raw'
              ? 'border-[#8B7CFF] text-white'
              : 'border-transparent text-[#929DB0] hover:text-white'
          }`}
        >
          JSON Schema
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status Comparison Card */}
        <div className="p-4 rounded-xl bg-[#101521] border border-[#1C2436] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#929DB0]">Workflow Claim</span>
            <span className="font-mono text-white font-medium">{caseItem.reported_status}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1C2436]">
            <span className="text-[#929DB0]">Independent Audit</span>
            <span className="font-mono font-bold">
              {caseItem.deletion_status === 'COMPLETE' && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETE
                </span>
              )}
              {caseItem.deletion_status === 'INCOMPLETE' && (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> INCOMPLETE
                </span>
              )}
              {caseItem.deletion_status === 'NOT_APPLICABLE' && (
                <span className="text-[#929DB0] flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> NOT APPLICABLE
                </span>
              )}
            </span>
          </div>

          <div className="text-[11px] text-[#929DB0] bg-[#080B12] p-2.5 rounded border border-[#151C2A] space-y-1">
            <div className="flex justify-between font-mono">
              <span>Requested:</span>
              <span>{caseItem.requested_at}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Reported:</span>
              <span>{caseItem.reported_at}</span>
            </div>
            <div className="flex justify-between font-mono text-[#8B7CFF]">
              <span>Audit Cutoff:</span>
              <span>{caseItem.audit_at}</span>
            </div>
          </div>
        </div>

        {/* User Request Text */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-mono text-[#929DB0] uppercase">Original User Request Text</h4>
          <div className="p-3 rounded-lg bg-[#101521] border border-[#1C2436] text-xs text-[#F3F5FA] italic leading-relaxed">
            "{caseItem.request_text}"
          </div>
        </div>

        {/* TAB: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            {caseItem.deletion_status === 'NOT_APPLICABLE' ? (
              <div className="p-6 rounded-xl bg-[#101521] border border-[#1C2436] text-center space-y-2">
                <HelpCircle className="w-8 h-8 text-[#929DB0] mx-auto opacity-70" />
                <h5 className="text-sm font-medium text-white">No Deletion Authorized</h5>
                <p className="text-xs text-[#929DB0] max-w-sm mx-auto">
                  Per challenge specifications, requests for access, export, or contact detail rectification do not authorize deletion. Steps array is empty (steps_json = []).
                </p>
              </div>
            ) : (
              <>
                {/* Findings Group */}
                {findings.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#EF4444] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>PHASE 1: FINDINGS ({findings.length})</span>
                    </div>
                    <div className="space-y-2">
                      {findings.map((step) => (
                        <div
                          key={step.step_no}
                          className="p-3 rounded-lg bg-[#101521] border border-[#EF4444]/30 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[#8B7CFF] font-semibold">
                              Step {step.step_no}
                            </span>
                            <span className="font-mono text-[#EF4444] text-[11px]">
                              {step.operation}
                            </span>
                          </div>
                          <div className="font-mono text-white text-xs">
                            {step.system_id} / {step.resource_id}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#929DB0] pt-1">
                            <span>State: <strong className="text-white font-mono">{step.state}</strong></span>
                            {step.evidence_id && (
                              <button
                                onClick={() => onNavigateToEvidence && onNavigateToEvidence(step.evidence_id)}
                                className="font-mono text-[#59D9FF] hover:underline flex items-center gap-1"
                              >
                                ev: {step.evidence_id}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remediations Group */}
                {remediations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-medium">
                      <Workflow className="w-3.5 h-3.5" />
                      <span>PHASE 2: PROPOSED REMEDIATION ({remediations.length})</span>
                    </div>
                    <div className="space-y-2">
                      {remediations.map((step) => (
                        <div
                          key={step.step_no}
                          className="p-3 rounded-lg bg-[#101521] border border-amber-500/30 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[#8B7CFF] font-semibold">
                              Step {step.step_no}
                            </span>
                            <span className="font-mono text-amber-400 text-[11px]">
                              {step.operation}
                            </span>
                          </div>
                          <div className="font-mono text-white text-xs">
                            {step.system_id} / {step.resource_id}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#929DB0] pt-1">
                            <span>Required Target: <strong className="text-white font-mono">{step.state}</strong></span>
                            <span className="font-mono text-[#929DB0] italic">Proposed Plan (No prior ev)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verifications Group */}
                {verifications.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>PHASE 3: POST-AUDIT VERIFICATION ({verifications.length})</span>
                    </div>
                    <div className="space-y-2">
                      {verifications.map((step) => (
                        <div
                          key={step.step_no}
                          className="p-3 rounded-lg bg-[#101521] border border-emerald-500/30 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[#8B7CFF] font-semibold">
                              Step {step.step_no}
                            </span>
                            <span className="font-mono text-emerald-400 text-[11px]">
                              {step.operation}
                            </span>
                          </div>
                          <div className="font-mono text-white text-xs">
                            {step.system_id} / {step.resource_id}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#929DB0] pt-1">
                            <span>Verified State: <strong className="text-white font-mono">{step.state}</strong></span>
                            {step.evidence_id ? (
                              <button
                                onClick={() => onNavigateToEvidence && onNavigateToEvidence(step.evidence_id)}
                                className="font-mono text-[#59D9FF] hover:underline flex items-center gap-1"
                              >
                                ev: {step.evidence_id}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="font-mono text-[#929DB0] italic">Future Verification Check</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB: IDENTITY & PROVENANCE */}
        {activeTab === 'identity' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#101521] border border-[#1C2436] space-y-3">
              <h5 className="text-xs font-mono text-[#8B7CFF] uppercase tracking-wider">
                Resolved Subject Profile
              </h5>
              {caseItem.matched_user ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#929DB0]">Stable User ID:</span>
                    <span className="text-white">{caseItem.matched_user.user_id}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-[#929DB0]">Full Name:</span>
                    <span className="text-white">{caseItem.matched_user.name}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-[#929DB0]">Registered Phone:</span>
                    <span className="text-white">{caseItem.matched_user.phone}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] break-all">
                    <span className="text-[#929DB0]">Email Hash:</span>
                    <span className="text-[#59D9FF]">{caseItem.matched_user.email_hash?.slice(0, 24)}...</span>
                  </div>
                  {caseItem.matched_user.historical_emails && caseItem.matched_user.historical_emails.length > 1 && (
                    <div className="pt-2 border-t border-[#1C2436]">
                      <span className="text-[#929DB0] text-[11px] block mb-1">Historical Email Aliases:</span>
                      <div className="space-y-1">
                        {caseItem.matched_user.historical_emails.map((em) => (
                          <div key={em} className="font-mono text-[11px] text-[#F3F5FA] bg-[#080B12] px-2 py-1 rounded">
                            {em}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#929DB0]">
                  No matching user profile found in identities table. Correlated strictly through direct email and activity links.
                </div>
              )}
            </div>

            {/* Evidence References */}
            <div className="p-4 rounded-xl bg-[#101521] border border-[#1C2436] space-y-3">
              <h5 className="text-xs font-mono text-[#59D9FF] uppercase tracking-wider">
                Cited Evidence Provenance
              </h5>
              {caseItem.cited_evidence_ids.length > 0 ? (
                <div className="space-y-2">
                  {caseItem.cited_evidence_ids.map((eid) => (
                    <div
                      key={eid}
                      className="flex items-center justify-between p-2 rounded bg-[#080B12] border border-[#1C2436] text-xs font-mono"
                    >
                      <span className="text-white">{eid}</span>
                      {onNavigateToEvidence && (
                        <button
                          onClick={() => onNavigateToEvidence(eid)}
                          className="text-[#8B7CFF] hover:underline flex items-center gap-1 text-[11px]"
                        >
                          View Artifact
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#929DB0]">
                  No external evidence cited (request was not applicable or plan contains future actions).
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: RAW JSON SCHEMA */}
        {activeTab === 'raw' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#929DB0]">steps_json Serialization</span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151C2A] text-xs text-white hover:bg-[#1C2436] border border-[#2A344A] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8B7CFF]" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#080B12] border border-[#1C2436] text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[420px] select-all">
              {JSON.stringify(caseItem.steps, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-4 border-t border-[#1C2436] bg-[#080B12] flex items-center justify-between text-xs">
        <span className="font-mono text-[#929DB0]">
          {caseItem.steps.length} ordered operations
        </span>
        <button
          onClick={handleCopyJson}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7866FF] text-white font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied Steps' : 'Copy steps_json'}</span>
        </button>
      </div>
    </div>
  );
};
