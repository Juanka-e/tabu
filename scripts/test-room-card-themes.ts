import assert from "node:assert/strict";
import { resolveRoomCardThemes } from "../src/lib/cosmetics/room-card-themes";

const emptyThemes = resolveRoomCardThemes(null);

assert.equal(emptyThemes.cardFaceTheme, null);
assert.equal(emptyThemes.cardBackTheme, null);

const resolvedThemes = resolveRoomCardThemes({
    cardFace: {
        renderMode: "template",
        imageUrl: "",
        templateKey: "signal_grid",
        templateConfig: {
            palette: {
                primary: "#22c55e",
                secondary: "#bbf7d0",
                border: "#4ade80",
            },
            motion: {
                preset: "pulse",
                speedMs: 4200,
            },
        },
        rarity: "epic",
    },
    cardBack: {
        renderMode: "image",
        imageUrl: "/cosmetics/mock/card-backs/ember-vault.svg",
        templateKey: null,
        templateConfig: null,
        rarity: "legendary",
    },
});

assert.equal(resolvedThemes.cardFaceTheme?.accentColor, "#22c55e");
assert.equal(resolvedThemes.cardFaceTheme?.motionPreset, "pulse");
assert.equal(resolvedThemes.cardBackTheme?.overlayImageUrl, "/cosmetics/mock/card-backs/ember-vault.svg");
assert.equal(resolvedThemes.cardBackTheme?.overlayOpacity, 0.24);

console.log("room-card theme smoke test passed");
