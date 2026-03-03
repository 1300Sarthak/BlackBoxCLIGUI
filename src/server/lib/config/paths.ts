import { homedir } from "node:os";
import { resolve } from "node:path";

export const blackboxCliViewerCacheDirPath = resolve(
  homedir(),
  ".blackbox-cli-viewer",
  "cache",
);
