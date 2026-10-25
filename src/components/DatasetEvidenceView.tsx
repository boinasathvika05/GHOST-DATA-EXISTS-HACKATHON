import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Search,
  Eye,
  RefreshCw,
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  Check,
  FileCheck2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveDatasetManifest, DatasetFileInfo, EvidenceRecordInfo } from '../audit_engine/dataset_manager';

interface DatasetEvidenceViewProps {
  onDatasetActivated?: () => void;
  onNavigateToAudit?: () => void;
}

export const DatasetEvidenceView: React.FC<DatasetEvidenceViewProps> = ({
  onDatasetActivated,
  onNavigateToAudit,
}) => {
  const [manifest, setManifest] = useState<ActiveDatasetManifest | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceRecordInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<DatasetFileInfo | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<string>('ALL');
  const [evidenceSearch, setEvidenceSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'evidence' | 'upload'>('inventory');
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchManifest();
  }, []);

  const fetchManifest = async () => {
    setLoading(true);
    try {
      const [manRes, evRes] = await Promise.all([
        fetch('/api/dataset/manifest'),
        fetch('/api/evidence'),
      ]);
      if (manRes.ok) {
        const manData = await manRes.json();
        setManifest(manData);
      }
      if (evRes.ok) {
        const evData = await evRes.json();
        setEvidenceList(evData.evidence_records || []);
      }
    } catch (e: any) {
      console.error('Failed to load dataset manifest:', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Handle file uploads (multiple files supported)
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadErrors([]);
    const errors: string[] = [];

    const allowedExtensions = ['.csv', '.json', '.txt', '.pdf', '.png', '.jpg', '.jpeg', '.sql', '.sqlite', '.db'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      // Size limit: 25MB
      if (file.size > 25 * 1024 * 1024) {
        errors.push(`${file.name}: Exceeds 25MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
        continue;
      }

      if (!allowedExtensions.includes(ext)) {
        errors.push(`${file.name}: Unsupported format '${ext}'. Allowed: CSV, JSON, TXT, PDF, PNG/JPG, SQL/SQLite`);
        continue;
      }

      try {
        const content = await file.text();
        const res = await fetch('/api/dataset/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            content: content,
            sizeBytes: file.size,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          errors.push(`${file.name}: ${errData.error || 'Upload error'}`);
        }
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    await fetchManifest();
    setUploading(false);
    showToast(`Processed ${files.length} file(s). Manifest updated.`);
  };

  const handleActivateDataset = async () => {
    try {
      const res = await fetch('/api/dataset/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifestName: `Active Session Dataset (${new Date().toLocaleTimeString()})` }),
      });
      const data = await res.json();
      if (data.success) {
        setManifest(data.manifest);
        showToast('Dataset activated! Audit engine loaded new manifest.');
        if (onDatasetActivated) onDatasetActivated();
      }
    } catch (e: any) {
      console.error('Activation failed:', e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const filteredEvidence = evidenceList.filter((ev) => {
    const matchesFilter = evidenceFilter === 'ALL' || ev.format === evidenceFilter;
    const matchesSearch =
      !evidenceSearch ||
      ev.file_id.toLowerCase().includes(evidenceSearch.toLowerCase()) ||
      ev.file_name.toLowerCase().includes(evidenceSearch.toLowerCase()) ||
      ev.origin.toLowerCase().includes(evidenceSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading && !manifest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#929DB0]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#8B7CFF] mb-3" />
        <p className="text-xs font-mono">Loading dataset manifest and evidence catalog...</p>
      </div>
    );
  }

  const requiredFilesList = manifest ? Object.values(manifest.required_files) : [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-[#101521] border border-[#8B7CFF]/50 text-xs text-white px-4 py-2.5 rounded-lg shadow-2xl font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Banner / Hero */}
      <div className="rounded-xl bg-[#101521] border border-[#1C2436] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#8B7CFF]" />
            <h1 className="text-base font-semibold text-white">Dataset & Evidence Center</h1>
            <span className="text-[#929DB0] text-xs font-mono">· Active Manifest Management</span>
          </div>
          <p className="text-xs text-[#929DB0] max-w-2xl leading-relaxed">
            Upload custom deletion batches, inspect input schemas, validate timestamps, and manage multimodal evidence records.
            The audit engine consumes the selected active dataset directly.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#151C2A] hover:bg-[#1C2436] text-white text-xs font-medium border border-[#2A344A] transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#59D9FF]" />
            <span>Upload Files</span>
          </button>

          <button
            onClick={handleActivateDataset}
            disabled={!manifest?.is_valid_for_audit}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              manifest?.is_valid_for_audit
                ? 'bg-[#8B7CFF] hover:bg-[#7866FF] text-white shadow-md shadow-[#8B7CFF]/20 cursor-pointer'
                : 'bg-[#1C2436] text-[#929DB0] cursor-not-allowed opacity-50'
            }`}
            title={manifest?.is_valid_for_audit ? 'Activate this dataset for audit execution' : 'deletion_requests.csv required'}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Use This Dataset</span>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.json,.txt,.pdf,.png,.jpg,.jpeg,.sql,.sqlite,.db"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Manifest Status Strip */}
      {manifest && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-lg bg-[#101521] border border-[#1C2436]">
            <div className="text-[11px] font-mono text-[#929DB0]">Source Mode</div>
            <div className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5 font-mono">
              <span className={`w-2 h-2 rounded-full ${manifest.source === 'DEFAULT' ? 'bg-emerald-400' : 'bg-[#59D9FF]'}`}></span>
              {manifest.source === 'DEFAULT' ? 'Official Challenge' : 'Uploaded Custom'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#101521] border border-[#1C2436]">
            <div className="text-[11px] font-mono text-[#929DB0]">Deletion Requests</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {manifest.total_cases_count} <span className="text-xs font-normal text-[#929DB0]">cases</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#101521] border border-[#1C2436]">
            <div className="text-[11px] font-mono text-[#929DB0]">Validated Files</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {manifest.validated_files} / {manifest.total_files}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#101521] border border-[#1C2436]">
            <div className="text-[11px] font-mono text-[#929DB0]">Evidence Artifacts</div>
            <div className="text-xl font-bold font-mono text-[#59D9FF] mt-0.5">
              {manifest.evidence_files_count} <span className="text-xs font-normal text-[#929DB0]">files</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#101521] border border-[#1C2436]">
            <div className="text-[11px] font-mono text-[#929DB0]">Audit Readiness</div>
            <div className="mt-1 flex items-center gap-1 text-xs font-medium">
              {manifest.is_valid_for_audit ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Audit
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing Requirements
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Errors / Alerts */}
      {uploadErrors.length > 0 && (
        <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1 font-mono">
          <div className="font-semibold flex items-center gap-1.5 text-rose-200">
            <XCircle className="w-4 h-4 text-rose-400" /> Upload Errors Detected
          </div>
          {uploadErrors.map((err, idx) => (
            <div key={idx} className="pl-5 text-[11px]">• {err}</div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#1C2436]">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'border-[#8B7CFF] text-white'
                : 'border-transparent text-[#929DB0] hover:text-gray-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Required Dataset Inventory ({requiredFilesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'evidence'
                ? 'border-[#8B7CFF] text-white'
                : 'border-transparent text-[#929DB0] hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Evidence Records Catalog ({evidenceList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-[#8B7CFF] text-white'
                : 'border-transparent text-[#929DB0] hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Dropzone & Upload Area</span>
          </button>
        </div>

        <div className="text-[11px] text-[#929DB0] font-mono pr-2 hidden sm:block">
          Runtime storage: Session in-memory + active dataset
        </div>
      </div>

      {/* TAB 1: REQUIRED DATASET INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#101521] border border-[#1C2436] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0D111A] text-[#929DB0] uppercase font-mono text-[10px] border-b border-[#1C2436]">
                  <tr>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Rows</th>
                    <th className="py-3 px-4 text-right">Size</th>
                    <th className="py-3 px-4">Required Columns</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C2436]/60 font-mono">
                  {requiredFilesList.map((file) => {
                    const isMissing = file.status === 'Missing';
                    const isValid = file.status === 'Validated';
                    const isInvalid = file.status === 'Invalid';

                    return (
                      <tr key={file.file_name} className="hover:bg-[#151C2A]/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#8B7CFF]" />
                            <span>{file.file_name}</span>
                          </div>
                          <div className="text-[11px] font-sans text-[#929DB0] font-normal mt-0.5">
                            {file.description}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                              isValid
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                                : isInvalid
                                ? 'bg-rose-950/60 text-rose-400 border-rose-800/50'
                                : 'bg-gray-800/60 text-gray-400 border-gray-700'
                            }`}
                          >
                            {isValid && <CheckCircle2 className="w-3 h-3" />}
                            {isInvalid && <XCircle className="w-3 h-3" />}
                            {isMissing && <AlertTriangle className="w-3 h-3" />}
                            <span>{file.status}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 font-sans text-[11px]">
                          {file.required_for_audit && (
                            <span className="text-amber-400 font-medium">Required for Audit</span>
                          )}
                          {file.required_for_evaluation && (
                            <span className="text-[#59D9FF] font-medium">Evaluation Reference</span>
                          )}
                          {!file.required_for_audit && !file.required_for_evaluation && (
                            <span className="text-[#929DB0]">Supporting Data</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-white">
                          {file.row_count.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-[#929DB0]">
                          {(file.size_bytes / 1024).toFixed(1)} KB
                        </td>

                        <td className="py-3 px-4 font-mono text-[10px] text-[#929DB0] max-w-xs truncate">
                          {file.missing_columns.length > 0 ? (
                            <span className="text-rose-400">Missing: {file.missing_columns.join(', ')}</span>
                          ) : (
                            <span>{file.columns.slice(0, 4).join(', ')}{file.columns.length > 4 ? '...' : ''}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="px-2.5 py-1 rounded bg-[#151C2A] hover:bg-[#1C2436] text-[#8B7CFF] text-[11px] font-sans border border-[#2A344A] transition-colors"
                          >
                            Preview &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EVIDENCE RECORDS CATALOG */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#929DB0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={evidenceSearch}
                onChange={(e) => setEvidenceSearch(e.target.value)}
                placeholder="Search evidence files by ID, name, or origin..."
                className="w-full bg-[#101521] border border-[#1C2436] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#929DB0] focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'SQL', 'JSON', 'LOG', 'TXT', 'PDF', 'IMAGE'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setEvidenceFilter(fmt)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    evidenceFilter === fmt
                      ? 'bg-[#8B7CFF] text-white'
                      : 'bg-[#101521] text-[#929DB0] hover:text-white border border-[#1C2436]'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[#101521] border border-[#1C2436] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0D111A] text-[#929DB0] uppercase font-mono text-[10px] border-b border-[#1C2436]">
                  <tr>
                    <th className="py-2.5 px-3">File ID</th>
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Origin System</th>
                    <th className="py-2.5 px-3">Captured At</th>
                    <th className="py-2.5 px-3 text-right">Size</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C2436]/60 font-mono">
                  {filteredEvidence.slice(0, 50).map((ev) => (
                    <tr key={ev.file_id} className="hover:bg-[#151C2A]/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#8B7CFF]">{ev.file_id}</td>
                      <td className="py-2.5 px-3 text-white max-w-xs truncate">{ev.file_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#151C2A] text-[#59D9FF] border border-[#2A344A]">
                          {ev.format}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#929DB0]">{ev.origin}</td>
                      <td className="py-2.5 px-3 text-[#929DB0] text-[11px]">{ev.captured_at}</td>
                      <td className="py-2.5 px-3 text-right text-[#929DB0]">
                        {(ev.size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Indexed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEvidence.length > 50 && (
              <div className="p-3 bg-[#0D111A] text-center text-xs text-[#929DB0] font-mono border-t border-[#1C2436]">
                Showing first 50 of {filteredEvidence.length} matching evidence artifacts.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DROPZONE & UPLOAD AREA */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-[#2A344A] hover:border-[#8B7CFF] rounded-xl p-10 flex flex-col items-center justify-center text-center bg-[#101521]/60 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-xl bg-[#8B7CFF]/10 text-[#8B7CFF] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">Drag and drop dataset files here</h3>
            <p className="text-xs text-[#929DB0] mt-1.5 max-w-md">
              Select one or multiple files. Supported: CSV, JSON, TXT, PDF, images (.png, .jpg), and SQLite (.db, .sql).
            </p>
            <button className="mt-4 px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7866FF] text-white text-xs font-medium transition-colors shadow-md shadow-[#8B7CFF]/20">
              Browse Files from Computer
            </button>
            <div className="mt-4 text-[11px] text-[#929DB0] font-mono flex items-center gap-3">
              <span>Max file size: 25MB</span>
              <span>·</span>
              <span>Automatic schema validation</span>
              <span>·</span>
              <span>Session staging</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#101521] border border-[#1C2436] space-y-2 text-xs text-[#929DB0] font-sans">
            <h4 className="text-white font-medium flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#59D9FF]" /> Dataset & Evidence Instructions
            </h4>
            <p className="leading-relaxed">
              To evaluate a full custom batch, ensure <strong>deletion_requests.csv</strong> contains the required columns
              (<code>case_id, email, requested_at, reported_status, reported_at, audit_at, request_text</code>).
              To benchmark with ground truth, supply <strong>sample_deletion_requests.csv</strong> and <strong>sample_output.csv</strong>.
              Clicking <strong>Use This Dataset</strong> binds the files to the audit engine for real forensic execution.
            </p>
          </div>
        </div>
      )}

      {/* FILE PREVIEW MODAL */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#101521] border border-[#2A344A] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[#1C2436] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#8B7CFF]" />
                    <span>{previewFile.file_name}</span>
                    <span className="text-[10px] text-[#929DB0] font-normal">
                      ({previewFile.row_count.toLocaleString()} rows · {(previewFile.size_bytes / 1024).toFixed(1)} KB)
                    </span>
                  </h3>
                  <p className="text-xs text-[#929DB0] font-sans mt-0.5">{previewFile.description}</p>
                </div>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="text-[#929DB0] hover:text-white p-1 rounded hover:bg-[#151C2A]"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body: Table preview */}
              <div className="flex-1 overflow-auto p-4">
                {previewFile.errors.length > 0 && (
                  <div className="mb-3 p-3 rounded bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 font-mono">
                    <div className="font-semibold mb-1">Validation Errors:</div>
                    {previewFile.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                {previewFile.preview_rows.length > 0 ? (
                  <div className="border border-[#1C2436] rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#0D111A] text-[#929DB0] uppercase text-[10px] border-b border-[#1C2436]">
                        <tr>
                          {previewFile.columns.map((col) => (
                            <th key={col} className="py-2 px-3 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1C2436]/60">
                        {previewFile.preview_rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#151C2A]/50">
                            {previewFile.columns.map((col) => (
                              <td key={col} className="py-2 px-3 text-[#F3F5FA] whitespace-nowrap max-w-xs truncate">
                                {row[col] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-[#929DB0] text-xs font-mono">
                    No preview rows available for this file.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-[#0D111A] border-t border-[#1C2436] flex items-center justify-between text-xs">
                <span className="text-[#929DB0] font-mono text-[11px]">
                  Hash: {previewFile.file_hash}
                </span>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-3.5 py-1.5 rounded bg-[#151C2A] text-white border border-[#2A344A] hover:bg-[#1C2436]"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
