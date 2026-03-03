import { Command, Path } from "@effect/platform";
import { Data, Effect } from "effect";
import { BbcvOptionsService } from "../../platform/services/BbcvOptionsService";
import * as BlackboxCliVersion from "./BlackboxCliVersion";

class BlackboxCliPathNotFoundError extends Data.TaggedError(
  "BlackboxCliPathNotFoundError",
)<{
  message: string;
}> {}

const resolveBlackboxCliPath = Effect.gen(function* () {
  const path = yield* Path.Path;
  const bbcvOptionsService = yield* BbcvOptionsService;

  // Environment variable (highest priority)
  const specifiedExecutablePath =
    yield* bbcvOptionsService.getBbcvOptions("executable");
  if (specifiedExecutablePath !== undefined) {
    return path.resolve(specifiedExecutablePath);
  }

  // System PATH lookup for 'blackbox' command
  const blackboxPath = yield* Command.string(
    Command.make("which", "blackbox").pipe(Command.runInShell(true)),
  ).pipe(
    Effect.map((output) => output.trim()),
    Effect.catchAll(() => Effect.succeed("")),
  );

  if (blackboxPath === "") {
    return yield* Effect.fail(
      new BlackboxCliPathNotFoundError({
        message: "Blackbox AI CLI not found in PATH",
      }),
    );
  }

  return blackboxPath;
});

export const Config = Effect.gen(function* () {
  const blackboxCliExecutablePath = yield* resolveBlackboxCliPath;

  // Try to get version, but don't fail if version command doesn't work
  const versionOutput = yield* Command.string(
    Command.make(blackboxCliExecutablePath, "--version"),
  ).pipe(
    Effect.catchAll(() => Effect.succeed("unknown")),
  );

  const blackboxCliVersion = BlackboxCliVersion.fromCLIString(versionOutput);

  return {
    blackboxCliExecutablePath,
    blackboxCliVersion,
  };
});

export const getAvailableFeatures = (
  _blackboxCliVersion: BlackboxCliVersion.BlackboxCliVersion | null,
) => ({
  // All features are available in Blackbox CLI by default
  canUseTool: true,
  uuidOnSDKMessage: true,
  agentSdk: false, // Blackbox doesn't use the same SDK
  sidechainSeparation: false, // Not applicable to Blackbox
  runSkillsDirectly: true,
});
