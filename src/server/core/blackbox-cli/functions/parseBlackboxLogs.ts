import {
  type BlackboxLogEntry,
  BlackboxLogEntrySchema,
  type NormalizedEntry,
} from "../../../../lib/blackbox-schema";
import type { Conversation } from "../../../../lib/conversation-schema";

/**
 * Parse Blackbox CLI logs.json content
 */
export const parseBlackboxLogs = (content: string): BlackboxLogEntry[] => {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      console.warn("Blackbox logs.json is not an array");
      return [];
    }

    const entries: BlackboxLogEntry[] = [];
    for (const item of data) {
      const result = BlackboxLogEntrySchema.safeParse(item);
      if (result.success) {
        entries.push(result.data);
      } else {
        console.warn("Failed to parse Blackbox log entry:", result.error);
      }
    }

    return entries;
  } catch (error) {
    console.error("Failed to parse Blackbox logs:", error);
    return [];
  }
};

/**
 * Convert Blackbox log entries to normalized entries for the viewer
 */
export const normalizeBlackboxLogs = (
  entries: BlackboxLogEntry[],
): NormalizedEntry[] => {
  return entries.map((entry) => ({
    uuid: `${entry.sessionId}-${entry.messageId}`,
    timestamp: entry.timestamp,
    type: entry.type === "model" ? "assistant" : (entry.type as "user" | "assistant"),
    message: {
      role: entry.type === "model" ? "assistant" : (entry.type as "user" | "assistant"),
      content: entry.message,
    },
    sessionId: entry.sessionId,
    cwd: undefined,
  }));
};

/**
 * Parse Blackbox logs and convert to viewer-compatible format
 */
export const parseBlackboxLogsToConversations = (
  content: string,
): Conversation[] => {
  const entries = parseBlackboxLogs(content);
  const normalized = normalizeBlackboxLogs(entries);

  // Convert to viewer's Conversation format
  return normalized.map((entry) => {
    const entryType = entry.type;
    return {
      type: entryType,
      uuid: entry.uuid,
      timestamp: entry.timestamp,
      sessionId: entry.sessionId,
      isSidechain: false,
      userType: "external" as const,
      cwd: entry.cwd ?? "",
      version: "1.0.0",
      message: {
        role: entry.message.role,
        content: entry.message.content,
      },
      parentUuid: null,
    };
  }) as Conversation[];
};

/**
 * Group log entries by session ID
 */
export const groupLogsBySession = (
  entries: BlackboxLogEntry[],
): Map<string, BlackboxLogEntry[]> => {
  const sessionMap = new Map<string, BlackboxLogEntry[]>();

  for (const entry of entries) {
    const existing = sessionMap.get(entry.sessionId) ?? [];
    existing.push(entry);
    sessionMap.set(entry.sessionId, existing);
  }

  return sessionMap;
};

/**
 * Extract unique session IDs from logs
 */
export const extractSessionIds = (entries: BlackboxLogEntry[]): string[] => {
  return [...new Set(entries.map((e) => e.sessionId))];
};
