import assert from "node:assert/strict";
import { writeAuditLog } from "../src/lib/security/audit-log";

assert.equal(typeof writeAuditLog, "function");

console.log("audit log helper smoke test passed");
