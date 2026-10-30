# NexusStock AI — Intelligent Inventory Management Agent

An enterprise-grade, full-stack AI-native inventory management platform built for the **AI-Native Product Engineer Challenge**. NexusStock combines a real-time responsive React dashboard, an autonomous Gemini 3.8 Flash agent with function calling, a standardized Model Context Protocol (MCP) server, and a persistent transactional database with immutable audit trails.

---

## 🌟 Key Features

### 1. Modern Executive Dashboard
- **Live Inventory Metrics**: Real-time counters for **Total Products**, **Low-Stock Alert** (items below safety buffer), and **Out of Stock** (depleted SKUs).
- **Financial Valuation**: Instant valuation calculation (`Σ(quantity × price)`) with average unit costs.
- **Stock Health Distribution**: Visual breakdown of healthy vs. low-stock vs. out-of-stock items.
- **Category Valuation Matrix**: Dynamic category cards displaying volume and financial allocations.

### 2. Autonomous Natural Language AI Agent
- **Powered by Gemini 3.8 Flash** via `@google/genai` TypeScript SDK.
- **Deterministic Tool Calling**: The AI never hallucinates or fakes inventory modifications. Every query and update is routed through verified database tools.
- **Transparent Execution Trace**: Each assistant response includes inspectable tool cards showing invoked tool name, exact arguments, database execution output, and execution status (`success` or `error`).
- **Live UI Synchronization**: When the agent creates, updates, or restocks items, the frontend table and analytics automatically sync without manual page reloads.

### 3. Professional Inventory Table & Steppers
- Displays **Product Name**, **Location & Supplier**, **Category**, **SKU (with click-to-copy)**, **Price ($)**, **Stock Quantity**, and **Stock Status Badges** (In Stock, Low Stock, Out of Stock).
- **Inline Stepper Controls**: Rapid `+1` / `-1` micro-adjustments with optimistic UI feedback.
- **Stock Adjustment Modal**: Support for relative restocks, deductions, and absolute count setting with mandatory audit reasons.
- **Batch Actions**: Select multiple products for bulk restock, bulk deletion, or CSV export.

### 4. Advanced Search & Filtering Interface
- **Instant Search**: Real-time search across product titles, SKU codes, categories, suppliers, and warehouse rack locations.
- **Multi-Filter Engine**: Filter by stock status (`In Stock`, `Low Stock`, `Out of Stock`) and product categories.
- **Sorting & Views**: Sort by Last Updated, Title, SKU, Price, or Stock Quantity, with Table and Grid card views.

### 5. Automated Restock & Replenishment Planner
- Automatically detects items below safety threshold or completely depleted.
- Calculates suggested order replenishment quantities (`(threshold × 2) - currentStock`).
- Estimates purchase order financial impact and supports 1-click single or batch purchase order approvals.

### 6. Model Context Protocol (MCP) Server
- Implements the standard **JSON-RPC 2.0** Model Context Protocol endpoint at `/api/mcp`.
- Exposes 8 verified MCP tools:
  - `list_inventory`
  - `get_product`
  - `add_product`
  - `update_stock`
  - `update_product`
  - `delete_product`
  - `get_inventory_analytics`
  - `get_restock_recommendations`
- Includes an in-app **MCP Protocol Inspector** with a live JSON-RPC runner and copyable **Claude Desktop** & **Cursor** integration configs.

### 7. Immutable Supply Chain Audit Trail
- Logs every inventory operation (`CREATE`, `UPDATE`, `STOCK_ADJUST`, `DELETE`, `BATCH_UPDATE`).
- Tags origin source: `AI_AGENT`, `MANUAL`, or `MCP_TOOL`.
- Captures before/after quantity and status snapshots.

---

## 🏗️ Architecture & Clean Separation of Concerns

```
nexus-stock-ai/
├── data/                       # Persistent SQLite database storage
│   └── inventory.sqlite        # SQLite relational database file
├── server/                     # Full-Stack Node.js Express Backend
│   ├── types.ts                # Server TypeScript schemas
│   ├── db/
│   │   ├── schema.sql          # 4 Relational tables DDL (Categories, Products, ProductVariants, Inventory)
│   │   ├── sqliteDb.ts         # SQLite database engine (node:sqlite) with transactions & queries
│   │   ├── initDb.ts           # Standalone initialization & seeding script (npm run db:init)
│   │   └── db.test.ts          # Comprehensive database test suite (npm test)
│   ├── mcp/
│   │   ├── mcpTypes.ts         # JSON-RPC 2.0 & MCP protocol definitions
│   │   ├── mcpTools.ts         # MCP tool definitions with JSON Schemas
│   │   ├── mcpServer.ts        # Tool execution engine
│   │   └── mcpRouter.ts        # /api/mcp endpoint supporting tools/list & tools/call
│   ├── agent/
│   │   ├── geminiClient.ts     # GoogleGenAI client (gemini-3.8-flash)
│   │   └── inventoryAgent.ts   # Multi-turn autonomous tool execution loop
│   └── routes/
│       ├── productsRouter.ts   # REST CRUD endpoints
│       ├── analyticsRouter.ts  # Analytics, restock & audit endpoints
│       └── chatRouter.ts       # AI chat endpoint
├── src/                        # React 19 Frontend (SPA)
│   ├── types/                  # Client TypeScript interfaces
│   ├── services/api.ts         # Typed API client layer
│   ├── components/             # Reusable modular UI components
│   │   ├── Navbar.tsx          # Navigation, status & quick actions
│   │   ├── DashboardStats.tsx  # Executive KPI cards & alerts
│   │   ├── StockHealthBar.tsx  # Stock health distribution
│   │   ├── CategoryBreakdown.tsx # Category valuation matrix
│   │   ├── FilterBar.tsx       # Search, filter chips, and sorting
│   │   ├── InventoryTable.tsx  # Core inventory data table
│   │   ├── ProductGrid.tsx     # Card view alternative
│   │   ├── AIChatDrawer.tsx    # Conversational agent interface with tool traces
│   │   ├── ProductModal.tsx    # Add/Edit product modal
│   │   ├── StockAdjustModal.tsx# Stock adjustment modal with presets
│   │   ├── DeleteConfirmModal.tsx # Delete confirmation
│   │   ├── RestockPlannerView.tsx # Automated reorder planner
│   │   ├── MCPInspectorModal.tsx  # MCP tool runner & inspector
│   │   ├── AuditLogModal.tsx   # Historical change log
│   │   └── Toast.tsx           # Toast notification provider
│   ├── App.tsx                 # Root application component
│   ├── main.tsx                # React entrypoint
│   └── index.css               # Tailwind CSS styles
├── server.ts                   # Express server entrypoint with Vite middleware
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

---

## 🚀 Quickstart & Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- A Google Gemini API Key ([Get one from Google AI Studio](https://aistudio.google.com/))

### 1. Clone the repository
```bash
git clone https://github.com/your-username/nexusstock-ai.git
cd nexusstock-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Fill in your Gemini API key:
```env
GEMINI_API_KEY="your-actual-gemini-api-key"
PORT=3000
NODE_ENV="development"
```

### 4. Initialize Database (Optional - auto-initialized on first run)
```bash
npm run db:init
```

### 5. Run Database Automated Test Suite
```bash
npm test
```
Executes 29 automated tests verifying Foreign Key constraints, Unique SKU constraints, 1:1 ProductVariant-to-Inventory constraints, search queries, transactions, and analytics.

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔌 Model Context Protocol (MCP) Server

NexusStock includes a production MCP server built with the official `@modelcontextprotocol/sdk` and `zod`. It executes parameterized SQL queries directly on the SQLite database with full transactional safety.

### Implemented MCP Tools

| Tool Name | Parameters | Description |
|---|---|---|
| `search_products` | `query` (string), `category` (optional string) | Search products by name, SKU, variant, or category. |
| `get_stock_status` | `statusFilter` (`all` \| `low_stock` \| `out_of_stock`) | Retrieve all low-stock and out-of-stock items with reorder recommendations. |
| `get_product_details` | `sku` (string) | Retrieve complete product specifications, SKU, price, stock, and threshold. |
| `update_stock` | `sku` (string), `newQuantity` (opt number), `delta` (opt number), `reason` (opt string) | Updates stock quantity in SQLite with audit logging and negative quantity protection. |
| `add_product` | `productName`, `sku`, `category`, `price`, `initialStock`, `reorderLevel`, `variantName`, `description` | Registers a new product and variant with uniqueness checks and 1:1 inventory record. |

### Connecting an AI Client to the MCP Server

#### Option A: Claude Desktop / Cursor via Stdio Transport (CLI)
Add this to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "nexus-stock-inventory": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/nexusstock-ai/server/mcp/stdioServer.ts"]
    }
  }
}
```

Or run directly in terminal:
```bash
npm run mcp:stdio
```

#### Option B: Remote / HTTP Clients via SSE Transport
Start the server (`npm run dev`) and connect to:
- **SSE Endpoint**: `http://localhost:3000/api/mcp/sse`
- **Messages Endpoint**: `http://localhost:3000/api/mcp/messages`

```json
{
  "mcpServers": {
    "nexus-stock-inventory": {
      "url": "http://localhost:3000/api/mcp/sse",
      "type": "sse"
    }
  }
}
```

### Running Automated MCP Tests
```bash
npm run test:mcp
```
Executes 37 end-to-end tests using an official `@modelcontextprotocol/sdk` Client over an in-memory transport, verifying tool registration, parameter validation, missing/duplicate SKU handling, negative stock rejection, and SQLite database persistence.

---

## 📡 API Reference

### Products REST API
- `GET /api/products`: List products with search, category, status, and price filters.
- `GET /api/products/:idOrSku`: Retrieve product by ID or SKU.
- `POST /api/products`: Create a new product.
- `PUT /api/products/:idOrSku`: Update product attributes.
- `POST /api/products/:idOrSku/stock`: Adjust stock quantity with audit logging.
- `DELETE /api/products/:idOrSku`: Delete a product.

### Analytics & Restock
- `GET /api/analytics`: Overview counts, valuations, and category breakdown.
- `GET /api/recommendations`: Restock recommendations for low and out-of-stock items.
- `GET /api/audit-logs`: Immutable audit trail.
- `POST /api/reset-demo`: Reset to default seed catalog.

### AI Agent & MCP
- `POST /api/chat`: Send natural language commands to the Gemini agent.
- `POST /api/mcp`: Standard JSON-RPC 2.0 MCP protocol endpoint (`tools/list`, `tools/call`, `initialize`).
- `GET /api/mcp/info`: Protocol capabilities and client configurations.

---

## 📄 License
Apache-2.0. Built for the AI-Native Product Engineer Challenge.
