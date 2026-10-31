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
  getBranches,
  createBranch,
  switchBranch,
  getCommitDiff,
  getCommitHistory,
   getCommitFiles,
    stageFiles,
  unstageFiles,
  createCommit,
  deleteBranch,
  saveStash,
getStashList,
applyStash,
dropStash,
getRemoteStatus,
pushChanges,
pullChanges,
setBranchUpstream,
publishBranch,
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
app.get("/api/git-branches", async (req, res) => {
  try {
    const repoPath = req.query.path as string;

    if (!repoPath) {
      return res.status(400).json({
        success: false,
        message: "Repository path is required",
      });
    }

    const result = await getBranches(repoPath);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch branches",
    });
  }
});

app.get("/api/git-commit-diff", async (req, res) => {
  try {
    const repoPath = req.query.path as string;
    const commitHash = req.query.hash as string;

    if (!repoPath || !commitHash) {
      return res.status(400).json({
        success: false,
        message: "Repository path and commit hash are required",
      });
    }

    const result = await getCommitDiff(repoPath, commitHash);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch commit diff",
    });
  }
});
app.get("/api/git-history", async (req, res) => {
  try {
    const repoPath = req.query.path as string;
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);

    if (!repoPath || !Number.isInteger(page) || page < 1 ||
        !Number.isInteger(pageSize) || pageSize < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid repository path, page and page size are required",
      });
    }

    const result = await getCommitHistory(repoPath, page, pageSize);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch commit history",
    });
  }
});

app.get("/api/git-commit-files", async (req, res) => {
  try {
    const repoPath = req.query.path as string;
    const commitHash = req.query.hash as string;

    if (!repoPath || !commitHash) {
      return res.status(400).json({
        success: false,
        message: "Repository path and commit hash are required",
      });
    }

    const result = await getCommitFiles(repoPath, commitHash);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch commit files",
    });
  }
});
app.post("/api/git-branches/create", async (req, res) => {
  try {
    const { path, branchName } = req.body;

    if (!path || !branchName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Repository path and branch name are required",
      });
    }

    const result = await createBranch(path, branchName.trim());
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create branch",
    });
  }
});

app.post("/api/git-branches/switch", async (req, res) => {
  try {
    const { path, branchName } = req.body;

    if (!path || !branchName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Repository path and branch name are required",
      });
    }

    const result = await switchBranch(path, branchName.trim());
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to switch branch",
    });
  }
});

app.get("/api/git-commit-diff", async (req, res) => {
  try {
    const repoPath = req.query.path as string;
    const commitHash = req.query.hash as string;

    if (!repoPath || !commitHash) {
      return res.status(400).json({
        success: false,
        message: "Repository path and commit hash are required",
      });
    }

    const result = await getCommitDiff(repoPath, commitHash);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch commit diff",
    });
  }
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
app.post("/api/git-stage", async (req, res) => {
  try {
    const { path: repoPath, files } = req.body;

    if (
      !repoPath ||
      !Array.isArray(files) ||
      files.length === 0 ||
      files.length > 100 ||
      !files.every((file: unknown) => typeof file === "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path and 1–100 valid file paths are required",
      });
    }

    const result = await stageFiles(repoPath, files);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to stage files",
    });
  }
});

app.post("/api/git-unstage", async (req, res) => {
  try {
    const { path: repoPath, files } = req.body;

    if (
      !repoPath ||
      !Array.isArray(files) ||
      files.length === 0 ||
      files.length > 100 ||
      !files.every((file: unknown) => typeof file === "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path and 1–100 valid file paths are required",
      });
    }

    const result = await unstageFiles(repoPath, files);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to unstage files",
    });
  }
});
app.post("/api/git-commit", async (req, res) => {
  try {
    const { path: repoPath, message } = req.body;

    if (
      typeof repoPath !== "string" ||
      !repoPath.trim() ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path and commit message are required",
      });
    }

    const result = await createCommit(repoPath, message);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create commit",
    });
  }
});
app.post("/api/git-branches/delete", async (req, res) => {
  try {
    const { path: repoPath, branchName } = req.body;

    if (
      typeof repoPath !== "string" ||
      !repoPath.trim() ||
      typeof branchName !== "string" ||
      !branchName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path and branch name are required",
      });
    }

    const result = await deleteBranch(repoPath, branchName);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete branch",
    });
  }
});
// Save stash
app.post("/api/git-stash", async (req, res) => {
  try {
    const { path: repoPath, message } = req.body;

    if (
      typeof repoPath !== "string" ||
      !repoPath.trim() ||
      (message !== undefined && typeof message !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid repository path and stash message are required",
      });
    }

    const result = await saveStash(repoPath, message);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to save stash",
    });
  }
});

// List stashes
app.get("/api/git-stashes", async (req, res) => {
  try {
    const repoPath = req.query.path;

    if (typeof repoPath !== "string" || !repoPath.trim()) {
      return res.status(400).json({
        success: false,
        message: "Repository path is required",
      });
    }

    const result = await getStashList(repoPath);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to list stashes",
    });
  }
});

// Apply or pop stash
app.post("/api/git-stash/apply", async (req, res) => {
  try {
    const { path: repoPath, stashRef, pop } = req.body;

    if (
      typeof repoPath !== "string" ||
      !repoPath.trim() ||
      typeof stashRef !== "string" ||
      (pop !== undefined && typeof pop !== "boolean")
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path and valid stash reference are required",
      });
    }

    const result = await applyStash(repoPath, stashRef, pop === true);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to apply stash",
    });
  }
});

// Drop stash
app.post("/api/git-stash/drop", async (req, res) => {
  try {
    const { path: repoPath, stashRef } = req.body;

    if (
      typeof repoPath !== "string" ||
      !repoPath.trim() ||
      typeof stashRef !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path and stash reference are required",
      });
    }

    const result = await dropStash(repoPath, stashRef);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to drop stash",
    });
  }
});
// Remote status
app.get("/api/git-remote-status", async (req, res) => {
  try {
    const repoPath = req.query.path;

    if (typeof repoPath !== "string" || !repoPath.trim()) {
      return res.status(400).json({
        success: false,
        message: "Repository path is required",
      });
    }

    const result = await getRemoteStatus(repoPath);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch remote status",
    });
  }
});

// Push
app.post("/api/git-push", async (req, res) => {
  try {
    const { path: repoPath, confirmed } = req.body;

    if (typeof repoPath !== "string" || !repoPath.trim() || confirmed !== true) {
      return res.status(400).json({
        success: false,
        message: "Repository path and explicit push confirmation are required",
      });
    }

    const result = await pushChanges(repoPath);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to push changes",
    });
  }
});

// Pull
app.post("/api/git-pull", async (req, res) => {
  try {
    const { path: repoPath, confirmed } = req.body;

    if (typeof repoPath !== "string" || !repoPath.trim() || confirmed !== true) {
      return res.status(400).json({
        success: false,
        message: "Repository path and explicit pull confirmation are required",
      });
    }

    const result = await pullChanges(repoPath);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to pull changes",
    });
  }
});
app.post("/api/git-upstream", async (req, res) => {
  try {
    const { path: repoPath, remote, branchName } = req.body;

    if (
      typeof repoPath !== "string" ||
      !repoPath.trim() ||
      typeof remote !== "string" ||
      !remote.trim() ||
      typeof branchName !== "string" ||
      !branchName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path, remote and branch name are required",
      });
    }

    const result = await setBranchUpstream(
      repoPath,
      remote,
      branchName
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to set upstream",
    });
  }
});

app.post("/api/git-publish-branch", async (req, res) => {
  try {
    const { path: repoPath, remote, confirmed } = req.body;

    if (
      typeof repoPath !== "string" ||
      !repoPath.trim() ||
      typeof remote !== "string" ||
      !remote.trim() ||
      confirmed !== true
    ) {
      return res.status(400).json({
        success: false,
        message: "Repository path, remote and explicit confirmation are required",
      });
    }

    const result = await publishBranch(repoPath, remote);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to publish branch",
    });
  }
});