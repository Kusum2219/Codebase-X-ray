import { simpleGit } from "simple-git";
import path from "node:path";
import fs from "node:fs/promises";

export async function getGitInfo(repoPath: string) {
  const git = simpleGit(repoPath);

  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    return {
      isGitRepo: false,
      branch: null,
      changedFiles: [],
      recentCommits: [],
    };
  }

  const [branch, status, log] = await Promise.all([
    git.revparse(["--abbrev-ref", "HEAD"]),
    git.status(),
    git.log({ maxCount: 5 }),
  ]);

  return {
    isGitRepo: true,
    branch,
    changedFiles: status.files.map((file) => ({
      path: file.path,
      index: file.index,
      workingTree: file.working_dir,
    })),
    recentCommits: log.all.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
    })),
  };
}

export async function getFileDiff(
  repoPath: string,
  filePath: string
) {
  const initialGit = simpleGit(repoPath);

  const isRepo = await initialGit.checkIsRepo();

  if (!isRepo) {
    throw new Error("Not a Git repository");
  }

  const repoRoot = (
    await initialGit.revparse(["--show-toplevel"])
  ).trim();

  const rootRealPath = await fs.realpath(repoRoot);
  const absoluteFilePath = path.resolve(rootRealPath, filePath);
  const relativePath = path.relative(
    rootRealPath,
    absoluteFilePath
  );

  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Invalid file path");
  }

  const git = simpleGit(rootRealPath);

  const diff = await git.diff([
    "HEAD",
    "--no-ext-diff",
    "--",
    relativePath.replace(/\\/g, "/"),
  ]);

  return {
    filePath,
    diff,
    hasChanges: diff.trim().length > 0,
  };
}

export async function getUntrackedFilePreview(
  repoPath: string,
  filePath: string
) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const repoRoot = (
    await git.revparse(["--show-toplevel"])
  ).trim();

  const rootRealPath = await fs.realpath(repoRoot);
  const absolutePath = path.resolve(rootRealPath, filePath);

  const relativePath = path.relative(
    rootRealPath,
    absolutePath
  );

  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Invalid file path");
  }

  const fileRealPath = await fs.realpath(absolutePath);

  const realRelativePath = path.relative(
    rootRealPath,
    fileRealPath
  );

  if (
    !realRelativePath ||
    realRelativePath === ".." ||
    realRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelativePath)
  ) {
    throw new Error("File is outside the repository");
  }

  // Only allow files that Git identifies as untracked.
  const status = await git.status();
  const isUntracked = status.files.some(
    (file) =>
      file.path.replace(/\\/g, "/") ===
        realRelativePath.replace(/\\/g, "/") &&
      (file.index === "?" || file.working_dir === "?")
  );

  if (!isUntracked) {
    throw new Error("This file is not untracked");
  }

  const stats = await fs.stat(fileRealPath);

  if (!stats.isFile()) {
    throw new Error("Not a regular file");
  }

  if (stats.size > 1024 * 1024) {
    throw new Error("File is too large to preview (1 MB limit)");
  }

  const buffer = await fs.readFile(fileRealPath);

  if (buffer.includes(0)) {
    throw new Error("Binary files cannot be previewed as text");
  }

  return {
    filePath,
    content: buffer.toString("utf-8"),
    size: stats.size,
  };
}