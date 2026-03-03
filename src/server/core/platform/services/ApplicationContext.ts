import { homedir } from "node:os";
import { Path } from "@effect/platform";
import { Effect, Context as EffectContext, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { BbcvOptionsService } from "./BbcvOptionsService";

export type BlackboxCliPaths = {
  globalBlackboxDirectoryPath: string;
  blackboxCommandsDirPath: string;
  blackboxSkillsDirPath: string;
  blackboxProjectsDirPath: string;
};

const LayerImpl = Effect.gen(function* () {
  const path = yield* Path.Path;
  const bbcvOptionsService = yield* BbcvOptionsService;

  const blackboxCliPaths = Effect.gen(function* () {
    const globalBlackboxDirectoryPath = yield* bbcvOptionsService
      .getBbcvOptions("blackboxDir")
      .pipe(
        Effect.map((envVar) =>
          envVar === undefined
            ? path.resolve(homedir(), ".blackboxcli")
            : path.resolve(envVar),
        ),
      );

    return {
      globalBlackboxDirectoryPath,
      blackboxCommandsDirPath: path.resolve(
        globalBlackboxDirectoryPath,
        "commands",
      ),
      blackboxSkillsDirPath: path.resolve(globalBlackboxDirectoryPath, "skills"),
      blackboxProjectsDirPath: path.resolve(
        globalBlackboxDirectoryPath,
        "projects",
      ),
    } as const satisfies BlackboxCliPaths;
  });

  return {
    blackboxCliPaths,
  };
});

export type IApplicationContext = InferEffect<typeof LayerImpl>;
export class ApplicationContext extends EffectContext.Tag("ApplicationContext")<
  ApplicationContext,
  IApplicationContext
>() {
  static Live = Layer.effect(this, LayerImpl);
}
