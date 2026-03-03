import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Option } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { parseBlackboxLogs, groupLogsBySession, extractSessionIds } from "../../blackbox-cli/functions/parseBlackboxLogs";
import { parseUserMessage } from "../../claude-code/functions/parseUserMessage";
import { decodeProjectId } from "../../project/functions/id";
import type { Session, SessionDetail, ExtendedConversation } from "../../types";
import { VirtualConversationDatabase } from "../infrastructure/VirtualConversationDatabase";
import { SessionMetaService } from "../services/SessionMetaService";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sessionMetaService = yield* SessionMetaService;
  const virtualConversationDatabase = yield* VirtualConversationDatabase;

  const getSession = (projectId: string, sessionId: string) =>
    Effect.gen(function* () {
      const projectPath = decodeProjectId(projectId);
      const logsPath = path.join(projectPath, "logs.json");

      // Check if logs.json exists
      const exists = yield* fs.exists(logsPath);
      if (!exists) {
        // Check for virtual conversation
        const virtualConversation =
          yield* virtualConversationDatabase.getSessionVirtualConversation(sessionId);
        if (virtualConversation === null) {
          return { session: null };
        }
        
        const lastConversation = virtualConversation.conversations
          .filter((c) => c.type === "user" || c.type === "assistant" || c.type === "system")
          .at(-1);

        const virtualSession: SessionDetail = {
          id: sessionId,
          jsonlFilePath: `${projectPath}/${sessionId}.jsonl`,
          meta: {
            messageCount: 0,
            firstUserMessage: null,
            cost: {
              totalUsd: 0,
              breakdown: {
                inputTokensUsd: 0,
                outputTokensUsd: 0,
                cacheCreationUsd: 0,
                cacheReadUsd: 0,
              },
              tokenUsage: {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
              },
            },
            modelName: null,
          },
          conversations: virtualConversation.conversations,
          lastModifiedAt: lastConversation !== undefined
            ? new Date(lastConversation.timestamp)
            : new Date(),
        };

        return { session: virtualSession };
      }

      // Read logs.json
      const content = yield* fs.readFileString(logsPath);
      const logEntries = parseBlackboxLogs(content);
      const sessionMap = groupLogsBySession(logEntries);
      const sessionLogs = sessionMap.get(sessionId) ?? [];

      if (sessionLogs.length === 0) {
        return { session: null };
      }

      // Convert to conversations format
      const conversations: ExtendedConversation[] = sessionLogs.map((entry, index) => {
        const entryType = entry.type === "model" ? "assistant" : entry.type;
        return {
          type: entryType as "user" | "assistant",
          uuid: `${entry.sessionId}-${entry.messageId}`,
          timestamp: entry.timestamp,
          sessionId: entry.sessionId,
          isSidechain: false,
          userType: "external" as const,
          cwd: "",
          version: "1.0.0",
          message: {
            role: entryType as "user" | "assistant",
            content: entry.message,
          },
          parentUuid: index > 0 ? `${entry.sessionId}-${sessionLogs[index - 1]?.messageId}` : null,
        } as ExtendedConversation;
      });

      // Get file stats
      const stat = yield* fs.stat(logsPath);

      // Get session metadata
      const meta = yield* sessionMetaService.getSessionMeta(projectId, sessionId);

      const sessionDetail: SessionDetail = {
        id: sessionId,
        jsonlFilePath: logsPath,
        meta,
        conversations,
        lastModifiedAt: Option.getOrElse(stat.mtime, () => new Date()),
      };

      return { session: sessionDetail };
    });

  const getSessions = (
    projectId: string,
    options?: {
      maxCount?: number;
      cursor?: string;
    },
  ) =>
    Effect.gen(function* () {
      const { maxCount = 20, cursor } = options ?? {};
      const projectPath = decodeProjectId(projectId);
      const logsPath = path.join(projectPath, "logs.json");

      // Check if logs.json exists
      const exists = yield* fs.exists(logsPath);
      if (!exists) {
        console.warn(`logs.json not found at ${logsPath}`);
        return { sessions: [] };
      }

      // Read logs.json
      const content = yield* fs.readFileString(logsPath);
      const logEntries = parseBlackboxLogs(content);
      const sessionIds = extractSessionIds(logEntries);
      const sessionMap = groupLogsBySession(logEntries);

      // Get file stats
      const stat = yield* fs.stat(logsPath);
      const lastModifiedAt = Option.getOrElse(stat.mtime, () => new Date());

      // Create session objects
      const sessions: Session[] = sessionIds.map((sessionId) => {
        const sessionLogs = sessionMap.get(sessionId);
        const firstLog = sessionLogs?.[0];
        const lastLog = sessionLogs?.[sessionLogs.length - 1];

        return {
          id: sessionId,
          jsonlFilePath: logsPath,
          lastModifiedAt: lastLog ? new Date(lastLog.timestamp) : lastModifiedAt,
          meta: {
            messageCount: sessionLogs?.length ?? 0,
            firstUserMessage: firstLog && firstLog.type === "user"
              ? parseUserMessage(firstLog.message)
              : null,
            cost: {
              totalUsd: 0,
              breakdown: {
                inputTokensUsd: 0,
                outputTokensUsd: 0,
                cacheCreationUsd: 0,
                cacheReadUsd: 0,
              },
              tokenUsage: {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
              },
            },
            modelName: null,
          },
        };
      }).sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());

      // Handle cursor pagination
      const index = cursor !== undefined
        ? sessions.findIndex((session) => session.id === cursor)
        : -1;

      const startIndex = index !== -1 ? index + 1 : 0;
      const sessionsToReturn = sessions.slice(startIndex, Math.min(startIndex + maxCount, sessions.length));

      // Get sessions with metadata
      const sessionsWithMeta: Session[] = yield* Effect.all(
        sessionsToReturn.map((item) =>
          Effect.gen(function* () {
            const meta = yield* sessionMetaService.getSessionMeta(projectId, item.id);
            return { ...item, meta };
          }),
        ),
        { concurrency: "unbounded" },
      );

      return { sessions: sessionsWithMeta };
    });

  return {
    getSession,
    getSessions,
  };
});

export type ISessionRepository = InferEffect<typeof LayerImpl>;

export class SessionRepository extends Context.Tag("SessionRepository")<
  SessionRepository,
  ISessionRepository
>() {
  static Live = Layer.effect(this, LayerImpl);
}
