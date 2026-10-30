import React from 'react';
import {
  Boxes,
  Sparkles,
  Server,
  History,
  Plus,
  RotateCcw,
  Bot,
  Activity,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'inventory' | 'planning' | 'mcp' | 'audit';
  setCurrentTab: (tab: 'inventory' | 'planning' | 'mcp' | 'audit') => void;
  onOpenAddModal: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  onResetDemo: () => void;
  isResetting: boolean;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAddModal,
  onToggleChat,
  isChatOpen,
  onResetDemo,
  isResetting,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Boxes className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">NexusStock</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Agent
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini 3.8 Flash
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  SQLite DB
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Server className="w-3 h-3 text-cyan-400" />
                  MCP Server
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Chat Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onToggleChat}
              className={`p-2 rounded-lg border transition-all ${
                isChatOpen
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 text-indigo-300 border-indigo-500/40 hover:bg-indigo-950'
              }`}
              title="Toggle AI Agent"
            >
              <Bot className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setCurrentTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Inventory & Dashboard
          </button>

          <button
            onClick={() => setCurrentTab('planning')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentTab === 'planning'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Restock Planner
          </button>

          <button
            onClick={() => setCurrentTab('mcp')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentTab === 'mcp'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            MCP Protocol
          </button>

          <button
            onClick={() => setCurrentTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Trail
          </button>
        </nav>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50"
            title="Reset catalog to clean demo seed data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Demo
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            New Product
          </button>

          <button
            onClick={onToggleChat}
            className={`hidden md:flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
              isChatOpen
                ? 'bg-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-400/40'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/20'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
            AI Agent Chat
          </button>
        </div>
      </div>
    </header>
  );
};
