import assert from "node:assert/strict";
import { resolveFrameTheme } from "../src/lib/cosmetics/frame";

const templateTheme = resolveFrameTheme({
    renderMode: "template",
    imageUrl: "",
    templateKey: "ember_edge",
    templateConfig: {
        accentColor: "#22c55e",
    },
    rarity: "epic",
});

assert.ok(templateTheme);
assert.equal(templateTheme?.accentColor, "#22c55e");
assert.equal(templateTheme?.imageUrl, null);

const unsafeTemplateTheme = resolveFrameTheme({
    renderMode: "template",
    imageUrl: "",
    templateKey: "royal_ring",
    templateConfig: {
        accentColor: "javascript:alert(1)",
    },
    rarity: "rare",
});

assert.ok(unsafeTemplateTheme);
assert.equal(unsafeTemplateTheme?.accentColor, "#8b5cf6");

const imageTheme = resolveFrameTheme({
    renderMode: "image",
    imageUrl: "/cosmetics/frames/royal.png",
    templateKey: null,
    templateConfig: null,
    rarity: "legendary",
});

assert.ok(imageTheme);
assert.equal(imageTheme?.imageUrl, "/cosmetics/frames/royal.png");
assert.equal(imageTheme?.accentColor, "#f59e0b");

console.log("frame theme smoke test passed");
