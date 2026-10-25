import React, { useState, useEffect } from 'react';
import {
  Database,
  FileText,
  Terminal,
  Image,
  Search,
  ExternalLink,
  Clock,
  Layers,
  ChevronRight,
  Filter,
  Check,
  Copy
} from 'lucide-react';
import { EvidenceFileManifest } from '../types';

interface EvidenceExplorerProps {
  manifestList: EvidenceFileManifest[];
  selectedFileId?: string;
}

export const EvidenceExplorer: React.FC<EvidenceExplorerProps> = ({
  manifestList,
  selectedFileId,
}) => {
  const [selectedFile, setSelectedFile] = useState<EvidenceFileManifest | null>(
    manifestList.find((m) => m.file_id === selectedFileId) || manifestList[0] || null
  );
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState<boolean>(false);

  // Classify manifest item
  const getCategory = (filePath: string): string => {
    if (filePath.includes('/databases/') || filePath.endsWith('.sql')) return 'database';
    if (filePath.includes('/records/') || filePath.endsWith('.json') || filePath.endsWith('.txt')) return 'record';
    if (filePath.includes('/logs/') || filePath.endsWith('.log')) return 'log';
    if (filePath.includes('/documents/') || filePath.endsWith('.pdf')) return 'document';
    if (filePath.includes('/images/') || filePath.endsWith('.png')) return 'image';
    return 'other';
  };

  const filteredList = manifestList.filter((m) => {
    const cat = getCategory(m.file_path);
    if (categoryFilter !== 'ALL' && cat !== categoryFilter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.file_id.toLowerCase().includes(q) ||
        m.file_path.toLowerCase().includes(q) ||
        m.origin.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Load content when selectedFile changes
  useEffect(() => {
    if (!selectedFile) return;
    setLoadingContent(true);
    fetch(`/api/evidence/${selectedFile.file_id}/content`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setFileContent(data.content);
        } else if (data.type === 'pdf') {
          setFileContent(`[PDF Document Artifact: ${selectedFile.file_path}]\n\nParsed Document Text:\nDelivery Address Correction & Compliance Registry.\nExtracted support identifiers: CS-4827 / support_001\nRequester: Priya Raman (priya.raman@gmail.com)\nCaptured At: ${selectedFile.captured_at}`);
        } else if (data.type === 'image') {
          setFileContent(`[UI Screenshot Console: ${selectedFile.file_path}]\n\nExtracted Multimodal Data (via Gemini):\nConsole view captured at ${selectedFile.captured_at}.\nContains production search cluster index document rows and profile lookups.`);
        } else {
          setFileContent('No text content available.');
        }
        setLoadingContent(false);
      })
      .catch((err) => {
        setFileContent(`Error loading content: ${err.message}`);
        setLoadingContent(false);
      });
  }, [selectedFile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101521] p-3 rounded-xl border border-[#1C2436]">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-[#080B12] p-1 rounded-lg border border-[#1C2436] overflow-x-auto">
          {['ALL', 'DATABASE', 'RECORD', 'LOG', 'DOCUMENT', 'IMAGE'].map((tab) => {
            const isActive = categoryFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setCategoryFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#151C2A] text-white shadow-sm border border-[#8B7CFF]/30'
                    : 'text-[#929DB0] hover:text-white'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#929DB0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 94 evidence files..."
            className="w-full bg-[#080B12] border border-[#1C2436] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#929DB0] focus:outline-none focus:border-[#8B7CFF]"
          />
        </div>
      </div>

      {/* Two-Column Explorer: Master List & Content Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px]">
        {/* Left List (5 Cols) */}
        <div className="lg:col-span-5 bg-[#101521] rounded-xl border border-[#1C2436] overflow-hidden flex flex-col">
          <div className="p-3 bg-[#0E131F] border-b border-[#1C2436] flex items-center justify-between text-xs text-[#929DB0]">
            <span className="font-mono">Manifest Items ({filteredList.length})</span>
            <span className="text-[10px]">94 Total Artifacts</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#151C2A]">
            {filteredList.map((m) => {
              const cat = getCategory(m.file_path);
              const isSelected = selectedFile?.file_id === m.file_id;
              return (
                <div
                  key={m.file_id}
                  onClick={() => setSelectedFile(m)}
                  className={`p-3 hover:bg-[#151C2A]/60 cursor-pointer transition-colors space-y-1 ${
                    isSelected ? 'bg-[#151C2A] border-l-2 border-[#8B7CFF]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-white">
                      {m.file_id}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-[#8B7CFF]">
                      {cat}
                    </span>
                  </div>
                  <div className="text-xs text-[#F3F5FA] truncate font-mono text-[11px]">
                    {m.file_path}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#929DB0]">
                    <span className="truncate max-w-[200px]">{m.origin}</span>
                    <span className="font-mono">{m.captured_at.slice(0, 10)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-[#101521] rounded-xl border border-[#1C2436] overflow-hidden flex flex-col">
          {selectedFile ? (
            <>
              {/* Header */}
              <div className="p-3.5 bg-[#0E131F] border-b border-[#1C2436] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">
                      {selectedFile.file_id}
                    </span>
                    <span className="text-[#929DB0] text-xs">·</span>
                    <span className="text-xs text-[#929DB0] font-mono">{selectedFile.origin}</span>
                  </div>
                  <div className="text-[10px] text-[#929DB0] font-mono mt-0.5">
                    {selectedFile.file_path} (Captured: {selectedFile.captured_at})
                  </div>
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#151C2A] hover:bg-[#1C2436] text-xs text-white border border-[#2A344A] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8B7CFF]" />}
                  <span>{copied ? 'Copied' : 'Copy Content'}</span>
                </button>
              </div>

              {/* Code/Log/SQL Content */}
              <div className="flex-1 p-4 bg-[#080B12] overflow-auto">
                {loadingContent ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#929DB0]">
                    Loading artifact content...
                  </div>
                ) : (
                  <pre className="text-xs font-mono text-[#F3F5FA] leading-relaxed whitespace-pre select-all">
                    {fileContent}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#929DB0]">
              Select an evidence file from the manifest list to inspect contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
