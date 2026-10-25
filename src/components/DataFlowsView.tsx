import React from 'react';
import {
  Workflow,
  Archive,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database
} from 'lucide-react';

export const DataFlowsView: React.FC = () => {
  const syncJobs = [
    {
      id: 'data_flow_9522',
      name: 'Search Profile Indexer',
      source: 'account_service',
      target: 'search_service',
      subject: 'novak.tomasz@icloud.com',
      state: 'ACTIVE',
      hazard: 'Recreates search document immediately after primary account deletion.',
      action: 'DISABLE_DATA_FLOW',
    },
    {
      id: 'data_flow_3827',
      name: 'Customer Events Connector',
      source: 'account_service',
      target: 'integration_service',
      subject: 'noah.f438085@outlook.com',
      state: 'ACTIVE',
      hazard: 'Publishes ongoing telemetry containing customer identifier to downstream analytics.',
      action: 'DISABLE_DATA_FLOW',
    },
    {
      id: 'data_flow_8524',
      name: 'Analytics Identity Bridge',
      source: 'account_service',
      target: 'analytics_platform',
      subject: 'camille.bernard86@outlook.com',
      state: 'ACTIVE',
      hazard: 'Transfers unanonymized audience cohorts during scheduled batch sync.',
      action: 'DISABLE_DATA_FLOW',
    },
    {
      id: 'data_flow_6244',
      name: 'Order Sync Connector',
      source: 'support_platform',
      target: 'integration_service',
      subject: 'almeida.mariana@gmail.com',
      state: 'DISABLED',
      hazard: 'Verified disabled prior to downstream cleanup.',
      action: 'VERIFIED',
    },
  ];

  const backupArchives = [
    {
      id: 'backup_4978',
      name: 'Daily Disaster Recovery Snapshot',
      system: 'backup_service',
      subject: 'k.appiah88@gmail.com',
      state: 'ACTIVE',
      hazard: 'Snapshot restore flag is unrestricted; re-importing backup will restore deleted account.',
      action: 'BLOCK_RESTORE',
    },
    {
      id: 'backup_3870',
      name: 'Secondary Region Database Archive',
      system: 'backup_service',
      subject: 'y.tanaka32@gmail.com',
      state: 'ACTIVE',
      hazard: 'Point-in-time recovery archive contains active customer record.',
      action: 'BLOCK_RESTORE',
    },
    {
      id: 'backup_3120',
      name: 'Global Failover Archive',
      system: 'backup_service',
      subject: 'almeida.mariana@gmail.com',
      state: 'BLOCKED',
      hazard: 'Restore access successfully blocked for deleted subject.',
      action: 'VERIFIED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-5 rounded-xl bg-[#101521] border border-[#1C2436] space-y-2">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-[#59D9FF]" />
          <h2 className="text-sm font-semibold text-white">Data Recreation & Restore Hazards</h2>
        </div>
        <p className="text-xs text-[#929DB0] leading-relaxed">
          Ghost data is frequently introduced when active batch jobs, connectors, or disaster recovery restores recreate records that primary account workflows successfully removed. Remediating these flows before touching dependent records is mandatory.
        </p>
      </div>

      {/* Grid of Connectors & Backups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Synchronization Jobs */}
        <div className="p-5 rounded-xl bg-[#101521] border border-[#1C2436] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase font-bold text-white flex items-center gap-2">
              <Workflow className="w-3.5 h-3.5 text-[#59D9FF]" />
              <span>Synchronization Connectors ({syncJobs.length})</span>
            </h3>
            <span className="text-[11px] font-mono text-[#929DB0]">rule_03 / rule_07</span>
          </div>

          <div className="space-y-3">
            {syncJobs.map((job) => (
              <div
                key={job.id}
                className="p-3.5 rounded-lg bg-[#080B12] border border-[#1C2436] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white font-medium">{job.name}</span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      job.state === 'ACTIVE'
                        ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {job.state}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-[#929DB0]">
                  <span>{job.source}</span>
                  <ArrowRight className="w-3 h-3 text-[#8B7CFF]" />
                  <span>{job.target}</span>
                  <span>·</span>
                  <span className="text-[#8B7CFF]">{job.id}</span>
                </div>

                <p className="text-[11px] text-[#929DB0] leading-relaxed">
                  {job.hazard}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#151C2A] text-[11px] font-mono">
                  <span className="text-[#929DB0]">Target Subject: {job.subject}</span>
                  <span className="text-amber-400 font-medium">{job.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Backup & Disaster Recovery Archives */}
        <div className="p-5 rounded-xl bg-[#101521] border border-[#1C2436] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase font-bold text-white flex items-center gap-2">
              <Archive className="w-3.5 h-3.5 text-[#8B7CFF]" />
              <span>Backup Restore Hazards ({backupArchives.length})</span>
            </h3>
            <span className="text-[11px] font-mono text-[#929DB0]">rule_14</span>
          </div>

          <div className="space-y-3">
            {backupArchives.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-lg bg-[#080B12] border border-[#1C2436] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white font-medium">{b.name}</span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      b.state === 'ACTIVE'
                        ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {b.state === 'ACTIVE' ? 'RESTORE UNBLOCKED' : 'RESTORE BLOCKED'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-[#929DB0]">
                  <span>System: {b.system}</span>
                  <span>·</span>
                  <span className="text-[#8B7CFF]">{b.id}</span>
                </div>

                <p className="text-[11px] text-[#929DB0] leading-relaxed">
                  {b.hazard}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#151C2A] text-[11px] font-mono">
                  <span className="text-[#929DB0]">Target Subject: {b.subject}</span>
                  <span className="text-amber-400 font-medium">{b.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
