import { Path } from "@effect/platform";
import { Effect } from "effect";

export const computeClaudeProjectFilePath = (options: {
  projectPath: string;
  blackboxProjectsDirPath: string;
}) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const { projectPath, blackboxProjectsDirPath } = options;

    return path.join(
      blackboxProjectsDirPath,
      projectPath.replace(/\/$/, "").replace(/\//g, "-"),
    );
  });
