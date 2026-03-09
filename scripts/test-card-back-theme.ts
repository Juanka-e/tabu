import assert from "node:assert/strict";
import { resolveCardBackTheme } from "../src/lib/cosmetics/card-back";

const templateTheme = resolveCardBackTheme({
    renderMode: "template",
    imageUrl: "",
    templateKey: "royal_seal",
    templateConfig: {
        accentColor: "#22c55e",
        texture: "grid",
        overlayOpacity: 0.8,
    },
    rarity: "epic",
});

assert.equal(templateTheme.accentColor, "#22c55e");
assert.equal(templateTheme.texture, "grid");
assert.equal(templateTheme.overlayOpacity, 0.45);
assert.equal(templateTheme.overlayImageUrl, null);

const unsafeTheme = resolveCardBackTheme({
    renderMode: "template",
    imageUrl: "",
    templateKey: "ember_vault",
    templateConfig: {
        borderColor: "javascript:alert(1)",
        texture: "<svg>",
    },
    rarity: "legendary",
});

assert.equal(unsafeTheme.borderColor, "#fb923c");
assert.equal(unsafeTheme.texture, "diagonal");

const imageTheme = resolveCardBackTheme({
    renderMode: "image",
    imageUrl: "/cosmetics/card-backs/ember-vault.png",
    templateKey: null,
    templateConfig: null,
    rarity: "rare",
});

assert.equal(imageTheme.overlayImageUrl, "/cosmetics/card-backs/ember-vault.png");
assert.equal(imageTheme.overlayOpacity, 0.24);

console.log("card-back theme smoke test passed");
