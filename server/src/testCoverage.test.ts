
import { describe, it, expect } from "vitest";
import { analyzeTestCoverage } from "./testCoverage.js";

describe("analyzeTestCoverage", () => {
  it("detects matching test files", () => {
    const result = analyzeTestCoverage([
      "src/App.tsx",
      "src/App.test.tsx",
    ]);

    expect(result.testedFiles).toEqual(["src/App.tsx"]);
    expect(result.untestedFiles).toEqual([]);
    expect(result.testedFileCount).toBe(1);
  });

  it("detects spec files", () => {
    const result = analyzeTestCoverage([
      "src/utils.ts",
      "src/utils.spec.ts",
    ]);

    expect(result.testedFiles).toEqual(["src/utils.ts"]);
  });

  it("detects tests inside __tests__ folders", () => {
    const result = analyzeTestCoverage([
      "src/App.ts",
      "src/__tests__/App.test.ts",
    ]);

    expect(result.testedFiles).toEqual(["src/App.ts"]);
  });

  it("identifies source files without tests", () => {
    const result = analyzeTestCoverage([
      "src/App.ts",
      "src/api.ts",
      "src/App.test.ts",
    ]);

    expect(result.untestedFiles).toEqual(["src/api.ts"]);
    expect(result.untestedFileCount).toBe(1);
  });

  it("returns empty results when no files are provided", () => {
    const result = analyzeTestCoverage([]);

    expect(result.sourceFileCount).toBe(0);
    expect(result.testedFileCount).toBe(0);
    expect(result.untestedFileCount).toBe(0);
    expect(result.testFiles).toEqual([]);
  });
});
