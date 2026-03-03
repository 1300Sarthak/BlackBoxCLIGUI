import { Context, Data, Effect, Layer, Ref } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";
import * as BBSessionProcess from "../models/BBSessionProcess";
import type { BBTurnState, RunningBBTurnState, PendingBBTurnState } from "../models/BBTurn";
import type { NewBBTurnDef, ResumeBBTurnDef, ForkBBTurnDef, ContinueBBTurnDef, BBTurnDef } from "../models/BBTurn";

class SessionProcessNotFoundError extends Data.TaggedError(
  "SessionProcessNotFoundError",
)<{
  sessionProcessId: string;
}> {}

class SessionProcessNotPausedError extends Data.TaggedError(
  "SessionProcessNotPausedError",
)<{
  sessionProcessId: string;
}> {}

class SessionProcessAlreadyAliveError extends Data.TaggedError(
  "SessionProcessAlreadyAliveError",
)<{
  sessionProcessId: string;
  aliveTaskId: string;
  aliveTaskSessionId?: string;
}> {}

class IllegalStateChangeError extends Data.TaggedError(
  "IllegalStateChangeError",
)<{
  from: BBSessionProcess.BBSessionProcessState["type"];
  to: BBSessionProcess.BBSessionProcessState["type"];
}> {}

class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
  turnId: string;
}> {}

const LayerImpl = Effect.gen(function* () {
  const processesRef = yield* Ref.make<BBSessionProcess.BBSessionProcessState[]>(
    [],
  );
  const eventBus = yield* EventBus;

  const startSessionProcess = (options: {
    sessionDef: BBSessionProcess.BBSessionProcessDef;
    turnDef: NewBBTurnDef | ResumeBBTurnDef | ForkBBTurnDef;
  }) => {
    const { sessionDef, turnDef } = options;

    return Effect.gen(function* () {
      const task: PendingBBTurnState = {
        def: turnDef,
        status: "pending",
      };

      const newProcess: BBSessionProcess.BBSessionProcessPendingState = {
        def: sessionDef,
        type: "pending",
        tasks: [task],
        currentTask: task,
      };

      yield* Ref.update(processesRef, (processes) => [
        ...processes,
        newProcess,
      ]);
      return {
        sessionProcess: newProcess,
        task,
      };
    });
  };

  const continueSessionProcess = (options: {
    sessionProcessId: string;
    turnDef: ContinueBBTurnDef;
  }) => {
    const { sessionProcessId } = options;

    return Effect.gen(function* () {
      const process = yield* getSessionProcess(sessionProcessId);

      if (process.type !== "paused") {
        return yield* Effect.fail(
          new SessionProcessNotPausedError({
            sessionProcessId,
          }),
        );
      }

      const [firstAliveTask] = BBSessionProcess.getAliveTasks(process);
      if (firstAliveTask !== undefined) {
        return yield* Effect.fail(
          new SessionProcessAlreadyAliveError({
            sessionProcessId,
            aliveTaskId: firstAliveTask.def.turnId,
            aliveTaskSessionId: firstAliveTask.sessionId,
          }),
        );
      }

      const newTask: PendingBBTurnState = {
        def: options.turnDef,
        status: "pending",
      };

      const newProcess: BBSessionProcess.BBSessionProcessPendingState = {
        def: process.def,
        type: "pending",
        tasks: [...process.tasks, newTask],
        currentTask: newTask,
      };

      yield* Ref.update(processesRef, (processes) => {
        return processes.map((p) =>
          p.def.sessionProcessId === sessionProcessId ? newProcess : p,
        );
      });

      return {
        sessionProcess: newProcess,
        task: newTask,
      };
    });
  };

  const getSessionProcess = (sessionProcessId: string) => {
    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const result = processes.find(
        (p) => p.def.sessionProcessId === sessionProcessId,
      );
      if (result === undefined) {
        return yield* Effect.fail(
          new SessionProcessNotFoundError({ sessionProcessId }),
        );
      }
      return result;
    });
  };

  const getSessionProcesses = () => {
    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      return processes;
    });
  };

  const getTask = (turnId: string) => {
    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const result = processes
        .flatMap((p) => {
          const found = p.tasks.find((t) => t.def.turnId === turnId);
          if (found === undefined) {
            return [];
          }

          return [
            {
              sessionProcess: p,
              task: found,
            },
          ];
        })
        .at(0);

      if (result === undefined) {
        return yield* Effect.fail(new TaskNotFoundError({ turnId }));
      }

      return result;
    });
  };

  const dangerouslyChangeProcessState = <
    T extends BBSessionProcess.BBSessionProcessState,
  >(options: {
    sessionProcessId: string;
    nextState: T;
  }) => {
    const { sessionProcessId, nextState } = options;

    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const targetProcess = processes.find(
        (p) => p.def.sessionProcessId === sessionProcessId,
      );
      const currentStatus = targetProcess?.type;

      const updatedProcesses = processes.map((p) =>
        p.def.sessionProcessId === sessionProcessId ? nextState : p,
      );

      yield* Ref.set(processesRef, updatedProcesses);

      if (currentStatus !== nextState.type) {
        const publicProcesses = updatedProcesses
          .filter(BBSessionProcess.isPublic);
        
        yield* eventBus.emit("sessionProcessChanged", {
          processes: publicProcesses.map((process) => ({
            id: process.def.sessionProcessId,
            projectId: process.def.projectId,
            sessionId: process.sessionId,
            status: process.type === "paused" ? "paused" : "running",
          })),
          changed: nextState,
        });
      }

      console.log(
        `sessionProcessStateChanged(${sessionProcessId}): ${targetProcess?.type} -> ${nextState.type}`,
      );

      return nextState;
    });
  };

  const changeTurnState = <T extends BBTurnState>(options: {
    sessionProcessId: string;
    turnId: string;
    nextTask: T;
  }) => {
    const { sessionProcessId, turnId, nextTask } = options;

    return Effect.gen(function* () {
      const { task } = yield* getTask(turnId);

      yield* Ref.update(processesRef, (processes) => {
        return processes.map((p) =>
          p.def.sessionProcessId === sessionProcessId
            ? {
                ...p,
                tasks: p.tasks.map((t) =>
                  t.def.turnId === task.def.turnId ? { ...nextTask } : t,
                ),
              }
            : p,
        );
      });

      const updated = yield* getTask(turnId);
      if (updated === undefined) {
        throw new Error("Unreachable: updatedProcess is undefined");
      }

      return updated.task as T;
    });
  };

  const toNotInitializedState = (options: {
    sessionProcessId: string;
    rawUserMessage: string;
  }) => {
    const { sessionProcessId, rawUserMessage } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);

      if (currentProcess.type !== "pending") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "not_initialized",
          }),
        );
      }

      const newTask = yield* changeTurnState({
        sessionProcessId,
        turnId: currentProcess.currentTask.def.turnId,
        nextTask: {
          status: "running",
          def: currentProcess.currentTask.def,
        },
      });

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "not_initialized",
          def: currentProcess.def,
          tasks: currentProcess.tasks,
          currentTask: newTask,
          rawUserMessage,
        },
      });

      return {
        sessionProcess: newProcess,
        task: newTask,
      };
    });
  };

  const toInitializedState = (options: {
    sessionProcessId: string;
    initContext: { initMessage: { session_id: string } };
  }) => {
    const { sessionProcessId, initContext } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);
      if (currentProcess.type !== "not_initialized") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "initialized",
          }),
        );
      }

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "initialized",
          def: currentProcess.def,
          tasks: currentProcess.tasks,
          currentTask: currentProcess.currentTask as RunningBBTurnState,
          sessionId: initContext.initMessage.session_id,
          rawUserMessage: currentProcess.rawUserMessage,
          initContext: initContext,
        },
      });

      return {
        sessionProcess: newProcess,
      };
    });
  };

  const toFileCreatedState = (options: { sessionProcessId: string }) => {
    const { sessionProcessId } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);

      if (currentProcess.type !== "initialized") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "file_created",
          }),
        );
      }

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "file_created",
          def: currentProcess.def,
          tasks: currentProcess.tasks,
          currentTask: currentProcess.currentTask,
          sessionId: currentProcess.sessionId,
          rawUserMessage: currentProcess.rawUserMessage,
          initContext: currentProcess.initContext,
        },
      });

      return {
        sessionProcess: newProcess,
      };
    });
  };

  const toPausedState = (options: {
    sessionProcessId: string;
    resultMessage: { session_id: string };
  }) => {
    const { sessionProcessId, resultMessage } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);
      if (
        currentProcess.type !== "file_created" &&
        currentProcess.type !== "initialized"
      ) {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "paused",
          }),
        );
      }

      const newTask = yield* changeTurnState({
        sessionProcessId,
        turnId: currentProcess.currentTask.def.turnId,
        nextTask: {
          status: "completed",
          def: currentProcess.currentTask.def,
          sessionId: resultMessage.session_id,
        },
      });

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "paused",
          def: currentProcess.def,
          tasks: currentProcess.tasks.map((t) =>
            t.def.turnId === newTask.def.turnId ? newTask : t,
          ),
          sessionId: currentProcess.sessionId,
        },
      });

      return {
        sessionProcess: newProcess,
      };
    });
  };

  const toCompletedState = (options: {
    sessionProcessId: string;
    error?: unknown;
  }) => {
    const { sessionProcessId, error } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);

      const currentTask =
        currentProcess.type === "not_initialized" ||
        currentProcess.type === "initialized" ||
        currentProcess.type === "file_created"
          ? currentProcess.currentTask
          : undefined;

      const sessionId = 
        currentProcess.type === "not_initialized" ? undefined :
        currentProcess.type === "initialized" ? currentProcess.sessionId :
        currentProcess.type === "file_created" ? currentProcess.sessionId :
        currentProcess.type === "paused" ? currentProcess.sessionId :
        currentProcess.type === "completed" ? currentProcess.sessionId :
        undefined;

      const newTask =
        currentTask !== undefined
          ? error !== undefined
            ? ({
                status: "failed",
                def: currentTask.def,
                error,
              } as const)
            : ({
                status: "completed",
                def: currentTask.def,
                sessionId,
              } as const)
          : undefined;

      if (newTask !== undefined) {
        yield* changeTurnState({
          sessionProcessId,
          turnId: newTask.def.turnId,
          nextTask: newTask,
        });
      }

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "completed",
          def: currentProcess.def,
          tasks:
            newTask !== undefined
              ? currentProcess.tasks.map((t) =>
                  t.def.turnId === newTask.def.turnId ? newTask : t,
                )
              : currentProcess.tasks,
          sessionId: sessionId ?? "",
        },
      });

      return {
        sessionProcess: newProcess,
        task: newTask,
      };
    });
  };

  return {
    startSessionProcess,
    continueSessionProcess,
    toNotInitializedState,
    toInitializedState,
    toFileCreatedState,
    toPausedState,
    toCompletedState,
    dangerouslyChangeProcessState,
    getSessionProcesses,
    getSessionProcess,
    getTask,
    changeTurnState,
  };
});

export type IBlackboxCliSessionProcessService = InferEffect<typeof LayerImpl>;

export class BlackboxCliSessionProcessService extends Context.Tag(
  "BlackboxCliSessionProcessService",
)<BlackboxCliSessionProcessService, IBlackboxCliSessionProcessService>() {
  static Live = Layer.effect(this, LayerImpl);
}
