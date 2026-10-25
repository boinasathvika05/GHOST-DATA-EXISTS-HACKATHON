import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  ChevronLeft,
  ArrowUpDown,
  FileText
} from 'lucide-react';
import { AuditCaseResult, DeletionStatus } from '../types';

interface CasesTableProps {
  cases: AuditCaseResult[];
  onSelectCase: (caseItem: AuditCaseResult) => void;
  selectedCaseId?: string;
  initialFilter?: string;
}

export const CasesTable: React.FC<CasesTableProps> = ({
  cases,
  onSelectCase,
  selectedCaseId,
  initialFilter = 'ALL',
}) => {
  const [filter, setFilter] = useState<string>(initialFilter);
  const [search, setSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortField, setSortField] = useState<'case_id' | 'email' | 'requested_at' | 'audit_at' | 'deletion_status'>('case_id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filter
  const filteredCases = cases.filter((c) => {
    if (filter !== 'ALL' && c.deletion_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.case_id.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.request_text.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort
  const sortedCases = [...filteredCases].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'case_id') cmp = a.case_id.localeCompare(b.case_id);
    else if (sortField === 'email') cmp = a.email.localeCompare(b.email);
    else if (sortField === 'requested_at') cmp = a.requested_at.localeCompare(b.requested_at);
    else if (sortField === 'audit_at') cmp = a.audit_at.localeCompare(b.audit_at);
    else if (sortField === 'deletion_status') cmp = a.deletion_status.localeCompare(b.deletion_status);
    return sortAsc ? cmp : -cmp;
  });

  // Pagination
  const totalPages = Math.ceil(sortedCases.length / pageSize) || 1;
  const paginatedCases = sortedCases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101521] p-3 rounded-xl border border-[#1C2436]">
        {/* Filter Tabs (Interactive segmented buttons, zero-pill discipline) */}
        <div className="flex items-center gap-1 bg-[#080B12] p-1 rounded-lg border border-[#1C2436]">
          {['ALL', 'COMPLETE', 'INCOMPLETE', 'NOT_APPLICABLE'].map((tab) => {
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#151C2A] text-white shadow-sm border border-[#8B7CFF]/30'
                    : 'text-[#929DB0] hover:text-white'
                }`}
              >
                {tab.replace('_', ' ')}
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
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search cases, emails, terms..."
            className="w-full bg-[#080B12] border border-[#1C2436] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#929DB0] focus:outline-none focus:border-[#8B7CFF]"
          />
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-[#101521] rounded-xl border border-[#1C2436] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1C2436] bg-[#0E131F] text-[#929DB0] font-mono uppercase text-[10px] tracking-wider select-none">
                <th
                  onClick={() => handleSort('case_id')}
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Case ID</span>
                    <ArrowUpDown className="w-3 h-3 text-[#929DB0]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('email')}
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Subject Email</span>
                    <ArrowUpDown className="w-3 h-3 text-[#929DB0]" />
                  </div>
                </th>
                <th className="py-3 px-4 font-medium">Reported Claim</th>
                <th
                  onClick={() => handleSort('deletion_status')}
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Determined Status</span>
                    <ArrowUpDown className="w-3 h-3 text-[#929DB0]" />
                  </div>
                </th>
                <th className="py-3 px-4 font-medium">Steps & Evidence</th>
                <th
                  onClick={() => handleSort('audit_at')}
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white hidden md:table-cell"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Audit Cutoff</span>
                    <ArrowUpDown className="w-3 h-3 text-[#929DB0]" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151C2A]">
              {paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#929DB0]">
                    No cases match the selected filter or search query.
                  </td>
                </tr>
              ) : (
                paginatedCases.map((c) => {
                  const isSelected = selectedCaseId === c.case_id;
                  return (
                    <tr
                      key={c.case_id}
                      onClick={() => onSelectCase(c)}
                      className={`hover:bg-[#151C2A]/70 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#151C2A] border-l-2 border-[#8B7CFF]' : ''
                      }`}
                    >
                      {/* Case ID */}
                      <td className="py-3 px-4 font-mono font-medium text-white">
                        {c.case_id}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-white">
                        <div className="font-mono text-xs">{c.email}</div>
                        {c.matched_user && c.matched_user.name && (
                          <div className="text-[10px] text-[#929DB0] mt-0.5">
                            {c.matched_user.name} ({c.matched_user.user_id})
                          </div>
                        )}
                      </td>

                      {/* Reported Status */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#929DB0]">
                        {c.reported_status}
                      </td>

                      {/* Determined Status */}
                      <td className="py-3 px-4 font-mono text-xs">
                        {c.deletion_status === 'COMPLETE' && (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            COMPLETE
                          </span>
                        )}
                        {c.deletion_status === 'INCOMPLETE' && (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            INCOMPLETE
                          </span>
                        )}
                        {c.deletion_status === 'NOT_APPLICABLE' && (
                          <span className="text-[#929DB0] flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5" />
                            NOT APPLICABLE
                          </span>
                        )}
                      </td>

                      {/* Steps & Evidence */}
                      <td className="py-3 px-4 text-[#929DB0] text-xs font-mono">
                        {c.steps.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <span>{c.steps.length} steps</span>
                            {c.findingsCount > 0 && (
                              <span className="text-[#EF4444]">({c.findingsCount} findings)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#929DB0]/60">0 steps (empty plan)</span>
                        )}
                      </td>

                      {/* Audit At */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#929DB0] hidden md:table-cell">
                        {c.audit_at.replace('T', ' ').replace('Z', ' UTC')}
                      </td>

                      {/* View arrow */}
                      <td className="py-3 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-[#929DB0] inline-block" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-[#0E131F] border-t border-[#1C2436] flex items-center justify-between text-xs text-[#929DB0]">
          <div>
            Showing <span className="text-white font-mono">{paginatedCases.length}</span> of{' '}
            <span className="text-white font-mono">{sortedCases.length}</span> cases
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-[#151C2A] hover:bg-[#1C2436] text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-[#151C2A] hover:bg-[#1C2436] text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
