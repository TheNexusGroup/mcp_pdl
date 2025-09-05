export interface MCPConfig {
  version: string;
  project: {
    name: string;
    id: string;  // Claude project ID for cross-reference
    full_path: string;
    description?: string;
    created_at: string;
    updated_at: string;
  };
}

export const DEFAULT_MCP_CONFIG: Partial<MCPConfig> = {
  version: "1.0.0"
};