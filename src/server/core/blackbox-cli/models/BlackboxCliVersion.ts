import { z } from "zod";

const versionRegex = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;
const versionSchema = z
  .object({
    major: z.string().transform((value) => Number.parseInt(value, 10)),
    minor: z.string().transform((value) => Number.parseInt(value, 10)),
    patch: z.string().transform((value) => Number.parseInt(value, 10)),
  })
  .refine((data) =>
    [data.major, data.minor, data.patch].every((value) => !Number.isNaN(value)),
  );

export type BlackboxCliVersion = z.infer<typeof versionSchema>;

export const fromCLIString = (
  versionOutput: string,
): BlackboxCliVersion | null => {
  const groups = versionOutput.trim().match(versionRegex)?.groups;

  if (groups === undefined) {
    return null;
  }

  const parsed = versionSchema.safeParse(groups);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
};

export const versionText = (version: BlackboxCliVersion) =>
  `${version.major}.${version.minor}.${version.patch}`;

export const equals = (a: BlackboxCliVersion, b: BlackboxCliVersion) =>
  a.major === b.major && a.minor === b.minor && a.patch === b.patch;

export const greaterThan = (a: BlackboxCliVersion, b: BlackboxCliVersion) =>
  a.major > b.major ||
  (a.major === b.major &&
    (a.minor > b.minor || (a.minor === b.minor && a.patch > b.patch)));

export const greaterThanOrEqual = (
  a: BlackboxCliVersion,
  b: BlackboxCliVersion,
) => equals(a, b) || greaterThan(a, b);
