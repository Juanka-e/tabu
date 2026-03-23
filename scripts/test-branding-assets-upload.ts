import assert from "node:assert/strict";
import {
    getBrandingAssetFileExtension,
    getBrandingAssetUploadConfig,
    hasValidBrandingAssetSignature,
    isBrandingAssetType,
} from "@/lib/branding/upload";
import {
    DEFAULT_SYSTEM_SETTINGS,
    normalizeSystemSettings,
} from "@/lib/system-settings/schema";

function main() {
    const settings = normalizeSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS,
        branding: {
            ...DEFAULT_SYSTEM_SETTINGS.branding,
            logoUrl: "/branding/logo/tabu-logo.webp",
        },
    });

    assert.equal(settings.branding.logoUrl, "/branding/logo/tabu-logo.webp");
    assert.equal(isBrandingAssetType("logo"), true);
    assert.equal(isBrandingAssetType("favicon"), true);
    assert.equal(isBrandingAssetType("og"), true);
    assert.equal(isBrandingAssetType("video"), false);
    assert.equal(getBrandingAssetFileExtension("image/webp"), "webp");
assert.equal(getBrandingAssetUploadConfig("favicon").maxSize, 4 * 1024 * 1024);
assert.equal(getBrandingAssetUploadConfig("logo").maxSize, 4 * 1024 * 1024);
    assert.equal(
        hasValidBrandingAssetSignature(
            Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
            ]),
            "image/png"
        ),
        true
    );

    console.log("branding assets upload smoke test passed");
}

main();
