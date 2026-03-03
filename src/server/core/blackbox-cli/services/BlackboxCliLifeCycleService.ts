import type { Path } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import { Context, Effect, Layer } from "effect";
import { ulid } from "ulid";
import { controllablePromise } from "../../../../lib/controllablePromise";
import type { UserConfig } from "../../../lib/config/config";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";
import type { BbcvOptionsService } from "../../platform/services/BbcvOptionsService";
import type { EnvService } from "../../platform/services/EnvService";
import { VirtualConversationDatabase } from "../../session/infrastructure/VirtualConversationDatabase";
import type { SessionMetaService } from "../../session/services/SessionMetaService";
import type { UserMessageInput } from "../../claude-code/functions/createMessageGenerator";
import { BlackboxCliPermissionService } from "./BlackboxCliPermissionService";
import { BlackboxCliSessionProcessService } from "./BlackboxCliSessionProcessService";
import * as BBSessionProcess from "../models/BBSessionProcess";
import type { BBOptions } from "../models/BBTurn";

export type MessageGenerator = () => AsyncGenerator<
  { type: string; content: string },
  void,
  unknown
>;

const LayerImpl = Effect.gen(function* () {
  const eventBusService = yield* EventBus;
  const sessionProcessService = yield* BlackboxCliSessionProcessService;
  const virtualConversationDatabase = yield* VirtualConversationDatabase;
  yield* BlackboxCliPermissionService;

  yield* Effect.runtime<
    | Path.Path
    | CommandExecutor
    | VirtualConversationDatabase
    | SessionMetaService
    | BlackboxCliPermissionService
    | EnvService
    | BbcvOptionsService
  >();

  const continueSessionProcess = (options: {
    sessionProcessId: string;
    baseSessionId: string;
    input: UserMessageInput;
  }) => {
    const { sessionProcessId, baseSessionId, input } = options;

    return Effect.gen(function* () {
      const { sessionProcess, task } =
        yield* sessionProcessService.continueSessionProcess({
          sessionProcessId,
          turnDef: {
            type: "continue",
            sessionId: baseSessionId,
            baseSessionId: baseSessionId,
            turnId: ulid(),
          },
        });

      const virtualConversation = BBSessionProcess.createVirtualConversation(sessionProcess, {
        sessionId: baseSessionId,
        userMessage: input.text,
      });

      yield* virtualConversationDatabase.createVirtualConversation(
        sessionProcess.def.projectId,
        baseSessionId,
        [virtualConversation],
      );

      yield* eventBusService.emit("virtualConversationUpdated", {
        projectId: sessionProcess.def.projectId,
        sessionId: baseSessionId,
      });

      sessionProcess.def.setNextMessage(input);
      return {
        sessionProcess,
        task,
      };
    });
  };

  const startSessionProcess = (options: {
    projectId: string;
    cwd: string;
    input: UserMessageInput;
    userConfig: UserConfig;
    baseSession:
      | undefined
      | {
          type: "fork";
          sessionId: string;
        }
      | {
          type: "resume";
          sessionId: string;
        };
    bbOptions?: BBOptions;
  }) => {
    const { projectId, cwd, input, baseSession, bbOptions } = options;

    return Effect.gen(function* () {
      const sessionInitializedPromise = controllablePromise<{
        sessionId: string;
      }>();
      const sessionFileCreatedPromise = controllablePromise<{
        sessionId: string;
      }>();

      // For now, create a simple stub implementation
      // The actual Blackbox CLI integration would spawn a child process
      // and communicate with it via stdio

      const setNextMessage = (msg: UserMessageInput) => {
        console.log("Setting next message:", msg.text);
      };

      const { sessionProcess, task } =
        yield* sessionProcessService.startSessionProcess({
          sessionDef: {
            projectId,
            cwd,
            abortController: new AbortController(),
            setNextMessage,
            sessionProcessId: ulid(),
          },
          turnDef:
            baseSession === undefined
              ? {
                  type: "new",
                  turnId: ulid(),
                  bbOptions,
                }
              : baseSession.type === "fork"
                ? {
                    type: "fork",
                    turnId: ulid(),
                    sessionId: baseSession.sessionId,
                    baseSessionId: baseSession.sessionId,
                    bbOptions,
                  }
                : {
                    type: "resume",
                    turnId: ulid(),
                    sessionId: undefined,
                    baseSessionId: baseSession.sessionId,
                    bbOptions,
                  },
        });

      // Notify frontend that session was created
      const sessionId = ulid();
      sessionInitializedPromise.resolve({ sessionId });
      sessionFileCreatedPromise.resolve({ sessionId });

      // Create virtual conversation for the new session
      const virtualConversation = BBSessionProcess.createVirtualConversation(sessionProcess, {
        sessionId,
        userMessage: input.text,
      });

      yield* virtualConversationDatabase.createVirtualConversation(
        projectId,
        sessionId,
        [virtualConversation],
      );

      yield* eventBusService.emit("sessionListChanged", {
        projectId: sessionProcess.def.projectId,
      });

      yield* eventBusService.emit("sessionChanged", {
        projectId: sessionProcess.def.projectId,
        sessionId,
      });

      return {
        sessionProcess,
        task,
        daemonPromise: Promise.resolve(),
        awaitSessionInitialized: async () =>
          await sessionInitializedPromise.promise,
        awaitSessionFileCreated: async () =>
          await sessionFileCreatedPromise.promise,
        yieldSessionInitialized: () =>
          Effect.promise(() => sessionInitializedPromise.promise),
        yieldSessionFileCreated: () =>
          Effect.promise(() => sessionFileCreatedPromise.promise),
      };
    });
  };

  const getPublicSessionProcesses = () =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();
      return processes.filter((process) => BBSessionProcess.isPublic(process));
    });

  const abortTask = (sessionProcessId: string): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const currentProcess =
        yield* sessionProcessService.getSessionProcess(sessionProcessId);

      currentProcess.def.abortController.abort();

      yield* sessionProcessService.toCompletedState({
        sessionProcessId: currentProcess.def.sessionProcessId,
        error: new Error("Task aborted"),
      });
    });

  const abortAllTasks = () =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();

      for (const process of processes) {
        yield* sessionProcessService.toCompletedState({
          sessionProcessId: process.def.sessionProcessId,
          error: new Error("Task aborted"),
        });
      }
    });

  return {
    continueSessionProcess,
    startSessionProcess,
    abortTask,
    abortAllTasks,
    getPublicSessionProcesses,
  };
});

export type IBlackboxCliLifeCycleService = InferEffect<typeof LayerImpl>;

export class BlackboxCliLifeCycleService extends Context.Tag(
  "BlackboxCliLifeCycleService",
)<BlackboxCliLifeCycleService, IBlackboxCliLifeCycleService>() {
  static Live = Layer.effect(this, LayerImpl);
}
