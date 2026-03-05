import { z } from "zod";

/**
 * Frontend form schema for Blackbox CLI Options
 * Simplified version for Blackbox CLI
 */

// Main BB Options Form Schema
export const bbOptionsFormSchema = z.object({
  model: z.string().optional(),
  maxTurns: z.number().int().positive().optional(),
  maxThinkingTokens: z.number().int().positive().optional(),
  systemPrompt: z.string().optional(),
});

export type BBOptionsForm = z.infer<typeof bbOptionsFormSchema>;


export function getDefaultBBOptions(): BBOptionsForm {
  return {};
}

/**
 * Check if the given BB options differ from the default values
 */
export function hasNonDefaultBBOptions(
  options: BBOptionsForm | undefined,
): boolean {
  if (options === undefined) return false;

  return (
    options.model !== undefined ||
    options.maxTurns !== undefined ||
    options.maxThinkingTokens !== undefined ||
    options.systemPrompt !== undefined
  );
}

export function transformFormToSchema(
  form: BBOptionsForm,
): BBOptionsForm | undefined {
  const hasValue = (value: unknown): boolean => {
    if (value === undefined) return false;
    if (typeof value === "string") return value.length > 0;
    return true;
  };

  const hasAnyValue = Object.values(form).some((value) => hasValue(value));

  if (!hasAnyValue) {
    return undefined;
  }

  const result: BBOptionsForm = {
    ...(form.model ? { model: form.model } : {}),
    ...(form.maxTurns !== undefined ? { maxTurns: form.maxTurns } : {}),
    ...(form.maxThinkingTokens !== undefined
      ? { maxThinkingTokens: form.maxThinkingTokens }
      : {}),
    ...(form.systemPrompt ? { systemPrompt: form.systemPrompt } : {}),
  };

  return hasValue(result) ? result : undefined;
}

export function transformSchemaToForm(
  schema: BBOptionsForm | undefined,
): BBOptionsForm {
  if (!schema) {
    return {};
  }

  const form: BBOptionsForm = {};

  if (schema.model) {
    form.model = schema.model;
  }

  if (schema.maxTurns !== undefined) {
    form.maxTurns = schema.maxTurns;
  }

  if (schema.maxThinkingTokens !== undefined) {
    form.maxThinkingTokens = schema.maxThinkingTokens;
  }

  if (schema.systemPrompt) {
    form.systemPrompt = schema.systemPrompt;
  }

  return form;
}

// Type aliases for compatibility
export type BBOptionsSchema = BBOptionsForm;
export type CCOptionsForm = BBOptionsForm;
export type CCOptionsSchema = BBOptionsForm;
export const ccOptionsFormSchema = bbOptionsFormSchema;
export function getDefaultCCOptions(): BBOptionsForm {
  return getDefaultBBOptions();
}
export function hasNonDefaultCCOptions(
  options: BBOptionsForm | undefined,
): boolean {
  return hasNonDefaultBBOptions(options);
}
