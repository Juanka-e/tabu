import assert from "node:assert/strict";
import { adminAuditListQuerySchema } from "../src/lib/admin-audit/schema";
import { summarizeAuditMetadata } from "../src/lib/admin-audit/service";

const parsedQuery = adminAuditListQuerySchema.parse({
    page: "2",
    limit: "20",
    search: "wallet",
    action: "admin.user.wallet_adjustment",
    resourceType: "user",
    actorRole: "admin",
});

assert.equal(parsedQuery.page, 2);
assert.equal(parsedQuery.limit, 20);
assert.equal(parsedQuery.search, "wallet");
assert.equal(parsedQuery.action, "admin.user.wallet_adjustment");
assert.equal(parsedQuery.resourceType, "user");
assert.equal(parsedQuery.actorRole, "admin");

const metadataSummary = summarizeAuditMetadata({
    amount: 250,
    mode: "credit",
    tags: ["coin", "campaign"],
    nested: { reason: "ignored" },
    active: true,
});

assert.deepEqual(metadataSummary, {
    amount: "250",
    mode: "credit",
    tags: "coin, campaign",
    nested: "[complex]",
    active: "true",
});

assert.deepEqual(summarizeAuditMetadata(null), {});
assert.deepEqual(summarizeAuditMetadata(["ignored"]), {});

console.log("admin audit viewer smoke test passed");
