import { resolve } from "node:path";
import { Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { DEFAULT_LOCALE } from "../../lib/i18n/localeDetection";
import { EventBus } from "../../server/core/events/services/EventBus";
import type { EnvSchema } from "../../server/core/platform/schema";
import {
  ApplicationContext,
  type BlackboxCliPaths,
} from "../../server/core/platform/services/ApplicationContext";
import {
  type BbcvOptions,
  BbcvOptionsService,
} from "../../server/core/platform/services/BbcvOptionsService";
import { EnvService } from "../../server/core/platform/services/EnvService";
import { UserConfigService } from "../../server/core/platform/services/UserConfigService";
import type { UserConfig } from "../../server/lib/config/config";

const claudeDirForTest = resolve(process.cwd(), "mock-global-claude-dir");

export const testPlatformLayer = (overrides?: {
  blackboxCliPaths?: Partial<BlackboxCliPaths>;
  env?: Partial<EnvSchema>;
  userConfig?: Partial<UserConfig>;
  bbcvOptions?: Partial<BbcvOptions>;
}) => {
  const applicationContextLayer = Layer.mock(ApplicationContext, {
    blackboxCliPaths: Effect.succeed({
      globalBlackboxDirectoryPath: resolve(claudeDirForTest),
      blackboxCommandsDirPath: resolve(claudeDirForTest, "commands"),
      blackboxSkillsDirPath: resolve(claudeDirForTest, "skills"),
      blackboxProjectsDirPath: resolve(claudeDirForTest, "projects"),
      ...overrides?.blackboxCliPaths,
    }),
  });

  const bbcvOptionsServiceLayer = Layer.mock(BbcvOptionsService, {
    getBbcvOptions: <Key extends keyof BbcvOptions>(key: Key) =>
      Effect.sync((): BbcvOptions[Key] => {
        return overrides?.bbcvOptions?.[key] as BbcvOptions[Key];
      }),
  });

  const envServiceLayer = Layer.mock(EnvService, {
    getEnv: <Key extends keyof EnvSchema>(key: Key) =>
      Effect.sync(() => {
        switch (key) {
          case "BBCV_ENV":
            return overrides?.env?.BBCV_ENV ?? "development";
          case "NEXT_PHASE":
            return overrides?.env?.NEXT_PHASE ?? "phase-test";
          default:
            return overrides?.env?.[key] ?? undefined;
        }
      }) as Effect.Effect<EnvSchema[Key]>,
  });

  const userConfigServiceLayer = Layer.mock(UserConfigService, {
    setUserConfig: () => Effect.succeed(undefined),
    getUserConfig: () =>
      Effect.succeed<UserConfig>({
        hideNoUserMessageSession:
          overrides?.userConfig?.hideNoUserMessageSession ?? true,
        unifySameTitleSession:
          overrides?.userConfig?.unifySameTitleSession ?? true,
        enterKeyBehavior:
          overrides?.userConfig?.enterKeyBehavior ?? "shift-enter-send",
        permissionMode: overrides?.userConfig?.permissionMode ?? "default",
        locale: overrides?.userConfig?.locale ?? DEFAULT_LOCALE,
        theme: overrides?.userConfig?.theme ?? "system",
        searchHotkey: overrides?.userConfig?.searchHotkey ?? "command-k",
        autoScheduleContinueOnRateLimit:
          overrides?.userConfig?.autoScheduleContinueOnRateLimit ?? false,
      }),
  });

  return Layer.mergeAll(
    applicationContextLayer,
    userConfigServiceLayer,
    EventBus.Live,
    bbcvOptionsServiceLayer,
    envServiceLayer,
    Path.layer,
  );
};
