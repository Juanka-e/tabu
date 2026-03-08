import assert from "node:assert/strict";
import { resolveCardFaceTheme } from "../src/lib/cosmetics/card-face";

const templateTheme = resolveCardFaceTheme({
    renderMode: "template",
    imageUrl: "",
    templateKey: "signal_grid",
    templateConfig: {
        accentColor: "#10b981",
        borderColor: "#6ee7b7",
        texture: "dots",
        overlayOpacity: 0.9,
    },
    rarity: "epic",
});

assert.equal(templateTheme.accentColor, "#10b981");
assert.equal(templateTheme.borderColor, "#6ee7b7");
assert.equal(templateTheme.texture, "dots");
assert.equal(templateTheme.overlayOpacity, 0.35);
assert.equal(templateTheme.overlayImageUrl, null);

const unsafeTheme = resolveCardFaceTheme({
    renderMode: "template",
    imageUrl: "",
    templateKey: "ember_glow",
    templateConfig: {
        accentColor: "javascript:alert(1)",
        texture: "<script>",
    },
    rarity: "legendary",
});

assert.equal(unsafeTheme.accentColor, "#f97316");
assert.equal(unsafeTheme.texture, "diagonal");

const imageTheme = resolveCardFaceTheme({
    renderMode: "image",
    imageUrl: "/cosmetics/card-faces/signal-grid.png",
    templateKey: null,
    templateConfig: null,
    rarity: "rare",
});

assert.equal(imageTheme.overlayImageUrl, "/cosmetics/card-faces/signal-grid.png");
assert.equal(imageTheme.overlayOpacity, 0.18);

console.log("card-face theme smoke test passed");
