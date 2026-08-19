import assert from "node:assert/strict";
import {
    TABU_DEFAULT_SETTINGS,
    TABU_MODE_ID,
    createInitialTabuState,
    getGameMode,
    normalizeTabuRoomSettings,
    resolveTabuFinish,
    shouldFinishTabuAfterAction,
    shouldFinishTabuBeforeRound,
} from "@hushle/domain-game";

assert.equal(getGameMode(TABU_MODE_ID).id, "tabu");
assert.deepEqual(normalizeTabuRoomSettings({ sure: 10, mod: "tur", deger: 1 }), {
    sure: 30,
    mod: "tur",
    deger: 2,
    wordLocale: "tr",
});
assert.deepEqual(
    normalizeTabuRoomSettings({ sure: 999, mod: "skor", deger: 999 }),
    { sure: 120, mod: "skor", deger: 100, wordLocale: "tr" }
);
assert.equal(normalizeTabuRoomSettings({ wordLocale: "en" }).wordLocale, "en");
assert.equal(normalizeTabuRoomSettings({ wordLocale: "de" }).wordLocale, "tr");

const initialState = createInitialTabuState(TABU_DEFAULT_SETTINGS);
assert.equal(initialState.kalanZaman, 60);
assert.equal(initialState.kalanPasHakki, 3);
assert.equal(initialState.anlatacakTakim, "A");

assert.equal(
    shouldFinishTabuBeforeRound({
        settings: { sure: 60, mod: "tur", deger: 2 },
        currentRound: 3,
        speakingTeam: "A",
        goldenScoreActive: false,
    }),
    true
);
assert.equal(
    shouldFinishTabuAfterAction({
        settings: { sure: 60, mod: "skor", deger: 10 },
        score: { A: 10, B: 4 },
        actingTeam: "A",
        action: "dogru",
        goldenScoreActive: false,
    }),
    true
);
assert.deepEqual(
    resolveTabuFinish({
        settings: { sure: 60, mod: "tur", deger: 2 },
        score: { A: 3, B: 3 },
        goldenScoreActive: false,
    }),
    { kind: "golden-score" }
);
assert.deepEqual(
    resolveTabuFinish({
        settings: { sure: 60, mod: "skor", deger: 10 },
        score: { A: 10, B: 6 },
        goldenScoreActive: false,
    }),
    { kind: "finished", winner: "A" }
);

console.log("domain game smoke test passed");
