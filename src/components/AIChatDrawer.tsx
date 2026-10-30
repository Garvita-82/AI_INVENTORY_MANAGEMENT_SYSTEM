import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Terminal,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { ChatMessage, ToolCallTrace } from '../types/inventory';
import { sendChatMessage } from '../services/api';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInventoryModified: () => void;
}

const DEFAULT_SUGGESTIONS = [
  'Show all low-stock or out-of-stock products',
  'List available products in the Electronics category',
  'What is the price and stock quantity of SKU LAP-001?',
  'Update the stock quantity of SKU LAP-001 to 25',
  'Add a Wireless Mouse under Electronics with SKU MOU-101, price 799, and initial stock quantity 50',
];

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  onInventoryModified,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 **Welcome to NexusStock AI Agent.**\n\nI am connected directly to the **SQLite Inventory Database** via our custom **Model Context Protocol (MCP)** server.\n\nEvery instruction you give travels through an official MCP client connection to execute real database queries and transactions.\n\nTry testing these requests below:",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'Show all low-stock or out-of-stock products',
        'List available products in the Electronics category',
        'What is the price and stock quantity of SKU LAP-001?',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleToolExpand = (toolId: string) => {
    setExpandedToolCalls(prev => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history for context
      const history = messages.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await sendChatMessage(textToSend, history);

      const assistantMessage: ChatMessage = {
        id: `agent_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: res.toolCalls,
        suggestedActions: res.suggestedActions,
        affectedProducts: res.affectedProducts,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If the agent called mutating tools (e.g. update_stock, add_product, delete_product), refresh the inventory table!
      if (res.affectedProducts && res.affectedProducts.length > 0) {
        onInventoryModified();
      } else if (res.toolCalls && res.toolCalls.some(t => ['update_stock', 'add_product', 'delete_product', 'batch_update_stock', 'update_product'].includes(t.name))) {
        onInventoryModified();
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `❌ **Operation failed:** ${err.message || 'Unable to connect to AI Agent.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: 'Chat session reset. How can I help you manage inventory now?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: DEFAULT_SUGGESTIONS.slice(0, 3),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">NexusStock AI Agent</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Gemini 3.8 Flash</span>
              <span>•</span>
              <span className="text-cyan-400">MCP Function Calling</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                <span>{isUser ? 'You' : 'NexusStock Agent'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}
              >
                {/* Render Markdown-like content */}
                <div className="space-y-2 whitespace-pre-wrap font-sans">
                  {renderFormattedText(msg.content)}
                </div>

                {/* Render Executed Tool Call Cards if any */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Executed MCP Tools ({msg.toolCalls.length})</span>
                    </div>

                    {msg.toolCalls.map(trace => {
                      const isExpanded = expandedToolCalls[trace.id];
                      return (
                        <div
                          key={trace.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden text-[11px]"
                        >
                          <div
                            onClick={() => toggleToolExpand(trace.id)}
                            className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {trace.status === 'success' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span className="font-mono text-cyan-300 font-medium">
                                {trace.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  trace.status === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {trace.status}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-2.5 border-t border-slate-800/80 bg-slate-950 font-mono text-[10px] space-y-1.5">
                              <div>
                                <span className="text-slate-500 block mb-0.5">Parameters:</span>
                                <pre className="bg-slate-900 p-2 rounded text-slate-300 overflow-x-auto">
                                  {JSON.stringify(trace.args, null, 2)}
                                </pre>
                              </div>
                              {trace.result && (
                                <div>
                                  <span className="text-slate-500 block mb-0.5">Result:</span>
                                  <pre className="bg-slate-900 p-2 rounded text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                                    {trace.result}
                                  </pre>
                                </div>
                              )}
                              {trace.error && (
                                <div>
                                  <span className="text-rose-500 block mb-0.5">Error:</span>
                                  <div className="bg-rose-950/40 border border-rose-900/50 p-2 rounded text-rose-200">
                                    {trace.error}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Suggested Action Pills */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                  {msg.suggestedActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(action)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-slate-900 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-all text-left"
                    >
                      <span>{action}</span>
                      <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-start animate-in fade-in">
            <div className="text-[11px] text-slate-400 mb-1 px-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span>NexusStock Agent is reasoning...</span>
            </div>
            <div className="p-4 rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-slate-400">Calling MCP database tools & calculating stock changes...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/70 overflow-x-auto flex gap-1.5">
        {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(suggestion)}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Instruct agent (e.g. 'Add 20 units to SKU TECH-KB-001')..."
            disabled={isLoading}
            className="w-full pl-3 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white shadow-md transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

// Formatter to render bold, bullet points, headers nicely
function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let content: React.ReactNode = line;

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      content = (
        <span className="flex items-start gap-1.5 ml-1">
          <span className="text-indigo-400 mt-1">•</span>
          <span>{parseBold(line.trim().substring(2))}</span>
        </span>
      );
    } else {
      content = parseBold(line);
    }

    return (
      <div key={idx} className="min-h-[1.2em]">
        {content}
      </div>
    );
  });
}

function parseBold(str: string): React.ReactNode {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
