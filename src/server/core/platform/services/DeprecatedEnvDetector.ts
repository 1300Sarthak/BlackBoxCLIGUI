import { Console, Effect } from "effect";

type DeprecationWarning = {
  type: "removed" | "deprecated";
  envKey: string;
  message: string;
  suggestion: string;
};

type DeprecatedEnvConfig = {
  type: "removed" | "deprecated";
  newEnv: string | null;
  cliOption: string;
};

const DEPRECATED_ENVS: Record<string, DeprecatedEnvConfig> = {
  // Removed in adaptation to Blackbox
  CLAUDE_CODE_VIEWER_AUTH_PASSWORD: {
    type: "removed",
    newEnv: "BBCV_PASSWORD",
    cliOption: "--password",
  },
  CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH: {
    type: "removed",
    newEnv: "BBCV_BB_EXECUTABLE_PATH",
    cliOption: "--executable",
  },
  CCV_PASSWORD: {
    type: "removed",
    newEnv: "BBCV_PASSWORD",
    cliOption: "--password",
  },
  CCV_CC_EXECUTABLE_PATH: {
    type: "removed",
    newEnv: "BBCV_BB_EXECUTABLE_PATH",
    cliOption: "--executable",
  },
  CCV_GLOBAL_CLAUDE_DIR: {
    type: "removed",
    newEnv: "BBCV_GLOBAL_BLACKBOX_DIR",
    cliOption: "--blackbox-dir",
  },
  CCV_TERMINAL_DISABLED: {
    type: "removed",
    newEnv: "BBCV_TERMINAL_DISABLED",
    cliOption: "--terminal-disabled",
  },
  CCV_TERMINAL_SHELL: {
    type: "removed",
    newEnv: "BBCV_TERMINAL_SHELL",
    cliOption: "--terminal-shell",
  },
  CCV_TERMINAL_UNRESTRICTED: {
    type: "removed",
    newEnv: "BBCV_TERMINAL_UNRESTRICTED",
    cliOption: "--terminal-unrestricted",
  },
  CCV_API_ONLY: {
    type: "removed",
    newEnv: "BBCV_API_ONLY",
    cliOption: "--api-only",
  },
};

const getOptionalEnv = (key: string): string | undefined => {
  // biome-ignore lint/style/noProcessEnv: allow only here
  return process.env[key] ?? undefined;
};

const detectDeprecatedEnvs = (): DeprecationWarning[] => {
  const warnings: DeprecationWarning[] = [];

  for (const [envKey, config] of Object.entries(DEPRECATED_ENVS)) {
    const value = getOptionalEnv(envKey);
    if (value !== undefined) {
      if (config.type === "removed") {
        warnings.push({
          type: "removed",
          envKey,
          message: `Environment variable ${envKey} has been removed.`,
          suggestion: config.newEnv
            ? `Please use ${config.newEnv} environment variable or ${config.cliOption} CLI option instead.`
            : `Please use ${config.cliOption} CLI option instead.`,
        });
      } else {
        warnings.push({
          type: "deprecated",
          envKey,
          message: `Environment variable ${envKey} is deprecated and will be removed in a future release.`,
          suggestion: config.newEnv
            ? `Please migrate to ${config.newEnv} environment variable or ${config.cliOption} CLI option.`
            : `Please use ${config.cliOption} CLI option instead.`,
        });
      }
    }
  }

  return warnings;
};

const formatWarning = (warning: DeprecationWarning): string => {
  const prefix = warning.type === "removed" ? "❌ REMOVED" : "⚠️  DEPRECATED";
  return `${prefix}: ${warning.message}
   → ${warning.suggestion}`;
};

export const checkDeprecatedEnvs = Effect.gen(function* () {
  const warnings = detectDeprecatedEnvs();

  if (warnings.length === 0) {
    return;
  }

  const hasRemovedEnvs = warnings.some((warning) => warning.type === "removed");

  yield* Console.log("");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  yield* Console.log("  Migration Guide");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  yield* Console.log("");

  for (const warning of warnings) {
    yield* Console.log(formatWarning(warning));
    yield* Console.log("");
  }

  yield* Console.log("For more details, see:");
  yield* Console.log(
    "  https://github.com/sarthak/blackbox-cli-viewer#configuration",
  );
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  yield* Console.log("");

  if (hasRemovedEnvs) {
    yield* Effect.fail(
      new Error(
        "Cannot start server: removed environment variables detected. Please update your configuration.",
      ),
    );
  }
});
