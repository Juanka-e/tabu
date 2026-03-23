import assert from "node:assert/strict";
import {
    buildRootMetadata,
    buildRootViewport,
    buildRoomMetadata,
} from "@/lib/branding/metadata";
import {
    DEFAULT_SYSTEM_SETTINGS,
    normalizeSystemSettings,
} from "@/lib/system-settings/schema";

function main() {
    const settings = normalizeSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS,
        branding: {
            ...DEFAULT_SYSTEM_SETTINGS.branding,
            siteName: "Tabu Arena",
            siteShortName: "Arena",
            defaultTitle: "Tabu Arena | Online Oyun",
            titleTemplate: "%s | Tabu Arena",
            defaultDescription: "Modern online Tabu deneyimi.",
            ogImageUrl: "/og/tabu-arena.png",
            faviconUrl: "/brand/favicon.ico",
            themeColor: "#123456",
            twitterHandle: "tabuarena",
        },
    });

    const rootMetadata = buildRootMetadata(settings.branding);
    const rootViewport = buildRootViewport(settings.branding);
    const roomMetadata = buildRoomMetadata(settings.branding);
    const titleConfig =
        typeof rootMetadata.title === "object" && rootMetadata.title
            ? (rootMetadata.title as { template?: string })
            : null;
    const iconsConfig =
        typeof rootMetadata.icons === "object" && rootMetadata.icons
            ? (rootMetadata.icons as { icon?: string })
            : null;

    assert.equal(settings.branding.siteName, "Tabu Arena");
    assert.equal(rootMetadata.applicationName, "Arena");
    assert.equal(rootViewport.themeColor, "#123456");
    assert.equal(titleConfig?.template, "%s | Tabu Arena");
    assert.equal(rootMetadata.openGraph?.siteName, "Tabu Arena");
    assert.equal(rootMetadata.twitter?.creator, "@tabuarena");
    assert.equal(iconsConfig?.icon, "http://localhost:3000/brand/favicon.ico");
    assert.equal(roomMetadata.title, "Oyun Odasi | Tabu Arena");
    assert.equal(roomMetadata.openGraph?.title, "Tabu Arena | Online Oyun");

    console.log("branding seo settings smoke test passed");
}

main();
