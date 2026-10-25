import React, { useState } from 'react';
import { Search, Download, RefreshCw, ExternalLink, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  onSearch: (query: string) => void;
  onRunAudit: () => Promise<void>;
  isAuditing: boolean;
  totalCases: number;
  completeCases: number;
  incompleteCases: number;
  latestRunId?: string | null;
  latestRunTimestamp?: string | null;
  datasetSource?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  onRunAudit,
  isAuditing,
  totalCases,
  completeCases,
  incompleteCases,
  latestRunId,
  latestRunTimestamp,
  datasetSource = 'Official',
}) => {
  const [searchVal, setSearchVal] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  const formattedTime = latestRunTimestamp
    ? new Date(latestRunTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <header className="h-16 bg-[#080B12]/80 backdrop-blur-md border-b border-[#151C2A] px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="relative w-72 md:w-80">
        <Search className="w-4 h-4 text-[#929DB0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchVal}
          onChange={handleSearchChange}
          placeholder="Search case ID, email, or keyword..."
          className="w-full bg-[#101521] border border-[#1C2436] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#929DB0] focus:outline-none focus:border-[#8B7CFF] transition-colors"
        />
      </div>

      {/* Latest Run ID & Challenge indicator */}
      <div className="hidden lg:flex items-center gap-3 text-xs text-[#929DB0]">
        {latestRunId ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101521] border border-[#1C2436] font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-gray-400">Run:</span>
            <span className="text-white font-medium">{latestRunId}</span>
            {formattedTime && <span className="text-[#929DB0]">({formattedTime})</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#929DB0]">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Awaiting Audit Run</span>
          </div>
        )}

        <span className="text-[#1C2436]">|</span>

        <a
          href="https://www.hackerrank.com/contests/hackerrank-orchestrate-october26/challenges/ghost-data-still-exists"
          target="_blank"
          rel="noreferrer"
          className="text-[#8B7CFF] hover:underline flex items-center gap-1 font-mono text-[11px]"
        >
          <span>ghost-data-still-exists</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Quick metrics text */}
        <div className="hidden md:flex items-center gap-3 font-mono text-[11px] text-[#929DB0]">
          <span>
            Total: <strong className="text-white">{totalCases}</strong>
          </span>
          <span className="text-[#1C2436]">·</span>
          <span>
            Complete: <strong className="text-emerald-400">{completeCases}</strong>
          </span>
          <span className="text-[#1C2436]">·</span>
          <span>
            Incomplete: <strong className="text-amber-400">{incompleteCases}</strong>
          </span>
        </div>

        {/* Audit Run Button */}
        <button
          onClick={onRunAudit}
          disabled={isAuditing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7866FF] text-white text-xs font-medium shadow-md shadow-[#8B7CFF]/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
          <span>{isAuditing ? 'Auditing Cases...' : 'Execute Audit'}</span>
        </button>

        {/* Quick Download Menu (Points directly to latest run artifact) */}
        <a
          href="/api/download/output.csv"
          download="output.csv"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151C2A] hover:bg-[#1C2436] text-xs text-white border border-[#2A344A] transition-colors"
          title="Download latest verified output.csv"
        >
          <Download className="w-3.5 h-3.5 text-[#59D9FF]" />
          <span>output.csv</span>
        </a>
      </div>
    </header>
  );
};
