import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { z } from "zod";
import type { UserMessageInput } from "../../core/claude-code/functions/createMessageGenerator";
import { BlackboxCliController } from "../../core/blackbox-cli/presentation/BlackboxCliController";
import { BlackboxCliLifeCycleService } from "../../core/blackbox-cli/services/BlackboxCliLifeCycleService";
import { BlackboxCliPermissionService } from "../../core/blackbox-cli/services/BlackboxCliPermissionService";
import * as BBSessionProcess from "../../core/blackbox-cli/models/BBSessionProcess";
import { effectToResponse } from "../../lib/effect/toEffectResponse";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

const userMessageInputSchema = z.object({
  text: z.string(),
  images: z
    .array(
      z.object({
        type: z.literal("image"),
        source: z.object({
          type: z.literal("base64"),
          media_type: z.string(),
          data: z.string(),
        }),
      }),
    )
    .optional(),
  documents: z
    .array(
      z.object({
        type: z.literal("document"),
        source: z.union([
          z.object({
            type: z.literal("text"),
            media_type: z.string(),
            data: z.string(),
          }),
          z.object({
            type: z.literal("base64"),
            media_type: z.string(),
            data: z.string(),
          }),
        ]),
      }),
    )
    .optional(),
});

const bbOptionsSchema = z.object({
  model: z.string().optional(),
  maxTurns: z.number().optional(),
  maxThinkingTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
});

const normalizeUserMessageInput = (
  input: z.infer<typeof userMessageInputSchema>,
): UserMessageInput => {
  const images = input.images?.map((image) => ({
    type: image.type,
    source: image.source,
  }));
  const documents = input.documents?.map((document) => {
    if (!document.source) {
      throw new Error("Document source is required");
    }

    return {
      type: document.type,
      source: document.source,
    };
  });

  return {
    text: input.text,
    images,
    documents,
  };
};

const getSessionId = (p: BBSessionProcess.BBSessionProcessState): string | undefined => {
  if (p.type === "not_initialized") return undefined;
  return p.sessionId;
};

const blackboxCliRoutes = Effect.gen(function* () {
  const blackboxCliController = yield* BlackboxCliController;
  const blackboxCliLifeCycleService = yield* BlackboxCliLifeCycleService;
  const blackboxCliPermissionService = yield* BlackboxCliPermissionService;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>()
    .get("/meta", async (c) => {
      const response = await effectToResponse(
        c,
        blackboxCliController.getBlackboxCliMeta().pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .get("/features", async (c) => {
      const response = await effectToResponse(
        c,
        blackboxCliController
          .getAvailableFeatures()
          .pipe(Effect.provide(runtime)),
      );
      return response;
    })
    .get("/session-processes", async (c) => {
      const processes = await Effect.runPromise(
        blackboxCliLifeCycleService.getPublicSessionProcesses().pipe(Effect.provide(runtime)),
      );
      return c.json({
        processes: processes.map((p) => ({
          id: p.def.sessionProcessId,
          projectId: p.def.projectId,
          sessionId: getSessionId(p),
          status: p.type === "paused" ? "paused" : "running",
        })),
      });
    })
    .post(
      "/session-processes",
      zValidator(
        "json",
        z.object({
          projectId: z.string(),
          input: userMessageInputSchema,
          baseSession: z.union([
            z.undefined(),
            z.object({
              type: z.literal("fork"),
              sessionId: z.string(),
            }),
            z.object({
              type: z.literal("resume"),
              sessionId: z.string(),
            }),
          ]),
          bbOptions: bbOptionsSchema.optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const input = normalizeUserMessageInput(body.input);
        const { baseSession, ...rest } = body;

        const result = await Effect.runPromise(
          blackboxCliLifeCycleService.startSessionProcess({
            ...rest,
            input,
            baseSession: baseSession ?? undefined,
            userConfig: {
              hideNoUserMessageSession: true,
              unifySameTitleSession: false,
              enterKeyBehavior: "enter-send",
              permissionMode: "default",
              locale: "en",
              theme: "system",
              searchHotkey: "command-k",
              autoScheduleContinueOnRateLimit: true,
            },
          }).pipe(Effect.provide(runtime)),
        );

        const sessionId = (await result.awaitSessionInitialized()).sessionId;

        // Return format expected by frontend
        return c.json({
          sessionProcess: {
            id: result.sessionProcess.def.sessionProcessId,
            projectId: result.sessionProcess.def.projectId,
            sessionId,
            status: "running",
          },
          sessionId,
        });
      },
    )
    .post(
      "/session-processes/:sessionProcessId/continue",
      zValidator(
        "json",
        z.object({
          projectId: z.string(),
          input: userMessageInputSchema,
          baseSessionId: z.string(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const input = normalizeUserMessageInput(body.input);

        const result = await Effect.runPromise(
          blackboxCliLifeCycleService.continueSessionProcess({
            ...c.req.param(),
            ...body,
            input,
          }).pipe(Effect.provide(runtime)),
        );

        return c.json({
          sessionProcess: {
            id: result.sessionProcess.def.sessionProcessId,
            projectId: result.sessionProcess.def.projectId,
            sessionId: body.baseSessionId,
            status: "running",
          },
        });
      },
    )
    .post(
      "/session-processes/:sessionProcessId/abort",
      zValidator("json", z.object({ projectId: z.string() })),
      async (c) => {
        const { sessionProcessId } = c.req.param();
        void Effect.runFork(
          blackboxCliLifeCycleService.abortTask(sessionProcessId).pipe(Effect.provide(runtime)),
        );
        return c.json({ message: "Task aborted" });
      },
    )
    .post(
      "/permission-response",
      zValidator(
        "json",
        z.object({
          permissionRequestId: z.string(),
          decision: z.enum(["allow", "deny"]),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        await Effect.runPromise(
          blackboxCliPermissionService.respondToPermissionRequest({
            permissionRequestId: body.permissionRequestId,
            decision: body.decision,
          }).pipe(Effect.provide(runtime)),
        );
        return c.json({ message: "Permission response recorded" });
      },
    );
});

export { blackboxCliRoutes };
