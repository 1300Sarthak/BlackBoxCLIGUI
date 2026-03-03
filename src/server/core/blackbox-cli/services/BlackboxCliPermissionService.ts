import { Context, Effect, Layer, Ref } from "effect";
import { ulid } from "ulid";
import type {
  PermissionRequest,
  PermissionResponse,
} from "../../../../types/permissions";
import type { UserConfig } from "../../../lib/config/config";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";

const LayerImpl = Effect.gen(function* () {
  const pendingPermissionRequestsRef = yield* Ref.make<
    Map<string, PermissionRequest>
  >(new Map());
  const permissionResponsesRef = yield* Ref.make<
    Map<string, PermissionResponse>
  >(new Map());
  const eventBus = yield* EventBus;

  const waitPermissionResponse = (
    request: PermissionRequest,
    options: { timeoutMs: number },
  ) =>
    Effect.gen(function* () {
      yield* Ref.update(pendingPermissionRequestsRef, (requests) => {
        requests.set(request.id, request);
        return requests;
      });

      yield* eventBus.emit("permissionRequested", {
        permissionRequest: request,
      });

      let passedMs = 0;
      let response: PermissionResponse | null = null;
      while (passedMs < options.timeoutMs) {
        const responses = yield* Ref.get(permissionResponsesRef);
        response = responses.get(request.id) ?? null;
        if (response !== null) {
          break;
        }

        yield* Effect.sleep(1000);
        passedMs += 1000;
      }

      return response;
    });

  const createCanUseToolRelatedOptions = (options: {
    turnId: string;
    userConfig: UserConfig;
    sessionId?: string;
  }) => {
    const { turnId, userConfig, sessionId } = options;

    return Effect.gen(function* () {
      // Blackbox CLI has all features available by default
      return {
        permissionMode: userConfig.permissionMode ?? "default",
        canUseTool: async (toolName: string, toolInput: Record<string, unknown>) => {
          if (userConfig.permissionMode !== "default") {
            if (
              userConfig.permissionMode === "bypassPermissions" ||
              userConfig.permissionMode === "acceptEdits"
            ) {
              return {
                behavior: "allow" as const,
                updatedInput: toolInput,
              };
            } else {
              return {
                behavior: "deny" as const,
                message: "Tool execution is disabled in plan mode",
              };
            }
          }

          const permissionRequest: PermissionRequest = {
            id: ulid(),
            turnId,
            sessionId,
            toolName,
            toolInput,
            timestamp: Date.now(),
          };

          const response = await Effect.runPromise(
            waitPermissionResponse(permissionRequest, { timeoutMs: 60000 }),
          );

          if (response === null) {
            return {
              behavior: "deny" as const,
              message: "Permission request timed out",
            };
          }

          if (response.decision === "allow") {
            return {
              behavior: "allow" as const,
              updatedInput: toolInput,
            };
          } else {
            return {
              behavior: "deny" as const,
              message: "Permission denied by user",
            };
          }
        },
      } as const;
    });
  };

  const respondToPermissionRequest = (
    response: PermissionResponse,
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      yield* Ref.update(permissionResponsesRef, (responses) => {
        responses.set(response.permissionRequestId, response);
        return responses;
      });

      yield* Ref.update(pendingPermissionRequestsRef, (requests) => {
        requests.delete(response.permissionRequestId);
        return requests;
      });
    });

  return {
    createCanUseToolRelatedOptions,
    respondToPermissionRequest,
  };
});

export type IBlackboxCliPermissionService = InferEffect<typeof LayerImpl>;

export class BlackboxCliPermissionService extends Context.Tag(
  "BlackboxCliPermissionService",
)<BlackboxCliPermissionService, IBlackboxCliPermissionService>() {
  static Live = Layer.effect(this, LayerImpl);
}
