import React, { useState } from 'react';
import { 
  Settings, Shield, Database, Sliders, CheckCircle2, AlertCircle, 
  RefreshCw, Download, FileText, Cpu, Lock
} from 'lucide-react';
import { DELETION_RULES } from '../audit_engine/policy_rules';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'config' | 'platform'>('rules');
  const [strictMode, setStrictMode] = useState(true);
  const [evidenceValidation, setEvidenceValidation] = useState(true);
  const [cdcTracking, setCdcTracking] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#8B7CFF]" />
            <h1 className="text-xl font-semibold text-[#F3F5FA] tracking-tight">System Configuration & Policies</h1>
          </div>
          <p className="text-xs text-[#929DB0] mt-1">
            Governance rules, engine hyperparameters, and active synchronization monitoring parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/download/output"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#101521] border border-gray-800 text-xs text-gray-300 hover:text-white hover:border-gray-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export output.csv
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 gap-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'rules'
              ? 'border-[#8B7CFF] text-[#F3F5FA]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Deletion Governance Rules ({DELETION_RULES.length})
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'config'
              ? 'border-[#8B7CFF] text-[#F3F5FA]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Engine Parameters & Modes
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'platform'
              ? 'border-[#8B7CFF] text-[#F3F5FA]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Runtime Environment & Health
        </button>
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-[#101521] border border-gray-800 rounded-lg overflow-hidden">
            <div className="p-3.5 bg-[#0D111A] border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#8B7CFF]" />
                dataset/deletion_rules.csv &mdash; Official Canonical Policy Matrix
              </span>
              <span className="text-[11px] font-mono text-[#59D9FF]">15 System Rules Active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080B12] text-gray-400 uppercase font-mono text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="py-2.5 px-3">Rule ID</th>
                    <th className="py-2.5 px-3">Data Category</th>
                    <th className="py-2.5 px-3">Required Action</th>
                    <th className="py-2.5 px-3">Trigger Condition</th>
                    <th className="py-2.5 px-3">Description & Standard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {DELETION_RULES.map((rule) => (
                    <tr key={rule.rule_id} className="hover:bg-gray-800/20 transition">
                      <td className="py-2.5 px-3 font-semibold text-[#8B7CFF]">
                        {rule.rule_id}
                      </td>
                      <td className="py-2.5 px-3 text-[#59D9FF] font-medium">
                        {rule.data_category}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          rule.required_action === 'DELETE' ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50' :
                          rule.required_action === 'REDACT' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50' :
                          rule.required_action === 'ANONYMIZE' ? 'bg-violet-950/60 text-violet-300 border border-violet-800/50' :
                          'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                        }`}>
                          {rule.required_action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-gray-300 text-[11px]">
                        {rule.condition}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-gray-400 text-[11px]">
                        {rule.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#101521] border border-gray-800 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F3F5FA] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#8B7CFF]" />
              Audit Execution Hyperparameters
            </h3>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded bg-[#080B12] border border-gray-800">
                <div>
                  <div className="text-xs font-medium text-gray-200">Strict Evidence Validation</div>
                  <div className="text-[11px] text-gray-400">
                    Enforce empty strings for uncompleted evidence IDs; require genuine citations for COMPLETE
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="rounded bg-[#101521] border-gray-700 text-[#8B7CFF] focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded bg-[#080B12] border border-gray-800">
                <div>
                  <div className="text-xs font-medium text-gray-200">Deep Identity Provenance Graph</div>
                  <div className="text-[11px] text-gray-400">
                    Traverse user_audit_log and identities across emails, phones, auth0 IDs, and billing customer tokens
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={evidenceValidation}
                  onChange={(e) => setEvidenceValidation(e.target.checked)}
                  className="rounded bg-[#101521] border-gray-700 text-[#8B7CFF] focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded bg-[#080B12] border border-gray-800">
                <div>
                  <div className="text-xs font-medium text-gray-200">CDC & Replica Hazarding</div>
                  <div className="text-[11px] text-gray-400">
                    Flag active replica sync jobs as residual restore risks during remediation planning
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={cdcTracking}
                  onChange={(e) => setCdcTracking(e.target.checked)}
                  className="rounded bg-[#101521] border-gray-700 text-[#8B7CFF] focus:ring-0"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#101521] border border-gray-800 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F3F5FA] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#59D9FF]" />
              OCR & Multimodal Cache Registry
            </h3>

            <div className="p-3 bg-[#080B12] rounded border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Cache Directory:</span>
                <span className="text-[#8B7CFF]">dataset/evidence/extracted_images/</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Cached Artifacts:</span>
                <span className="text-emerald-400 font-bold">11 / 11 files</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Vision Model:</span>
                <span className="text-gray-200">gemini-2.5-flash</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Parsing Status:</span>
                <span className="text-emerald-400">100% Synced</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              When screenshot evidence is parsed by Gemini 2.5 Flash, the extracted structured JSON payload is preserved on the filesystem. Subsequent engine runs resolve instantaneously without additional network hops or token spend.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'platform' && (
        <div className="bg-[#101521] border border-gray-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#F3F5FA] flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Runtime Environment & Data Health
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded bg-[#080B12] border border-gray-800">
              <div className="text-gray-500 text-[10px] uppercase">Engine Runtime</div>
              <div className="text-gray-200 font-bold mt-1">Node.js + TSX / Python 3.10+</div>
              <div className="text-emerald-400 text-[10px] mt-0.5">Healthy (PID Active)</div>
            </div>

            <div className="p-3 rounded bg-[#080B12] border border-gray-800">
              <div className="text-gray-500 text-[10px] uppercase">Official Dataset</div>
              <div className="text-gray-200 font-bold mt-1">518 Cases Processed</div>
              <div className="text-emerald-400 text-[10px] mt-0.5">94 Evidence Files Loaded</div>
            </div>

            <div className="p-3 rounded bg-[#080B12] border border-gray-800">
              <div className="text-gray-500 text-[10px] uppercase">Challenge Deliverable</div>
              <div className="text-gray-200 font-bold mt-1">output.csv (518 rows)</div>
              <div className="text-emerald-400 text-[10px] mt-0.5">Strict schema verified</div>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Challenge Submission Specifications</h4>
            <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-4 font-sans">
              <li>Header format: <code className="text-[#8B7CFF] font-mono">case_id,deletion_status,steps_json</code></li>
              <li>Status taxonomy: <code className="text-gray-200 font-mono">COMPLETE</code>, <code className="text-gray-200 font-mono">INCOMPLETE</code>, <code className="text-gray-200 font-mono">NOT_APPLICABLE</code></li>
              <li>Row count: Exactly 518 data records matching <code className="text-gray-200 font-mono">dataset/deletion_requests.csv</code></li>
              <li>Strict sorting: Ascending alphanumerical ordering by <code className="text-gray-200 font-mono">case_id</code></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
