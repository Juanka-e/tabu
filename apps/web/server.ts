import { loadEnvConfig } from "@next/env";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

loadEnvConfig(workspaceRoot, process.env.NODE_ENV !== "production");
process.chdir(appDirectory);

import("./server-runtime").catch((error) => {
    console.error("Web runtime import failed", error);
    process.exit(1);
});
