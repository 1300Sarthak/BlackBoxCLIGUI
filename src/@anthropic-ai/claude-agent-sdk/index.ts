// Stub for @anthropic-ai/claude-agent-sdk
// This is a placeholder to allow compilation without the actual SDK

export type SDKMessage = {
  type: string;
  subtype?: string;
  session_id?: string;
  content?: unknown;
};

export type SDKUserMessage = {
  type: "user";
  content: string | unknown[];
  session_id?: string;
};

export type SDKSystemMessage = {
  type: "system";
  content: string;
  session_id?: string;
};

export type SDKResultMessage = {
  type: "result";
  session_id: string;
  content?: unknown;
};

export type CanUseTool = (
  toolName: string,
  toolInput: Record<string, unknown>,
  options?: unknown
) => Promise<{
  behavior: "allow" | "deny";
  updatedInput?: unknown;
  message?: string;
}>;

export type PermissionMode = "default" | "bypassPermissions" | "acceptEdits" | "plan";

export type Options = {
  abortController?: AbortController;
  canUseTool?: CanUseTool;
};

export const query = {
  claudeCode: async () => ({
    version: () => ({ stdout: "1.0.0" }),
    mcpList: async () => ({ stdout: "" }),
  }),
};
