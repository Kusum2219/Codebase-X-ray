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
  const root = await git.revparse(["--show-toplevel"]);
  const repoRoot = path.resolve(root.trim());

  const rootGit = simpleGit(repoRoot);

  await rootGit.add(validatedPaths);

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
  const root = await git.revparse(["--show-toplevel"]);
  const repoRoot = path.resolve(root.trim());

  const rootGit = simpleGit(repoRoot);

  await rootGit.reset(["HEAD", "--", ...validatedPaths]);

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

export async function fetchRemoteChanges(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const status = await git.status();

  if (!status.tracking) {
    throw new Error(
      "Current branch has no upstream. Set an upstream remote first."
    );
  }

  await git.fetch();

  return {
    branch: status.current,
    message: "Remote information fetched successfully",
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


async function getMergeConflictFiles(git: ReturnType<typeof simpleGit>) {
  const output = await git.raw([
    "diff",
    "--name-only",
    "--diff-filter=U",
  ]);

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

async function validateMergeInProgress(git: ReturnType<typeof simpleGit>) {
  try {
    await git.raw(["rev-parse", "--verify", "MERGE_HEAD"]);
    return true;
  } catch {
    return false;
  }
}

export async function mergeBranch(
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

  if (!status.current) {
    throw new Error("No current branch found");
  }

  if (status.current === name) {
    throw new Error("Cannot merge the current branch into itself");
  }

  if (!status.isClean()) {
    throw new Error(
      "Working tree has uncommitted changes. Commit or stash them before merging."
    );
  }

  const branches = await git.branchLocal();

  if (!branches.all.includes(name)) {
    throw new Error("Local branch not found");
  }

  try {
    await git.raw(["merge", "--no-edit", "--", name]);

    return {
      success: true,
      hasConflicts: false,
      branch: name,
      message: "Branch merged successfully",
    };
  } catch (error) {
    const conflicts = await getMergeConflictFiles(git);

    if (conflicts.length > 0) {
      return {
        success: false,
        hasConflicts: true,
        branch: name,
        conflicts,
        message: "Merge conflicts detected. Resolve them to continue.",
      };
    }

    throw error;
  }
}

export async function resolveMergeConflict(
  repoPath: string,
  filePath: string,
  strategy: "ours" | "theirs" | "manual"
) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  if (!(await validateMergeInProgress(git))) {
    throw new Error("No merge is currently in progress");
  }

  if (!["ours", "theirs", "manual"].includes(strategy)) {
    throw new Error("Invalid conflict resolution strategy");
  }

  const validatedPaths = await validateGitFilePaths(repoPath, [filePath]);
  const relativePath = validatedPaths[0]?.replace(/\\/g, "/");

if (!relativePath) {
  throw new Error("Invalid file path");
}

  const conflicts = await getMergeConflictFiles(git);

  if (!conflicts.includes(relativePath)) {
    throw new Error("This file is not currently conflicted");
  }

  if (strategy === "ours" || strategy === "theirs") {
    await git.raw([
      "checkout",
      `--${strategy}`,
      "--",
      relativePath,
    ]);
  }

  // For manual resolution, edit and save the file in VS Code first.
  await git.raw(["add", "--", relativePath]);

  return {
    filePath: relativePath,
    strategy,
    message: "File marked as resolved",
    remainingConflicts: await getMergeConflictFiles(git),
  };
}

export async function getMergeStatus(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const inProgress = await validateMergeInProgress(git);
  const conflicts = inProgress
    ? await getMergeConflictFiles(git)
    : [];

  return {
    inProgress,
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

export async function completeMerge(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  if (!(await validateMergeInProgress(git))) {
    throw new Error("No merge is currently in progress");
  }

  const conflicts = await getMergeConflictFiles(git);

  if (conflicts.length > 0) {
    throw new Error(
      `Resolve all conflicts before completing the merge: ${conflicts.join(", ")}`
    );
  }

  const status = await git.status();

  if (status.staged.length === 0) {
    throw new Error("No resolved merge changes are staged");
  }

  const result = await git.commit("Merge branch");

  return {
    success: true,
    commitHash: result.commit,
    message: "Merge completed successfully",
  };
}

export async function abortMerge(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  if (!(await validateMergeInProgress(git))) {
    throw new Error("No merge is currently in progress");
  }

  await git.raw(["merge", "--abort"]);

  return {
    success: true,
    message: "Merge aborted successfully",
  };
}
// ==================== GIT TAG MANAGEMENT ====================

export async function getGitTags(repoPath: string) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const output = await git.raw([
    "for-each-ref",
    "--format=%(refname:short)%1f%(objectname)%1f%(objecttype)%1f%(taggername)%1f%(creatordate:iso8601)%1f%(contents:subject)%1f%(*objectname)",
    "refs/tags",
  ]);

  const tags = output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [
        name,
        objectHash,
        objectType,
        tagger,
        date,
        message,
        peeledHash,
      ] = line.split("\x1f");

      return {
        name,
        type: objectType === "tag" ? "annotated" : "lightweight",
        objectHash,
        commitHash: peeledHash || objectHash,
        tagger: tagger || "",
        date: date || "",
        message: message || "",
      };
    });

  return { tags };
}

async function validateTagName(
  git: ReturnType<typeof simpleGit>,
  tagName: string
) {
  const name = tagName.trim();

  if (!name || name.length > 100 || name.startsWith("-")) {
    throw new Error("Invalid tag name");
  }

  await git.raw(["check-ref-format", `refs/tags/${name}`]);

  return name;
}

export async function createGitTag(
  repoPath: string,
  tagName: string,
  type: "lightweight" | "annotated",
  message = "",
  target = "HEAD"
) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const name = await validateTagName(git, tagName);

  const existingTags = await git.tags();

  if (existingTags.all.includes(name)) {
    throw new Error(`Tag "${name}" already exists`);
  }

  const targetCommit = target.trim() || "HEAD";

  if (targetCommit.startsWith("-")) {
    throw new Error("Invalid target commit");
  }

  const resolvedCommit = (
    await git.raw([
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${targetCommit}^{commit}`,
    ])
  ).trim();

  if (!/^[a-f0-9]{40,64}$/i.test(resolvedCommit)) {
    throw new Error("Invalid target commit");
  }

  if (type === "annotated") {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      throw new Error("Message is required for annotated tags");
    }

    if (trimmedMessage.length > 200) {
      throw new Error("Tag message cannot exceed 200 characters");
    }

    await git.raw([
      "tag",
      "-a",
      name,
      resolvedCommit,
      "-m",
      trimmedMessage,
    ]);
  } else if (type === "lightweight") {
    await git.raw(["tag", name, resolvedCommit]);
  } else {
    throw new Error("Invalid tag type");
  }

  return {
    name,
    type,
    commitHash: resolvedCommit,
    message:
      type === "annotated"
        ? "Annotated tag created successfully"
        : "Lightweight tag created successfully",
  };
}

export async function deleteGitTag(
  repoPath: string,
  tagName: string
) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const name = await validateTagName(git, tagName);
  const existingTags = await git.tags();

  if (!existingTags.all.includes(name)) {
    throw new Error("Tag not found");
  }

  await git.raw(["tag", "-d", name]);

  return {
    name,
    message: "Local tag deleted successfully",
  };
}

export async function pushGitTag(
  repoPath: string,
  tagName: string,
  remoteName = "origin"
) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const name = await validateTagName(git, tagName);
  const remote = remoteName.trim();

  if (!remote || remote.startsWith("-")) {
    throw new Error("Invalid remote name");
  }

  const remotes = await git.getRemotes();

  if (!remotes.some((item) => item.name === remote)) {
    throw new Error("Remote not found");
  }

  const existingTags = await git.tags();

  if (!existingTags.all.includes(name)) {
    throw new Error("Tag not found");
  }

  await git.push(remote, `refs/tags/${name}`);

  return {
    name,
    remote,
    message: `Tag "${name}" pushed successfully`,
  };
}

export async function pushAllGitTags(
  repoPath: string,
  remoteName = "origin"
) {
  const git = simpleGit(repoPath);

  if (!(await git.checkIsRepo())) {
    throw new Error("Not a Git repository");
  }

  const remote = remoteName.trim();

  if (!remote || remote.startsWith("-")) {
    throw new Error("Invalid remote name");
  }

  const remotes = await git.getRemotes();

  if (!remotes.some((item) => item.name === remote)) {
    throw new Error("Remote not found");
  }

  await git.push(remote, "--tags");

  return {
    remote,
    message: "All tags pushed successfully",
  };
}
// ==========================================
// CHERRY-PICK & REVERT
// ==========================================

export type GitOperationStatus = {
  inProgress: boolean;
  operation: "cherry-pick" | "revert" | null;
  hasConflicts: boolean;
  conflicts: string[];
};

// Validate commit hash and resolve it to a real commit
async function validateCommitHash(repoPath: string, commitHash: string) {
  const hash = commitHash.trim();

  if (!/^[a-f0-9]{7,64}$/i.test(hash)) {
    throw new Error("Invalid commit hash");
  }

  const git = simpleGit(repoPath);

  const resolved = (
    await git.raw([
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${hash}^{commit}`,
    ])
  ).trim();

  if (!resolved) {
    throw new Error("Commit not found");
  }

  return resolved;
}

// Check whether a Git operation is active
async function hasGitOperation(
  repoPath: string,
  operation: "CHERRY_PICK_HEAD" | "REVERT_HEAD"
) {
  const git = simpleGit(repoPath);

  try {
    await git.raw(["rev-parse", "--verify", operation]);
    return true;
  } catch {
    return false;
  }
}

// Get current Cherry-pick / Revert status
export async function getGitOperationStatus(
  repoPath: string
): Promise<GitOperationStatus> {
  const git = simpleGit(repoPath);

  const cherryPickInProgress = await hasGitOperation(
    repoPath,
    "CHERRY_PICK_HEAD"
  );

  const revertInProgress = await hasGitOperation(
    repoPath,
    "REVERT_HEAD"
  );

  const status = await git.status();

  let operation: "cherry-pick" | "revert" | null = null;

  if (cherryPickInProgress) {
    operation = "cherry-pick";
  } else if (revertInProgress) {
    operation = "revert";
  }

  return {
    inProgress: operation !== null,
    operation,
    hasConflicts: status.conflicted.length > 0,
    conflicts: status.conflicted,
  };
}

// Cherry-pick a selected commit
export async function cherryPickCommit(
  repoPath: string,
  commitHash: string
) {
  const git = simpleGit(repoPath);

  const currentStatus = await getGitOperationStatus(repoPath);

  if (currentStatus.inProgress) {
    throw new Error(
      `A ${currentStatus.operation} operation is already in progress. Complete or abort it first.`
    );
  }

  const resolvedHash = await validateCommitHash(repoPath, commitHash);

  try {
    await git.raw(["cherry-pick", resolvedHash]);

    return {
      success: true,
      message: "Commit cherry-picked successfully",
      commitHash: resolvedHash,
      ...(await getGitOperationStatus(repoPath)),
    };
  } catch (error) {
    const status = await getGitOperationStatus(repoPath);

    if (status.operation === "cherry-pick") {
      return {
        success: false,
        message: status.hasConflicts
          ? "Cherry-pick has conflicts. Resolve them before continuing."
          : "Cherry-pick is in progress.",
        commitHash: resolvedHash,
        ...status,
      };
    }

    throw error;
  }
}

// Revert a selected commit
export async function revertCommit(
  repoPath: string,
  commitHash: string
) {
  const git = simpleGit(repoPath);

  const currentStatus = await getGitOperationStatus(repoPath);

  if (currentStatus.inProgress) {
    throw new Error(
      `A ${currentStatus.operation} operation is already in progress. Complete or abort it first.`
    );
  }

  const resolvedHash = await validateCommitHash(repoPath, commitHash);

  try {
    await git.raw(["revert", "--no-edit", resolvedHash]);

    return {
      success: true,
      message: "Commit reverted successfully",
      commitHash: resolvedHash,
      ...(await getGitOperationStatus(repoPath)),
    };
  } catch (error) {
    const status = await getGitOperationStatus(repoPath);

    if (status.operation === "revert") {
      return {
        success: false,
        message: status.hasConflicts
          ? "Revert has conflicts. Resolve them before continuing."
          : "Revert is in progress.",
        commitHash: resolvedHash,
        ...status,
      };
    }

    throw error;
  }
}

// Abort Cherry-pick
export async function abortCherryPick(repoPath: string) {
  const git = simpleGit(repoPath);
  const status = await getGitOperationStatus(repoPath);

  if (status.operation !== "cherry-pick") {
    throw new Error("No Cherry-pick operation is in progress");
  }

  await git.raw(["cherry-pick", "--abort"]);

  return {
    success: true,
    message: "Cherry-pick aborted successfully",
  };
}

// Abort Revert
export async function abortRevert(repoPath: string) {
  const git = simpleGit(repoPath);
  const status = await getGitOperationStatus(repoPath);

  if (status.operation !== "revert") {
    throw new Error("No Revert operation is in progress");
  }

  await git.raw(["revert", "--abort"]);

  return {
    success: true,
    message: "Revert aborted successfully",
  };
}
export async function continueCherryPick(repoPath: string) {
  const git = simpleGit(repoPath);
  const status = await getGitOperationStatus(repoPath);

  if (status.operation !== "cherry-pick") {
    throw new Error("No Cherry-pick operation is in progress");
  }

  if (status.hasConflicts) {
    throw new Error("Resolve all conflicts before continuing");
  }

  await git.raw(["-c", "core.editor=true", "cherry-pick", "--continue"]);

  return {
    success: true,
    message: "Cherry-pick completed successfully",
  };
}

export async function continueRevert(repoPath: string) {
  const git = simpleGit(repoPath);
  const status = await getGitOperationStatus(repoPath);

  if (status.operation !== "revert") {
    throw new Error("No Revert operation is in progress");
  }

  if (status.hasConflicts) {
    throw new Error("Resolve all conflicts before continuing");
  }

  await git.raw(["-c", "core.editor=true", "revert", "--continue"]);

  return {
    success: true,
    message: "Revert completed successfully",
  };
}