import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { BlackboxCliService } from "../../blackbox-cli/services/BlackboxCliService";

const LayerImpl = Effect.gen(function* () {
  const blackboxCliService = yield* BlackboxCliService;

  const getFlags = () =>
    Effect.gen(function* () {
      const features = yield* blackboxCliService.getAvailableFeatures();
      const flags = Object.entries(features).map(([key, value]) => ({
        name: key as keyof typeof features,
        enabled: value,
      }));

      return {
        response: { flags },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getAvailableFeatures = () =>
    Effect.gen(function* () {
      const features = yield* blackboxCliService.getAvailableFeatures();
      const featuresList = Object.entries(features).map(([key, value]) => ({
        name: key as keyof typeof features,
        enabled: value,
      }));

      return {
        response: { features: featuresList },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getFlags,
    getAvailableFeatures,
  };
});

export type IFeatureFlagController = InferEffect<typeof LayerImpl>;
export class FeatureFlagController extends Context.Tag("FeatureFlagController")<
  FeatureFlagController,
  IFeatureFlagController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
