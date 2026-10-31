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
export async function getBranches(repoPath: string) {
  const git = simpleGit(repoPath);
  const branchSummary = await git.branchLocal();

  return {
    current: branchSummary.current,
    branches: branchSummary.all,
  };
}

export async function createBranch(
  repoPath: string,
  branchName: string
) {
  const git = simpleGit(repoPath);

  await git.branch([branchName]);

  return {
    success: true,
    branch: branchName,
  };
}

export async function switchBranch(
  repoPath: string,
  branchName: string
) {
  const git = simpleGit(repoPath);

  await git.checkout(branchName);

  return {
    success: true,
    current: branchName,
  };
}

export async function getCommitDiff(
  repoPath: string,
  commitHash: string
) {
  if (!/^[a-f0-9]{7,40}$/i.test(commitHash)) {
    throw new Error("Invalid commit hash");
  }

  const git = simpleGit(repoPath);

  const diff = await git.show([
    commitHash,
    "--format=fuller",
    "--no-ext-diff",
  ]);

  return {
    commitHash,
    diff,
  };
}

export async function getCommitHistory(
  repoPath: string,
  page = 1,
  pageSize = 20
) {
  if (!(await simpleGit(repoPath).checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize)));

  const skip = (safePage - 1) * safePageSize;
  const git = simpleGit(repoPath);

  const [rawCommits, totalRaw] = await Promise.all([
    git.raw([
      "log",
      `--skip=${skip}`,
      `--max-count=${safePageSize}`,
      "--format=%H%x1f%s%x1f%an%x1f%aI",
    ]),
    git.raw(["rev-list", "--count", "HEAD"]),
  ]);

  const commits = rawCommits
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, message, author, date] = line.split("\x1f");

      return { hash, message, author, date };
    });

  const total = Number(totalRaw.trim());

  return {
    commits,
    page: safePage,
    pageSize: safePageSize,
    total,
    hasMore: skip + commits.length < total,
  };
}
export async function getCommitFiles(
  repoPath: string,
  commitHash: string
) {
  if (!/^[a-f0-9]{7,40}$/i.test(commitHash)) {
    throw new Error("Invalid commit hash");
  }

  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const output = await git.raw([
    "diff-tree",
    "--root",
    "--no-commit-id",
    "--name-status",
    "-r",
    "-M",
    commitHash,
  ]);
  const files = output
    .trim()
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      const [statusCode, ...paths] = line.split("\t");
      const filePath = paths.at(-1);

      if (!statusCode || !filePath) {
        return [];
      }

      const status = statusCode.startsWith("A")
        ? "Added"
        : statusCode.startsWith("D")
          ? "Deleted"
          : statusCode.startsWith("R")
            ? "Renamed"
            : statusCode.startsWith("C")
              ? "Copied"
              : "Modified";

      return [
        {
          status,
          oldPath:
            status === "Renamed" || status === "Copied"
              ? paths[0] ?? null
              : null,
          filePath,
        },
      ];
    });

  return {
    commitHash,
    files,
  };
}
async function validateGitFilePaths(
  repoPath: string,
  filePaths: string[]
) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new Error("At least one file path is required");
  }

  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const root = await git.revparse(["--show-toplevel"]);
  const repoRoot = path.resolve(root.trim());

  return filePaths.map((filePath) => {
    if (
      typeof filePath !== "string" ||
      !filePath.trim() ||
      path.isAbsolute(filePath)
    ) {
      throw new Error("Invalid file path");
    }

    const resolvedPath = path.resolve(repoRoot, filePath);
    const relativePath = path.relative(repoRoot, resolvedPath);

    if (
      relativePath === "" ||
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error("File path is outside the repository");
    }

    return relativePath;
  });
}

export async function stageFiles(
  repoPath: string,
  filePaths: string[]
) {
  const validatedPaths = await validateGitFilePaths(repoPath, filePaths);
  const git = simpleGit(repoPath);

  await git.add(validatedPaths);

  return {
    stagedFiles: validatedPaths,
    message: "Files staged successfully",
  };
}

export async function unstageFiles(
  repoPath: string,
  filePaths: string[]
) {
  const validatedPaths = await validateGitFilePaths(repoPath, filePaths);
  const git = simpleGit(repoPath);

  await git.reset(["HEAD", "--", ...validatedPaths]);

  return {
    unstagedFiles: validatedPaths,
    message: "Files unstaged successfully",
  };
}
export async function createCommit(
  repoPath: string,
  message: string
) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error("Commit message is required");
  }

  if (trimmedMessage.length > 200) {
    throw new Error("Commit message cannot exceed 200 characters");
  }

  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const status = await git.status();

  if (status.staged.length === 0) {
    throw new Error("No staged files to commit");
  }

  const result = await git.commit(trimmedMessage);

  return {
    commitHash: result.commit,
    branch: result.branch,
    summary: result.summary,
    message: "Commit created successfully",
  };
}
export async function deleteBranch(
  repoPath: string,
  branchName: string
) {
  const name = branchName.trim();

  if (!name || name.startsWith("-")) {
    throw new Error("Invalid branch name");
  }

  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const status = await git.status();

  if (status.current === name) {
    throw new Error("Cannot delete the currently checked-out branch");
  }

  const branches = await git.branchLocal();

  if (!branches.all.includes(name)) {
    throw new Error("Branch not found");
  }

  await git.deleteLocalBranch(name);

  return {
    branch: name,
    message: "Branch deleted successfully",
  };
}
export async function saveStash(
  repoPath: string,
  message = "Codebase X-Ray stash"
) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const trimmedMessage = message.trim() || "Codebase X-Ray stash";

  const status = await git.status();

  if (status.isClean()) {
    throw new Error("No changes available to stash");
  }

  await git.raw([
    "stash",
    "push",
    "--include-untracked",
    "-m",
    trimmedMessage,
  ]);

  return {
    message: "Changes stashed successfully",
  };
}

export async function getStashList(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const output = await git.raw([
    "stash",
    "list",
    "--format=%gd%x1f%gs",
  ]);

  const stashes = output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [ref, message] = line.split("\x1f");

      return { ref, message };
    });

  return { stashes };
}

export async function applyStash(
  repoPath: string,
  stashRef: string,
  pop = false
) {
  if (!/^stash@\{\d+\}$/.test(stashRef)) {
    throw new Error("Invalid stash reference");
  }

  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  await git.raw([
    "stash",
    pop ? "pop" : "apply",
    stashRef,
  ]);

  return {
    stashRef,
    message: pop
      ? "Stash applied and removed successfully"
      : "Stash applied successfully",
  };
}

export async function dropStash(
  repoPath: string,
  stashRef: string
) {
  if (!/^stash@\{\d+\}$/.test(stashRef)) {
    throw new Error("Invalid stash reference");
  }

  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  await git.raw(["stash", "drop", stashRef]);

  return {
    stashRef,
    message: "Stash deleted successfully",
  };
}
export async function getRemoteStatus(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const [remotes, status] = await Promise.all([
    git.getRemotes(true),
    git.status(),
  ]);

  return {
    remotes: remotes.map((remote) => ({
      name: remote.name,
      fetchUrl: remote.refs.fetch,
      pushUrl: remote.refs.push,
    })),
    branch: status.current,
    tracking: status.tracking,
    ahead: status.ahead,
    behind: status.behind,
    isClean: status.isClean(),
  };
}

export async function pushChanges(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const status = await git.status();

  if (!status.current) {
    throw new Error("No current branch found");
  }

  if (!status.tracking) {
    throw new Error(
      "Current branch has no upstream. Set an upstream remote first."
    );
  }

  const result = await git.push();

  return {
    branch: status.current,
    message: "Changes pushed successfully",
    pushed: result.pushed,
  };
}

export async function pullChanges(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const status = await git.status();

  if (!status.current) {
    throw new Error("No current branch found");
  }

  if (!status.tracking) {
    throw new Error(
      "Current branch has no upstream. Set an upstream remote first."
    );
  }

  if (!status.isClean()) {
    throw new Error(
      "Working tree has uncommitted changes. Commit or stash them before pulling."
    );
  }

  const result = await git.pull();

  return {
    branch: status.current,
    message: "Changes pulled successfully",
    summary: result.summary,
  };
}
export async function setBranchUpstream(
  repoPath: string,
  remoteName: string,
  branchName: string
) {
  const remote = remoteName.trim();
  const branch = branchName.trim();

  if (
    !remote ||
    !branch ||
    remote.startsWith("-") ||
    branch.startsWith("-")
  ) {
    throw new Error("Invalid remote or branch name");
  }

  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const status = await git.status();

  if (status.current !== branch) {
    throw new Error("Switch to the branch before setting its upstream");
  }

  const remotes = await git.getRemotes();

  if (!remotes.some((item) => item.name === remote)) {
    throw new Error("Remote not found");
  }

  await git.raw([
    "branch",
    "--set-upstream-to",
    `${remote}/${branch}`,
    branch,
  ]);

  return {
    remote,
    branch,
    message: "Upstream configured successfully",
  };
}

export async function publishBranch(
  repoPath: string,
  remoteName: string
) {
  const remote = remoteName.trim();

  if (!remote || remote.startsWith("-")) {
    throw new Error("Invalid remote name");
  }

  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const status = await git.status();

  if (!status.current) {
    throw new Error("No current branch found");
  }

  const remotes = await git.getRemotes();

  if (!remotes.some((item) => item.name === remote)) {
    throw new Error("Remote not found");
  }

  await git.push(remote, status.current, ["--set-upstream"]);

  return {
    remote,
    branch: status.current,
    message: "Branch published successfully",
  };
}