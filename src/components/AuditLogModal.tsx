import React, { useState, useEffect } from 'react';
import { History, RefreshCw, Bot, User, Cpu, ShieldCheck } from 'lucide-react';
import { AuditLogEntry, AuditSource } from '../types/inventory';
import { fetchAuditLogs } from '../services/api';

export const AuditLogModal: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs(50);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getSourceBadge = (source: AuditSource) => {
    switch (source) {
      case 'AI_AGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
            <Bot className="w-3 h-3" />
            AI Agent
          </span>
        );
      case 'MCP_TOOL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Cpu className="w-3 h-3" />
            MCP Protocol
          </span>
        );
      case 'MANUAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300 border border-slate-600">
            <User className="w-3 h-3" />
            Operator UI
          </span>
        );
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'STOCK_ADJUST':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'UPDATE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'DELETE':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <History className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">Supply Chain Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of all catalogue modifications, automated stock adjustments, and inventory events.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Logs Table / List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No audit logs recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map(log => {
              const formattedDate = new Date(log.timestamp).toLocaleString();

              return (
                <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      {getSourceBadge(log.source)}
                      {log.sku && (
                        <span className="font-mono text-cyan-300 font-semibold">{log.sku}</span>
                      )}
                      <span className="text-slate-500 text-[11px]">• {formattedDate}</span>
                    </div>

                    <p className="text-slate-200 font-medium leading-relaxed">{log.details}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono">
                      ID: {log.id.slice(0, 14)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
