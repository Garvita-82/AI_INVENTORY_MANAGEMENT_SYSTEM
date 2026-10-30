import React, { useState, useEffect } from 'react';
import {
  Layers,
  Terminal,
  Play,
  Copy,
  Check,
  RefreshCw,
  Code,
  Server,
  FileJson,
} from 'lucide-react';
import { fetchMCPTools, fetchMCPInfo, callRawMCP } from '../services/api';

export const MCPInspectorModal: React.FC = () => {
  const [tools, setTools] = useState<any[]>([]);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [selectedToolName, setSelectedToolName] = useState<string>('list_inventory');
  const [paramsInput, setParamsInput] = useState<string>('{\n  "status": "low_stock"\n}');
  const [executionOutput, setExecutionOutput] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'tester' | 'schemas' | 'clientConfig'>('tester');

  const loadMCPData = async () => {
    try {
      const [toolsRes, infoRes] = await Promise.all([fetchMCPTools(), fetchMCPInfo()]);
      if (toolsRes?.tools) {
        setTools(toolsRes.tools);
        if (toolsRes.tools.length > 0 && !selectedToolName) {
          setSelectedToolName(toolsRes.tools[0].name);
        }
      }
      if (infoRes) {
        setServerInfo(infoRes);
      }
    } catch (err) {
      console.error('Failed to load MCP data:', err);
    }
  };

  useEffect(() => {
    loadMCPData();
  }, []);

  const handleToolSelect = (toolName: string) => {
    setSelectedToolName(toolName);
    const tool = tools.find(t => t.name === toolName);
    if (!tool) return;

    // Generate sample payload based on properties
    const sample: Record<string, any> = {};
    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
        if (tool.inputSchema.required?.includes(key)) {
          if (prop.type === 'number') sample[key] = 10;
          else if (prop.type === 'array') sample[key] = [];
          else sample[key] = key.toLowerCase().includes('sku') ? 'TECH-KB-001' : 'Sample Value';
        }
      });
    }

    setParamsInput(JSON.stringify(sample, null, 2));
    setExecutionOutput(null);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionOutput(null);

    let parsedArgs = {};
    try {
      if (paramsInput.trim()) {
        parsedArgs = JSON.parse(paramsInput);
      }
    } catch (e: any) {
      setExecutionOutput({
        error: {
          code: -32602,
          message: `Malformed JSON in params: ${e.message}`,
        },
      });
      setIsExecuting(false);
      return;
    }

    try {
      const response = await callRawMCP('tools/call', {
        name: selectedToolName,
        arguments: parsedArgs,
      });
      setExecutionOutput(response);
    } catch (err: any) {
      setExecutionOutput({
        error: {
          code: -32603,
          message: err.message || 'Execution error',
        },
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const selectedTool = tools.find(t => t.name === selectedToolName);

  const claudeDesktopConfig = serverInfo?.claudeDesktopConfig || {
    mcpServers: {
      "nexus-stock-inventory": {
        url: window.location.origin + "/api/mcp",
        type: "jsonrpc"
      }
    }
  };

  const copyConfigSnippet = () => {
    navigator.clipboard.writeText(JSON.stringify(claudeDesktopConfig, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Model Context Protocol (MCP) Server Inspector
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            NexusStock implements standard JSON-RPC 2.0 MCP tools for autonomous AI agent operation and 3rd-party MCP clients.
          </p>
        </div>

        {/* Protocol Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('tester')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'tester' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tool Runner
          </button>
          <button
            onClick={() => setActiveTab('schemas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'schemas' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Registered Schemas ({tools.length})
          </button>
          <button
            onClick={() => setActiveTab('clientConfig')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'clientConfig' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Claude / Cursor Config
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Tool Selector List (Left 4 cols) */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Available Tools ({tools.length})
              </span>
              <button
                onClick={loadMCPData}
                className="text-slate-400 hover:text-white p-1 rounded"
                title="Reload tools"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {tools.map(tool => {
                const isSelected = tool.name === selectedToolName;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleToolSelect(tool.name)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/80 text-white ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold text-cyan-300">{tool.name}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {tool.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Execution & Output Panel (Right 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Selected Tool Info & Argument Editor */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      MCP Tool
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono">{selectedToolName}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedTool?.description || 'Tool executes actions on the inventory database.'}
                  </p>
                </div>

                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all disabled:opacity-50 shrink-0"
                >
                  <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                  {isExecuting ? 'Calling MCP...' : 'Execute Tool'}
                </button>
              </div>

              {/* JSON Args Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Input Arguments (JSON Object)</span>
                  <span className="text-[10px] text-slate-500 font-mono">POST /api/mcp</span>
                </label>
                <textarea
                  rows={5}
                  value={paramsInput}
                  onChange={e => setParamsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Output Panel */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  JSON-RPC 2.0 Response
                </span>
                {executionOutput && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {executionOutput.id || 'N/A'}
                  </span>
                )}
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto min-h-[140px] max-h-[350px]">
                {executionOutput ? (
                  <pre
                    className={
                      executionOutput.error
                        ? 'text-rose-400'
                        : executionOutput.result?.isError
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }
                  >
                    {JSON.stringify(executionOutput, null, 2)}
                  </pre>
                ) : (
                  <div className="text-slate-600 text-center py-8">
                    Select a tool and click "Execute Tool" to test real MCP execution against the database.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schemas View */}
      {activeTab === 'schemas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map(tool => (
            <div
              key={tool.name}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-sm font-bold text-cyan-300">{tool.name}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  Schema
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{tool.description}</p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto max-h-56">
                <pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claude Desktop / Cursor Config Tab */}
      {activeTab === 'clientConfig' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  Connect NexusStock to Claude Desktop or Cursor
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Add this configuration to your local Claude Desktop config (
                <code className="text-indigo-300">claude_desktop_config.json</code>) or Cursor IDE to allow
                desktop AI models to query and manage this inventory.
              </p>
            </div>

            <button
              onClick={copyConfigSnippet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all shrink-0"
            >
              {copiedConfig ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copiedConfig ? 'Copied to Clipboard!' : 'Copy Config JSON'}
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
            <pre>{JSON.stringify(claudeDesktopConfig, null, 2)}</pre>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 space-y-1.5">
            <div className="font-semibold text-white">How it works:</div>
            <p>
              1. The MCP endpoint at <code className="text-cyan-300 font-mono">/api/mcp</code> handles JSON-RPC 2.0 requests (<code className="text-slate-300">tools/list</code>, <code className="text-slate-300">tools/call</code>, <code className="text-slate-300">initialize</code>).
            </p>
            <p>
              2. Both the in-app Gemini 3.8 Flash agent and external MCP clients invoke the same verified database routines, guaranteeing complete consistency.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
