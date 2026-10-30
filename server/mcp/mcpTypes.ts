export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: any;
  default?: any;
}

export interface MCPToolInputSchema {
  type: 'object';
  properties: Record<string, MCPToolProperty>;
  required?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolInputSchema;
}

export interface MCPToolTextContent {
  type: 'text';
  text: string;
}

export interface MCPCallToolResult {
  content: MCPToolTextContent[];
  isError?: boolean;
  metadata?: Record<string, any>;
}

export interface MCPListToolsResult {
  tools: MCPTool[];
}
