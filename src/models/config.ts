export interface MCPConfig {
  version: string;
  project: {
    name: string;
    id: string;
    full_path: string;
    description?: string;
    created_at: string;
    updated_at: string;
  };
  pdl: {
    current_phase: number;
    start_phase: number;
    phases_completed: number[];
    total_sprints: number;
    active_sprints: string[];
  };
  team: {
    product_manager?: string | string[];
    product_designer?: string | string[];
    engineering_manager?: string;
    engineers?: string[];
    qa_engineers?: string[];
    marketing_manager?: string;
    sales_support?: string[];
  };
  mcp_server: {
    host?: string;
    port?: number;
    database_path?: string;
    connection_string?: string;
  };
  settings: {
    auto_transition: boolean;
    notification_channels: string[];
    default_sprint_duration_days: number;
    quality_gates_enabled: boolean;
  };
}

export const DEFAULT_MCP_CONFIG: Partial<MCPConfig> = {
  version: "1.0.0",
  pdl: {
    current_phase: 1,
    start_phase: 1,
    phases_completed: [],
    total_sprints: 0,
    active_sprints: []
  },
  settings: {
    auto_transition: false,
    notification_channels: [],
    default_sprint_duration_days: 14,
    quality_gates_enabled: true
  },
  mcp_server: {
    database_path: "data/pdl.sqlite"
  }
};