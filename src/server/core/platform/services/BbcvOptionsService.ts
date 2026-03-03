import { Context, Effect, Layer, Ref } from "effect";
import type { InferEffect } from "../../../lib/effect/types";

export type CliOptions = {
  port: string;
  hostname: string;
  password?: string | undefined;
  executable?: string | undefined;
  blackboxDir?: string | undefined;
  terminalDisabled?: boolean | undefined;
  terminalShell?: string | undefined;
  terminalUnrestricted?: boolean | undefined;
  apiOnly?: boolean | undefined;
};

export type BbcvOptions = {
  port: number;
  hostname: string;
  password?: string | undefined;
  executable?: string | undefined;
  blackboxDir?: string | undefined;
  terminalDisabled?: boolean | undefined;
  terminalShell?: string | undefined;
  terminalUnrestricted?: boolean | undefined;
  apiOnly?: boolean | undefined;
};

const getOptionalEnv = (key: string): string | undefined => {
  // biome-ignore lint/style/noProcessEnv: allow only here
  return process.env[key] ?? undefined;
};

const isFlagEnabled = (value: string | undefined) => {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
};

const LayerImpl = Effect.gen(function* () {
  const bbcvOptionsRef = yield* Ref.make<BbcvOptions | undefined>(undefined);

  const loadCliOptions = (cliOptions: CliOptions) => {
    return Effect.gen(function* () {
      yield* Ref.update(bbcvOptionsRef, () => {
        return {
          port: Number.parseInt(
            cliOptions.port ?? getOptionalEnv("PORT") ?? "3000",
            10,
          ),
          hostname:
            cliOptions.hostname ?? getOptionalEnv("HOSTNAME") ?? "localhost",
          password:
            cliOptions.password ?? getOptionalEnv("BBCV_PASSWORD") ?? undefined,
          executable:
            cliOptions.executable ??
            getOptionalEnv("BBCV_BB_EXECUTABLE_PATH") ??
            undefined,
          blackboxDir:
            cliOptions.blackboxDir ?? getOptionalEnv("BBCV_GLOBAL_BLACKBOX_DIR"),
          terminalDisabled:
            cliOptions.terminalDisabled ??
            (isFlagEnabled(getOptionalEnv("BBCV_TERMINAL_DISABLED"))
              ? true
              : undefined),
          terminalShell:
            cliOptions.terminalShell ??
            getOptionalEnv("BBCV_TERMINAL_SHELL") ??
            undefined,
          terminalUnrestricted:
            cliOptions.terminalUnrestricted ??
            (isFlagEnabled(getOptionalEnv("BBCV_TERMINAL_UNRESTRICTED"))
              ? true
              : undefined),
          apiOnly:
            cliOptions.apiOnly ??
            (isFlagEnabled(getOptionalEnv("BBCV_API_ONLY")) ? true : undefined),
        };
      });
    });
  };

  const getBbcvOptions = <K extends keyof BbcvOptions>(key: K) => {
    return Effect.gen(function* () {
      const bbcvOptions = yield* Ref.get(bbcvOptionsRef);
      if (bbcvOptions === undefined) {
        throw new Error("Unexpected error: BBCV options are not loaded");
      }
      return bbcvOptions[key];
    });
  };

  return {
    loadCliOptions,
    getBbcvOptions,
  };
});

export type IBbcvOptionsService = InferEffect<typeof LayerImpl>;

export class BbcvOptionsService extends Context.Tag("BbcvOptionsService")<
  BbcvOptionsService,
  IBbcvOptionsService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
