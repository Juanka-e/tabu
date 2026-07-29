import assert from "node:assert/strict";
import bcryptjs from "bcryptjs";
import {
    getPlayerCore,
    PlayerCoreError,
    updatePlayerProfile,
} from "@hushle/platform-player";
import { prisma } from "@hushle/platform-db";

async function run(): Promise<void> {
    if (process.env.PLAYER_CORE_INTEGRATION_TEST !== "true") {
        console.log(
            "test:player-core-integration skipped (set PLAYER_CORE_INTEGRATION_TEST=true)"
        );
        return;
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const password = await bcryptjs.hash("integration-password", 10);
    const first = await prisma.user.create({
        data: {
            username: `player_core_${suffix}`,
            password,
            wallet: { create: { coinBalance: 345 } },
            profile: { create: {} },
        },
    });
    const second = await prisma.user.create({
        data: {
            username: `player_core_other_${suffix}`,
            email: `owner_${suffix}@example.com`,
            normalizedEmail: `owner_${suffix}@example.com`,
            password,
        },
    });

    try {
        const initial = await getPlayerCore(first.id);
        assert.equal(initial.wallet.coinBalance, 345);
        assert.equal(initial.profile.displayName, null);

        const updated = await updatePlayerProfile({
            userId: first.id,
            patch: {
                displayName: "  Mobil Oyuncu  ",
                bio: "  Profil testi  ",
                email: `PLAYER_${suffix}@Example.com`,
            },
            auditContext: {
                actorRole: "user",
                ipAddress: "127.0.0.1",
                userAgent: "player-core-integration",
            },
        });
        assert.equal(updated.profile.displayName, "Mobil Oyuncu");
        assert.equal(updated.profile.bio, "Profil testi");
        assert.deepEqual(updated.changes, {
            emailChanged: true,
            displayNameChanged: true,
        });

        const core = await getPlayerCore(first.id);
        assert.equal(core.email, `PLAYER_${suffix}@Example.com`);
        assert.equal(core.emailVerifiedAt, null);
        assert.equal(core.profile.displayName, "Mobil Oyuncu");

        const audits = await prisma.auditLog.findMany({
            where: {
                actorUserId: first.id,
                action: {
                    in: [
                        "user.profile.update",
                        "user.profile.display_name_update",
                    ],
                },
            },
            orderBy: { createdAt: "asc" },
            select: { action: true, ipAddress: true, userAgent: true },
        });
        assert.deepEqual(
            audits.map((entry) => entry.action),
            [
                "user.profile.update",
                "user.profile.display_name_update",
            ]
        );
        assert.ok(
            audits.every(
                (entry) =>
                    entry.ipAddress === "127.0.0.1" &&
                    entry.userAgent === "player-core-integration"
            )
        );

        await updatePlayerProfile({
            userId: first.id,
            patch: { displayName: "" },
            auditContext: { actorRole: "user" },
        });
        assert.equal((await getPlayerCore(first.id)).profile.displayName, null);

        await assert.rejects(
            () =>
                updatePlayerProfile({
                    userId: first.id,
                    patch: { email: second.email },
                    auditContext: { actorRole: "user" },
                }),
            (error: unknown) =>
                error instanceof PlayerCoreError &&
                error.code === "email_conflict"
        );

        console.log("test:player-core-integration ok");
    } finally {
        await prisma.user.deleteMany({
            where: { id: { in: [first.id, second.id] } },
        });
        await prisma.$disconnect();
    }
}

void run();
