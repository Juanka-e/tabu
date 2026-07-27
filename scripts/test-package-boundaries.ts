import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

function listTypeScriptFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((entry) => {
        const absolutePath = join(directory, entry);
        if (statSync(absolutePath).isDirectory()) {
            return listTypeScriptFiles(absolutePath);
        }

        return /\.(?:ts|tsx)$/.test(entry) ? [absolutePath] : [];
    });
}

const forbiddenPlatformImports =
    /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:@prisma\/client|redis)["']/;

for (const directory of ["src", "scripts"]) {
    for (const file of listTypeScriptFiles(join(root, directory))) {
        if (file === join(root, "scripts/test-package-boundaries.ts")) {
            continue;
        }

        const source = readFileSync(file, "utf8");
        assert.equal(
            forbiddenPlatformImports.test(source),
            false,
            `${relative(root, file)} must import through a platform package`
        );
    }
}

assert.match(
    readFileSync(join(root, "src/lib/prisma.ts"), "utf8"),
    /@hushle\/platform-db/
);
assert.match(
    readFileSync(join(root, "src/lib/redis.ts"), "utf8"),
    /@hushle\/platform-cache/
);

const dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");
assert.match(dockerfile, /packages\/platform-cache\/package\.json/);
assert.match(dockerfile, /packages\/platform-db\/package\.json/);
assert.match(dockerfile, /RUN npm run db:generate/);

console.log("package boundary smoke test passed");
