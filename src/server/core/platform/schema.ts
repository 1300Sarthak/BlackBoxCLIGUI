import { z } from "zod";

export const envSchema = z.object({
  // Frameworks
  BBCV_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  NEXT_PHASE: z.string().optional(),
  PATH: z.string().optional(),
  SHELL: z.string().optional(),
  BBCV_TERMINAL_SHELL: z.string().optional(),
  BBCV_TERMINAL_UNRESTRICTED: z.string().optional(),
  BBCV_TERMINAL_DISABLED: z.string().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;
