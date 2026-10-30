
import { describe, it, expect } from "vitest";
import { resolveLocalImport } from "./resolver.js";

describe("resolveLocalImport", () => {
  const sourceFiles = new Set([
    "src/App.tsx",
    "src/utils.ts",
    "src/components/index.ts",
    "src/helpers.tsx",
  ]);

  it("resolves relative extensionless imports", () => {
    expect(
      resolveLocalImport("src/App.tsx", "./utils", sourceFiles),
    ).toEqual(["src/utils.ts"]);
  });

  it("resolves JavaScript imports to TypeScript files", () => {
    expect(
      resolveLocalImport("src/App.tsx", "./utils.js", sourceFiles),
    ).toEqual(["src/utils.ts"]);
  });

  it("resolves directory imports to index files", () => {
    expect(
      resolveLocalImport("src/App.tsx", "./components", sourceFiles),
    ).toEqual(["src/components/index.ts"]);
  });

  it("ignores external package imports", () => {
    expect(
      resolveLocalImport("src/App.tsx", "react", sourceFiles),
    ).toEqual([]);
  });

  it("ignores imports that do not exist", () => {
    expect(
      resolveLocalImport("src/App.tsx", "./missing", sourceFiles),
    ).toEqual([]);
  });
});
it("prefers TypeScript files when multiple extension matches exist", () => {
  const files = new Set([
    "src/utils.ts",
    "src/utils.js",
  ]);

  expect(
    resolveLocalImport("src/App.tsx", "./utils.js", files),
  ).toEqual(["src/utils.ts"]);
});