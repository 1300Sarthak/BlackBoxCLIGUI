import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Option } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import type { Project } from "../../types";
import { decodeProjectId, encodeProjectId } from "../functions/id";
import { ProjectMetaService } from "../services/ProjectMetaService";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const projectMetaService = yield* ProjectMetaService;
  const context = yield* ApplicationContext;

  const getProject = (projectId: string) =>
    Effect.gen(function* () {
      const fullPath = decodeProjectId(projectId);

      // Check if project directory exists
      const exists = yield* fs.exists(fullPath);
      if (!exists) {
        return yield* Effect.fail(new Error("Project not found"));
      }

      // Get file stats
      const stat = yield* fs.stat(fullPath);

      // Get project metadata
      const meta = yield* projectMetaService.getProjectMeta(projectId);

      return {
        project: {
          id: projectId,
          claudeProjectPath: fullPath,
          lastModifiedAt: Option.getOrElse(stat.mtime, () => new Date()),
          meta,
        },
      };
    });

  const getProjects = () =>
    Effect.gen(function* () {
      const blackboxTmpPath = path.join(
        (yield* context.blackboxCliPaths).globalBlackboxDirectoryPath,
        "tmp"
      );

      // Check if the blackbox tmp directory exists
      const dirExists = yield* fs.exists(blackboxTmpPath);
      if (!dirExists) {
        console.warn(
          `Blackbox tmp directory not found at ${blackboxTmpPath}`,
        );
        return { projects: [] };
      }

      // Read directory entries (each hash directory is a project)
      const entries = yield* fs.readDirectory(blackboxTmpPath);

      // Filter directories and map to Project objects
      const projectEffects = entries.map((entry) =>
        Effect.gen(function* () {
          const fullPath = path.resolve(blackboxTmpPath, entry);

          // Check if it's a directory
          const stat = yield* Effect.tryPromise(() =>
            fs.stat(fullPath).pipe(Effect.runPromise),
          ).pipe(Effect.catchAll(() => Effect.succeed(null)));

          if (!stat || stat.type !== "Directory") {
            return null;
          }

          // Check if logs.json exists (valid Blackbox session directory)
          const logsPath = path.join(fullPath, "logs.json");
          const logsExists = yield* fs.exists(logsPath);
          if (!logsExists) {
            return null;
          }

          const id = encodeProjectId(fullPath);
          const meta = yield* projectMetaService.getProjectMeta(id);

          return {
            id,
            claudeProjectPath: fullPath,
            lastModifiedAt: Option.getOrElse(stat.mtime, () => new Date()),
            meta,
          } satisfies Project;
        }),
      );

      // Execute all effects in parallel and filter out nulls
      const projectsWithNulls = yield* Effect.all(projectEffects, {
        concurrency: "unbounded",
      });
      const projects = projectsWithNulls.filter(
        (p): p is Project => p !== null,
      );

      // Sort by last modified date (newest first)
      const sortedProjects = projects.sort((a, b) => {
        return (
          (b.lastModifiedAt ? b.lastModifiedAt.getTime() : 0) -
          (a.lastModifiedAt ? a.lastModifiedAt.getTime() : 0)
        );
      });

      return { projects: sortedProjects };
    });

  return {
    getProject,
    getProjects,
  };
});

export type IProjectRepository = InferEffect<typeof LayerImpl>;
export class ProjectRepository extends Context.Tag("ProjectRepository")<
  ProjectRepository,
  IProjectRepository
>() {
  static Live = Layer.effect(this, LayerImpl);
}
