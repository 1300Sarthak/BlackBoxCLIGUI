import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import {
  type CommandInfo,
  scanCommandFilesWithMetadata,
  scanSkillFilesWithMetadata,
} from "../../claude-code/functions/scanCommandFiles";
import * as BlackboxCliVersion from "../models/BlackboxCliVersion";
import { BlackboxCliService } from "../services/BlackboxCliService";

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;
  const blackboxCliService = yield* BlackboxCliService;
  const context = yield* ApplicationContext;
  yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const getBlackboxCommands = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;

      const { project } = yield* projectRepository.getProject(projectId);
      const features = yield* blackboxCliService.getAvailableFeatures();

      const globalCommands: CommandInfo[] = yield* scanCommandFilesWithMetadata(
        (yield* context.blackboxCliPaths).blackboxCommandsDirPath,
      );

      const projectCommands: CommandInfo[] =
        project.meta.projectPath === null
          ? []
          : yield* scanCommandFilesWithMetadata(
              path.resolve(project.meta.projectPath, ".blackbox", "commands"),
            );

      const globalSkills: CommandInfo[] = features.runSkillsDirectly
        ? yield* scanSkillFilesWithMetadata(
            (yield* context.blackboxCliPaths).blackboxSkillsDirPath,
          )
        : [];

      const projectSkills: CommandInfo[] =
        features.runSkillsDirectly && project.meta.projectPath !== null
          ? yield* scanSkillFilesWithMetadata(
              path.resolve(project.meta.projectPath, ".blackbox", "skills"),
            )
          : [];

      const defaultCommands: CommandInfo[] = [
        {
          name: "init",
          description: "Initialize Blackbox AI CLI in current project",
          argumentHint: null,
        },
        {
          name: "compact",
          description: "Compact conversation history",
          argumentHint: null,
        },
        {
          name: "security-review",
          description: "Review code for security issues",
          argumentHint: null,
        },
        {
          name: "review",
          description: "Review code changes",
          argumentHint: null,
        },
      ];

      const toNames = (commands: CommandInfo[]) => commands.map((c) => c.name);

      return {
        response: {
          globalCommands,
          projectCommands,
          globalSkills,
          projectSkills,
          defaultCommands,
          globalCommandsLegacy: toNames(globalCommands),
          projectCommandsLegacy: toNames(projectCommands),
          globalSkillsLegacy: toNames(globalSkills),
          projectSkillsLegacy: toNames(projectSkills),
          defaultCommandsLegacy: toNames(defaultCommands),
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getMcpListRoute = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;
      // Blackbox CLI doesn't have MCP in the same way, return empty for now
      return {
        response: { servers: [] },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getBlackboxCliMeta = () =>
    Effect.gen(function* () {
      const config = yield* blackboxCliService.getBlackboxCliMeta();
      return {
        response: {
          executablePath: config.blackboxCliExecutablePath,
          version: config.blackboxCliVersion
            ? BlackboxCliVersion.versionText(config.blackboxCliVersion)
            : null,
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getAvailableFeatures = () =>
    Effect.gen(function* () {
      const features = yield* blackboxCliService.getAvailableFeatures();
      const featuresList = Object.entries(features).flatMap(([key, value]) => {
        return [
          {
            name: key as keyof typeof features,
            enabled: value,
          },
        ];
      });

      return {
        response: { features: featuresList },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getBlackboxCommands,
    getMcpListRoute,
    getBlackboxCliMeta,
    getAvailableFeatures,
  };
});

export type IBlackboxCliController = InferEffect<typeof LayerImpl>;
export class BlackboxCliController extends Context.Tag("BlackboxCliController")<
  BlackboxCliController,
  IBlackboxCliController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
