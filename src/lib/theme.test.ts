import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTheme, THEME_DARK, THEME_KEY, THEME_LIGHT } from "./theme.ts";

describe("resolveTheme", () => {
  it("returns light and dark prefs as-is", () => {
    assert.equal(resolveTheme("light"), "light");
    assert.equal(resolveTheme("dark"), "dark");
  });
});

describe("theme constants", () => {
  it("keeps the storage key and palette colors stable", () => {
    assert.equal(THEME_KEY, "mm-theme");
    assert.equal(THEME_LIGHT, "#f3f1eb");
    assert.equal(THEME_DARK, "#0c0d0f");
  });
});
