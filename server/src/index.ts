import express from "express";
import cors from "cors";
import fg from "fast-glob";
import path from "node:path";
import { access, readFile, stat } from "node:fs/promises";

import {
  extractImports,
  findCircularDependencies,
  type ScannedFile,
} from "./scanner.js";

import { resolveLocalImport } from "./resolver.js";
import { analyzeTestCoverage } from "./testCoverage.js";

import {
  getGitInfo,
  getFileDiff,
  getUntrackedFilePreview,
} from "./gitService.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "10kb" }));

const sourceExtensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

const extensionSet = new Set(sourceExtensions);

const ignoredFolders = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Codebase X-Ray API is running",
  });
});

async function scanDirectory(directory: string) {
  const root = path.resolve(directory);
  const directoryInfo = await stat(root);

  if (!directoryInfo.isDirectory()) {
    throw new Error("The supplied path is not a directory.");
  }

  const paths = await fg("**/*", {
    cwd: root,
    onlyFiles: true,
    dot: false,
    ignore: ignoredFolders,
    followSymbolicLinks: false,
  });

  const sourceFiles = paths
    .filter((file) => extensionSet.has(path.posix.extname(file)))
    .slice(0, 2000)
    .map(normalizePath);

  const sourceFileSet = new Set(sourceFiles);
  const testCoverage = analyzeTestCoverage(sourceFiles);

  const files: ScannedFile[] = await Promise.all(
    sourceFiles.map(async (file): Promise<ScannedFile> => {
      const absolutePath = path.join(root, file);
      const fileInfo = await stat(absolutePath);

      if (fileInfo.size > 500_000) {
        return {
          path: file,
          extension: path.posix.extname(file),
          imports: [],
          localDependencies: [],
          skipped: "File exceeds 500 KB",
        };
      }

      const content = await readFile(absolutePath, "utf8");
      const imports = extractImports(content);

      const localDependencies = [
        ...new Set(
          imports.flatMap((item) =>
            resolveLocalImport(file, item, sourceFileSet)
          )
        ),
      ];

      return {
        path: file,
        extension: path.posix.extname(file),
        imports,
        localDependencies,
      };
    })
  );

  const dependencyCount = files.reduce(
    (total, file) => total + file.localDependencies.length,
    0
  );

  const skippedFiles = files.filter((file) => file.skipped);
  const analyzedCount = files.length - skippedFiles.length;

  const extensionStats = files.reduce<Record<string, number>>(
    (stats, file) => {
      if (!file.skipped) {
        stats[file.extension] =
          (stats[file.extension] ?? 0) + 1;
      }

      return stats;
    },
    {}
  );

  const averageDependencies =
    analyzedCount > 0
      ? Number((dependencyCount / analyzedCount).toFixed(2))
      : 0;

  const circularDependencies = findCircularDependencies(files);

  return {
    root,
    totalFiles: paths.length,
    analyzedFiles: files.length,
    testCoverage,
    sourceFiles: files,
    dependencyCount,
    circularDependencies,
    circularDependencyCount: circularDependencies.length,
    skippedFileCount: skippedFiles.length,
    extensionStats,
    averageDependencies,
  };
}

// Scan API
app.post("/api/scan", async (req, res) => {
  const directory = req.body?.path;

  if (typeof directory !== "string" || !directory.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please provide a project folder path.",
    });
  }

  try {
    const resolvedDirectory = path.resolve(directory);
    await access(resolvedDirectory);

    const result = await scanDirectory(resolvedDirectory);

    return res.json({
      success: true,
      message: "Codebase scanned successfully",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to scan this directory";

    return res.status(400).json({
      success: false,
      message,
    });
  }
});

// Git information API
app.get("/api/git-info", async (req, res) => {
  try {
    const repoPath = req.query.path;

    if (typeof repoPath !== "string" || !repoPath.trim()) {
      return res.status(400).json({
        success: false,
        message: "Repository path is required",
      });
    }

    const resolvedPath = path.resolve(repoPath);
    const gitInfo = await getGitInfo(resolvedPath);

    return res.json({
      success: true,
      data: gitInfo,
    });
  } catch (error) {
    console.error("Git info error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to read Git information",
    });
  }
});

// Git diff API
app.get("/api/git-diff", async (req, res) => {
  try {
    const repoPath = req.query.path;
    const filePath = req.query.file;

    if (
      typeof repoPath !== "string" ||
      typeof filePath !== "string" ||
      !repoPath.trim() ||
      !filePath.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path and file path are required",
      });
    }

    const resolvedPath = path.resolve(repoPath);
    const result = await getFileDiff(resolvedPath, filePath);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Git diff error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to fetch file diff",
    });
  }
});

// Untracked file preview API
app.get("/api/git-preview", async (req, res) => {
  try {
    const repoPath = req.query.path;
    const filePath = req.query.file;

    if (
      typeof repoPath !== "string" ||
      typeof filePath !== "string" ||
      !repoPath.trim() ||
      !filePath.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path and file path are required",
      });
    }

    const resolvedPath = path.resolve(repoPath);

    const result = await getUntrackedFilePreview(
      resolvedPath,
      filePath
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Git preview error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to preview file",
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Codebase X-Ray API running at http://localhost:${PORT}`
  );
});