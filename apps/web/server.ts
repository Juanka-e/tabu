import { loadEnvConfig } from "@next/env";
import { fileURLToPath } from "node:url";
import {
    flushObservabilityExporter,
    reportError,
} from "@hushle/platform-observability";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

loadEnvConfig(workspaceRoot, process.env.NODE_ENV !== "production");
process.chdir(appDirectory);

import("./server-runtime").catch(async (error) => {
    await reportError({
        service: "hushle-web",
        event: "runtime.import.failed",
        error,
    });
    await flushObservabilityExporter();
    process.exit(1);
});
