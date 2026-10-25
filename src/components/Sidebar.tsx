import React from 'react';
import {
  LayoutDashboard,
  FileCheck2,
  Database,
  Network,
  Workflow,
  ShieldAlert,
  TestTube2,
  Coins,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  FolderArchive
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  casesCount: number;
  evidenceCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  casesCount,
  evidenceCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'dataset', label: 'Dataset & Evidence', icon: FolderArchive, highlight: true },
    { id: 'cases', label: 'Audit Cases', icon: FileCheck2, badge: casesCount ? `${casesCount}` : undefined },
    { id: 'evidence', label: 'Evidence Explorer', icon: Database, badge: evidenceCount ? `${evidenceCount}` : undefined },
    { id: 'graph', label: 'Identity Graph', icon: Network },
    { id: 'dataflows', label: 'Data Flows', icon: Workflow },
    { id: 'remediation', label: 'Remediation Center', icon: ShieldAlert },
    { id: 'evaluation', label: 'Evaluation Lab', icon: TestTube2 },
    { id: 'usage', label: 'Usage & Cost', icon: Coins },
    { id: 'settings', label: 'Settings & Policy', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-[#0A0E18] border-r border-[#151C2A] transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#151C2A]">
        {!collapsed && (
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('landing')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B7CFF] to-[#59D9FF] flex items-center justify-center shadow-lg shadow-[#8B7CFF]/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                GhostTrace <span className="text-[#8B7CFF] text-xs font-mono font-medium">AI</span>
              </div>
              <div className="text-[10px] text-[#929DB0] tracking-wider uppercase font-mono">
                Deletion Intelligence
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div
            className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-[#8B7CFF] to-[#59D9FF] flex items-center justify-center shadow-lg shadow-[#8B7CFF]/20 cursor-pointer"
            onClick={() => setCollapsed(false)}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`text-[#929DB0] hover:text-white p-1 rounded hover:bg-[#151C2A] transition-colors ${collapsed ? 'hidden' : 'block'}`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#151C2A] text-white shadow-sm border border-[#8B7CFF]/30'
                  : 'text-[#929DB0] hover:text-white hover:bg-[#101521]'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#8B7CFF]' : 'text-[#929DB0]'}`} />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between text-left">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="font-mono text-[10px] text-[#929DB0] bg-[#101521] px-1.5 py-0.5 rounded border border-[#1C2436]">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !item.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CFF] animate-pulse"></span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Download Quick Hub */}
      <div className="p-3 border-t border-[#151C2A] space-y-2">
        {!collapsed ? (
          <div className="bg-[#101521] rounded-lg p-3 border border-[#1C2436]">
            <div className="text-[11px] font-medium text-white mb-1 flex items-center gap-1.5">
              <FolderArchive className="w-3.5 h-3.5 text-[#59D9FF]" />
              Submission Package
            </div>
            <p className="text-[10px] text-[#929DB0] mb-2 leading-relaxed">
              Export verified output.csv and full runnable solution code.zip.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <a
                href="/api/download/output.csv"
                download="output.csv"
                className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-[#151C2A] hover:bg-[#1C2436] text-[10px] text-white border border-[#2A344A] transition-colors"
              >
                <Download className="w-3 h-3 text-[#8B7CFF]" />
                output.csv
              </a>
              <a
                href="/api/download/code.zip"
                download="code.zip"
                className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-[#151C2A] hover:bg-[#1C2436] text-[10px] text-white border border-[#2A344A] transition-colors"
              >
                <Download className="w-3 h-3 text-[#59D9FF]" />
                code.zip
              </a>
            </div>
          </div>
        ) : (
          <a
            href="/api/download/code.zip"
            download="code.zip"
            className="flex items-center justify-center p-2 rounded-lg bg-[#101521] text-[#59D9FF] hover:bg-[#151C2A] border border-[#1C2436]"
            title="Download code.zip"
          >
            <Download className="w-4 h-4" />
          </a>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center p-2 text-[#929DB0] hover:text-white rounded hover:bg-[#151C2A]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
