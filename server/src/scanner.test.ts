
import { describe, expect, it } from "vitest";
import {
  extractImports,
  findCircularDependencies,
  type ScannedFile,
} from "./scanner.js";

describe("extractImports", () => {
  it("detects different import styles", () => {
    const code = `
      import React from "react";
      export { helper } from "./helper";
      const fs = require("node:fs");
      const module = import("./module");
    `;

    expect(extractImports(code)).toEqual([
      "react",
      "./helper",
      "node:fs",
      "./module",
    ]);
  });

  it("removes duplicate imports", () => {
    const code = `
      import "./utils";
      import "./utils";
    `;

    expect(extractImports(code)).toEqual(["./utils"]);
  });
});

describe("findCircularDependencies", () => {
  it("returns no cycles for an acyclic graph", () => {
    const files: ScannedFile[] = [
      {
        path: "a.ts",
        extension: ".ts",
        imports: [],
        localDependencies: ["b.ts"],
      },
      {
        path: "b.ts",
        extension: ".ts",
        imports: [],
        localDependencies: ["c.ts"],
      },
      {
        path: "c.ts",
        extension: ".ts",
        imports: [],
        localDependencies: [],
      },
    ];

    expect(findCircularDependencies(files)).toEqual([]);
  });

  it("detects a circular dependency", () => {
    const files: ScannedFile[] = [
      {
        path: "a.ts",
        extension: ".ts",
        imports: [],
        localDependencies: ["b.ts"],
      },
      {
        path: "b.ts",
        extension: ".ts",
        imports: [],
        localDependencies: ["a.ts"],
      },
    ];

    expect(findCircularDependencies(files)).toEqual([
      ["a.ts", "b.ts", "a.ts"],
    ]);
  });
});

it("detects a self-referencing dependency", () => {
  const files: ScannedFile[] = [
    {
      path: "a.ts",
      extension: ".ts",
      imports: [],
      localDependencies: ["a.ts"],
    },
  ];

  expect(findCircularDependencies(files)).toEqual([
    ["a.ts", "a.ts"],
  ]);
});

it("detects a circular dependency across three files", () => {
  const files: ScannedFile[] = [
    {
      path: "a.ts",
      extension: ".ts",
      imports: [],
      localDependencies: ["b.ts"],
    },
    {
      path: "b.ts",
      extension: ".ts",
      imports: [],
      localDependencies: ["c.ts"],
    },
    {
      path: "c.ts",
      extension: ".ts",
      imports: [],
      localDependencies: ["a.ts"],
    },
  ];

  expect(findCircularDependencies(files)).toEqual([
    ["a.ts", "b.ts", "c.ts", "a.ts"],
  ]);
});

it("ignores dependencies that are not in the scanned files", () => {
  const files: ScannedFile[] = [
    {
      path: "a.ts",
      extension: ".ts",
      imports: [],
      localDependencies: ["missing.ts"],
    },
  ];

  expect(findCircularDependencies(files)).toEqual([]);
});