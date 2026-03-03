import { Context, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import * as BlackboxCli from "../models/BlackboxCli";

const LayerImpl = Effect.gen(function* () {
  const getBlackboxCliMeta = () =>
    Effect.gen(function* () {
      const config = yield* BlackboxCli.Config;
      return config;
    });

  const getAvailableFeatures = () =>
    Effect.gen(function* () {
      const config = yield* BlackboxCli.Config;
      const features = BlackboxCli.getAvailableFeatures(
        config.blackboxCliVersion,
      );
      return features;
    });

  return {
    getBlackboxCliMeta,
    getAvailableFeatures,
  };
});

export type IBlackboxCliService = InferEffect<typeof LayerImpl>;

export class BlackboxCliService extends Context.Tag("BlackboxCliService")<
  BlackboxCliService,
  IBlackboxCliService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
