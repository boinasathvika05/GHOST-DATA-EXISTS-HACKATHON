import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingHero } from './components/LandingHero';
import { OverviewDashboard } from './components/OverviewDashboard';
import { CasesTable } from './components/CasesTable';
import { CaseDetailDrawer } from './components/CaseDetailDrawer';
import { EvidenceExplorer } from './components/EvidenceExplorer';
import { IdentityGraphView } from './components/IdentityGraphView';
import { DataFlowsView } from './components/DataFlowsView';
import { RemediationCenter } from './components/RemediationCenter';
import { EvaluationLab } from './components/EvaluationLab';
import { UsageCostView } from './components/UsageCostView';
import { SettingsView } from './components/SettingsView';
import { DatasetEvidenceView } from './components/DatasetEvidenceView';
import { AuditCaseResult, OverviewMetrics, EvidenceFileManifest } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Layers, ShieldCheck, Database } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedCaseItem, setSelectedCaseItem] = useState<AuditCaseResult | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgressStage, setAuditProgressStage] = useState<number>(0);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [casesFilter, setCasesFilter] = useState<string>('ALL');

  // Real backend dataset state
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    total_cases: 518,
    complete_cases: 236,
    incomplete_cases: 260,
    not_applicable_cases: 22,
    remaining_records_count: 531,
    exposed_pii_count: 312,
    active_data_flows_count: 88,
    restore_risks_count: 42,
    audit_progress_percentage: 100,
    evaluation_run: true,
    evaluation_status_accuracy: 53.1,
    evaluation_step_f1: 0.459,
  });

  const [cases, setCases] = useState<AuditCaseResult[]>([]);
  const [manifestList, setManifestList] = useState<EvidenceFileManifest[]>([]);
  const [latestRun, setLatestRun] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const auditStages = [
    { name: 'Dataset Ingestion & Schema Validation', desc: 'Parsing active manifest and computing cryptographic file hashes' },
    { name: 'Multi-Alias Identity Resolution', desc: 'Traversing historical audit logs to map past emails and phones to user_ids' },
    { name: 'Multimodal Evidence Analysis', desc: 'Indexing SQL point-in-time replicas, server traces, and OCR snapshots' },
    { name: '15-Rule Policy Enforcement', desc: 'Evaluating retention requirements, permitted tombstones, and PII exposure' },
    { name: 'Topological Remediation Ordering', desc: 'Sequencing findings, remediations, and verification checks strictly' },
    { name: 'Output Contract Validation', desc: 'Checking exact schema, 14 challenge rules, and generating output artifact' },
  ];

  // Load dataset from backend endpoints
  const loadData = async () => {
    try {
      const [overviewRes, casesRes, evidenceRes, runsRes] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/cases?limit=600'),
        fetch('/api/evidence'),
        fetch('/api/runs/latest'),
      ]);

      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        setMetrics(ovData);
      }
      if (casesRes.ok) {
        const cData = await casesRes.json();
        setCases(cData.cases || []);
      }
      if (evidenceRes.ok) {
        const evData = await evidenceRes.json();
        setManifestList(evData.manifest || []);
      }
      if (runsRes.ok) {
        const rData = await runsRes.json();
        setLatestRun(rData.latest_successful_run || rData.latest_run);
      }
    } catch (e) {
      console.error('Failed to load initial dataset from server', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Trigger real audit run
  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditError(null);
    setAuditProgressStage(0);

    // Realistic stage progression interval during real backend call
    const stageInterval = setInterval(() => {
      setAuditProgressStage((prev) => (prev < 5 ? prev + 1 : prev));
    }, 450);

    try {
      const res = await fetch('/api/audit/run', { method: 'POST' });
      clearInterval(stageInterval);
      setAuditProgressStage(5);

      const data = await res.json();

      if (data.success || data.status === 'ok') {
        setLatestRun(data.run);
        setToastMessage(`Audit completed: ${data.total_cases || metrics.total_cases} cases verified. Artifact: ${data.run?.output_filename || 'output.csv'}`);
        await loadData();
        setTimeout(() => {
          setIsAuditing(false);
          setTimeout(() => setToastMessage(null), 4000);
        }, 600);
      } else {
        setAuditError(data.error || 'Audit execution encountered a validation failure.');
        setIsAuditing(false);
      }
    } catch (e: any) {
      clearInterval(stageInterval);
      console.error('Audit run failed', e);
      setAuditError(e.message || 'Audit execution connection error occurred.');
      setIsAuditing(false);
    }
  };

  const handleSelectCaseById = (caseId: string) => {
    const found = cases.find((c) => c.case_id === caseId);
    if (found) {
      setSelectedCaseItem(found);
    }
  };

  // Filter cases by global search if active
  const filteredCases = searchQuery
    ? cases.filter(
        (c) =>
          c.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.request_text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cases;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080B12] text-[#F3F5FA] font-sans antialiased selection:bg-[#8B7CFF]/30 selection:text-[#59D9FF]">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-[#101521] border border-[#8B7CFF]/50 text-xs text-white px-4 py-2.5 rounded-lg shadow-2xl font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Audit Execution Modal / Progress overlay */}
      <AnimatePresence>
        {isAuditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#101521] border border-[#2A344A] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#8B7CFF]/20 text-[#8B7CFF] flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white font-mono">Executing Real Forensic Audit</h3>
                    <p className="text-[11px] text-[#929DB0]">Consuming active dataset manifest and evidence records</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#8B7CFF] font-bold">
                  Stage {auditProgressStage + 1} of 6
                </span>
              </div>

              {/* Polished Animated Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-[#1C2436] rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-[#8B7CFF] to-[#59D9FF] shadow-sm shadow-[#8B7CFF]/50"
                    animate={{ width: `${((auditProgressStage + 1) / 6) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#929DB0]">
                  <span>{Math.round(((auditProgressStage + 1) / 6) * 100)}% Complete</span>
                  <span>Deterministic Invariant Evaluation</span>
                </div>
              </div>

              {/* Current Stage description */}
              <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#1C2436] space-y-1">
                <div className="text-xs font-semibold text-white font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#59D9FF]" />
                  <span>{auditStages[auditProgressStage]?.name}</span>
                </div>
                <p className="text-[11px] text-[#929DB0] leading-relaxed">
                  {auditStages[auditProgressStage]?.desc}
                </p>
              </div>

              {/* Stages checklist */}
              <div className="space-y-1.5 pt-1">
                {auditStages.map((st, idx) => (
                  <div
                    key={st.name}
                    className={`flex items-center gap-2 text-xs font-mono transition-opacity ${
                      idx < auditProgressStage
                        ? 'text-emerald-400'
                        : idx === auditProgressStage
                        ? 'text-white font-semibold'
                        : 'text-gray-600'
                    }`}
                  >
                    {idx < auditProgressStage ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : idx === auditProgressStage ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#8B7CFF] border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-700 shrink-0" />
                    )}
                    <span className="truncate">{st.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Error Modal */}
      <AnimatePresence>
        {auditError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#101521] border border-rose-800/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-400">
                <XCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-semibold text-white font-mono">Audit Execution Failure</h3>
              </div>
              <p className="text-xs text-rose-300 font-mono leading-relaxed bg-[#080B12] p-3 rounded-lg border border-rose-950">
                {auditError}
              </p>
              <p className="text-[11px] text-[#929DB0]">
                Previous results were preserved. Stale outputs are not presented as successful new runs.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setAuditError(null)}
                  className="px-4 py-2 rounded-lg bg-[#151C2A] text-white text-xs hover:bg-[#1C2436] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Collapsible Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        casesCount={metrics.total_cases}
        evidenceCount={manifestList.length || 94}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header
          onSearch={(q: string) => setSearchQuery(q)}
          onRunAudit={handleRunAudit}
          isAuditing={isAuditing}
          totalCases={metrics.total_cases}
          completeCases={metrics.complete_cases}
          incompleteCases={metrics.incomplete_cases}
          latestRunId={latestRun?.run_id}
          latestRunTimestamp={latestRun?.completed_at}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {currentTab === 'landing' && (
                <LandingHero
                  onLaunchConsole={() => setCurrentTab('overview')}
                  onExploreGraph={() => setCurrentTab('graph')}
                  totalCases={metrics.total_cases}
                />
              )}

              {currentTab === 'overview' && (
                <OverviewDashboard
                  metrics={metrics}
                  latestRun={latestRun}
                  onNavigateToCases={(filter?: string) => {
                    if (filter) setCasesFilter(filter);
                    setCurrentTab('cases');
                  }}
                  onNavigateToGraph={() => setCurrentTab('graph')}
                  onNavigateToEvaluation={() => setCurrentTab('evaluation')}
                  onNavigateToDataset={() => setCurrentTab('dataset')}
                  onRunAudit={handleRunAudit}
                  isAuditing={isAuditing}
                />
              )}

              {currentTab === 'dataset' && (
                <DatasetEvidenceView
                  onDatasetActivated={() => {
                    loadData();
                    setToastMessage('New dataset activated! Ready for audit.');
                  }}
                  onNavigateToAudit={handleRunAudit}
                />
              )}

              {currentTab === 'cases' && (
                <CasesTable
                  cases={filteredCases}
                  onSelectCase={(caseItem: AuditCaseResult) => setSelectedCaseItem(caseItem)}
                  selectedCaseId={selectedCaseItem?.case_id}
                  initialFilter={casesFilter}
                />
              )}

              {currentTab === 'evidence' && (
                <EvidenceExplorer manifestList={manifestList} />
              )}

              {currentTab === 'graph' && (
                <IdentityGraphView
                  onSelectCase={(caseId: string) => handleSelectCaseById(caseId)}
                />
              )}

              {currentTab === 'dataflows' && <DataFlowsView />}

              {currentTab === 'remediation' && (
                <RemediationCenter cases={cases} />
              )}

              {currentTab === 'evaluation' && (
                <EvaluationLab
                  onSelectCase={(caseId: string) => handleSelectCaseById(caseId)}
                />
              )}

              {currentTab === 'usage' && <UsageCostView />}

              {currentTab === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Forensic Detail Drawer */}
      <CaseDetailDrawer
        caseItem={selectedCaseItem}
        onClose={() => setSelectedCaseItem(null)}
        onNavigateToEvidence={() => setCurrentTab('evidence')}
      />
    </div>
  );
}
