import { z } from "zod";

// Blackbox CLI Log Entry Schema
export const BlackboxLogEntrySchema = z.object({
  sessionId: z.string(),
  messageId: z.number(),
  type: z.union([z.literal("user"), z.literal("assistant"), z.literal("model")]),
  message: z.string(),
  timestamp: z.string(),
});

export type BlackboxLogEntry = z.infer<typeof BlackboxLogEntrySchema>;

// Blackbox CLI Checkpoint Session Entry Schema
export const BlackboxCheckpointPartSchema = z.object({
  text: z.string().optional(),
  functionCall: z
    .object({
      id: z.string(),
      name: z.string(),
      args: z.record(z.string(), z.unknown()),
    })
    .optional(),
  functionResponse: z
    .object({
      id: z.string(),
      name: z.string(),
      response: z.unknown(),
    })
    .optional(),
});

export type BlackboxCheckpointPart = z.infer<typeof BlackboxCheckpointPartSchema>;

export const BlackboxCheckpointEntrySchema = z.object({
  role: z.union([z.literal("user"), z.literal("model")]),
  parts: z.array(BlackboxCheckpointPartSchema),
});

export type BlackboxCheckpointEntry = z.infer<typeof BlackboxCheckpointEntrySchema>;

// Blackbox CLI Todo Schema
export const BlackboxTodoSchema = z.object({
  id: z.string(),
  content: z.string(),
  status: z.union([z.literal("pending"), z.literal("in_progress"), z.literal("completed")]),
});

export type BlackboxTodo = z.infer<typeof BlackboxTodoSchema>;

export const BlackboxTodosFileSchema = z.object({
  todos: z.array(BlackboxTodoSchema),
  sessionId: z.string(),
});

export type BlackboxTodosFile = z.infer<typeof BlackboxTodosFileSchema>;

// Blackbox CLI Settings Schema
export const BlackboxAuthConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
});

export const BlackboxSecuritySchema = z.object({
  auth: z.object({
    blackbox: BlackboxAuthConfigSchema.optional(),
    selectedType: z.string().optional(),
    selectedProvider: z.string().optional(),
  }),
});

export const BlackboxAgentConfigSchema = z.object({
  model: z.string().optional(),
});

export const BlackboxSingleAgentSchema = z.object({
  selectedAgent: z.string().optional(),
  agents: z.record(z.string(), BlackboxAgentConfigSchema).optional(),
  routingDisabled: z.boolean().optional(),
  model: z.string().optional(),
  configuredAgents: z.array(z.string()).optional(),
});

export const BlackboxMcpServerSchema = z.object({
  httpUrl: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  description: z.string().optional(),
});

export const BlackboxSettingsSchema = z.object({
  model: z.string().optional(),
  selectedAuthType: z.string().optional(),
  mcpServers: z.record(z.string(), BlackboxMcpServerSchema).optional(),
  security: BlackboxSecuritySchema.optional(),
  singleAgent: BlackboxSingleAgentSchema.optional(),
});

export type BlackboxSettings = z.infer<typeof BlackboxSettingsSchema>;

// Normalized Conversation Entry (internal format for viewer)
export const NormalizedEntrySchema = z.object({
  uuid: z.string(),
  timestamp: z.string(),
  type: z.union([z.literal("user"), z.literal("assistant")]),
  message: z.object({
    role: z.union([z.literal("user"), z.literal("assistant")]),
    content: z.string(),
  }),
  sessionId: z.string(),
  cwd: z.string().optional(),
});

export type NormalizedEntry = z.infer<typeof NormalizedEntrySchema>;
