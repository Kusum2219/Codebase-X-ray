import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code2,
  Command,
  FileCode2,
  Files,
  GitBranch,
  GitFork,
  LayoutDashboard,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  Filter,
  X,
  FileWarning,
  ShieldAlert,
  AlertTriangle,
  
} from "lucide-react";
import api from "./api";
import DependencyGraph from "./DependencyGraph";

type ApiState = "connecting" | "connected" | "error";
type GraphFilter = "all" | "connected";

type ScannedFile = {
  path: string;
  extension: string;
  imports: string[];
  localDependencies: string[];
  skipped?: string;
};

type ScanResult = {
  success: boolean;
  message: string;
  root: string;
  totalFiles: number;
  analyzedFiles: number;
  dependencyCount: number;
  circularDependencies: string[][];
  circularDependencyCount: number;
  sourceFiles: ScannedFile[];
};

type GitDiff = {
  filePath: string;
  diff: string;
  hasChanges: boolean;
};
type GitFilePreview = {
  filePath: string;
  content: string;
  size: number;
};

type GitInfo = {
  isGitRepo: boolean;
  branch: string | null;
  changedFiles: {
    path: string;
    index: string;
    workingTree: string;
  }[];
  recentCommits: {
    hash: string;
    message: string;
    author: string;
    date: string;
  }[];
};

type RecentProject = {
  name: string;
  path: string;
  language: string;
  status: string;
  color: string;
  dot: string;
  lastScanned: string;
  analyzedFiles: number;
  dependencyCount: number;
};


const workspaceFiles = [
  { name: "App.tsx", type: "TSX", color: "text-blue-400" },
  { name: "api.ts", type: "TS", color: "text-blue-400" },
  { name: "index.ts", type: "TS", color: "text-blue-400" },
  { name: "package.json", type: "JSON", color: "text-amber-400" },
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Files;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111419] p-5 transition-colors hover:border-white/[0.16]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>
        <Icon size={18} className="text-gray-500" />
      </div>
      <div className="mt-4">
        <h3 className="text-3xl font-semibold tracking-tight text-white">
          {value}
        </h3>
        <p className="mt-2 text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function App() {
  const [apiStatus, setApiStatus] = useState<ApiState>("connecting");
  const [apiMessage, setApiMessage] = useState("Checking backend...");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [graphFilter, setGraphFilter] = useState<GraphFilter>("all");
  const [scanPath, setScanPath] = useState(
    "C:\\Users\\HP\\Desktop\\Codebase-X-ray\\client",
  );
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState("");
  const [selectedDiffFile, setSelectedDiffFile] = useState("");
  const [gitDiff, setGitDiff] = useState<GitDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState("");
  const [filePreview, setFilePreview] =
  useState<GitFilePreview | null>(null);

  const [pushLoading, setPushLoading] = useState(false);
const [pushMessage, setPushMessage] = useState("");
const [pushError, setPushError] = useState("");

const [pullLoading, setPullLoading] = useState(false);
const [pullMessage, setPullMessage] = useState("");
const [pullError, setPullError] = useState("");

  const [branches, setBranches] = useState<string[]>([]);
const [currentBranch, setCurrentBranch] = useState("");
const [newBranchName, setNewBranchName] = useState("");
const [branchLoading, setBranchLoading] = useState(false);
const [branchMessage, setBranchMessage] = useState("");
const [branchError, setBranchError] = useState("");
const [mergeBranchName, setMergeBranchName] = useState("");
const [mergeLoading, setMergeLoading] = useState(false);
const [mergeMessage, setMergeMessage] = useState("");
const [mergeError, setMergeError] = useState("");
const [mergeStatus, setMergeStatus] = useState<{
  inProgress: boolean;
  hasConflicts: boolean;
  conflicts: string[];
}>({
  inProgress: false,
  hasConflicts: false,
  conflicts: [],
});

const [selectedCommit, setSelectedCommit] = useState("");
const [commitDiff, setCommitDiff] = useState("");
const [commitDiffLoading, setCommitDiffLoading] = useState(false);
const [commitDiffError, setCommitDiffError] = useState("");
const [selectedGitFiles, setSelectedGitFiles] = useState<string[]>([]);
const [commitMessage, setCommitMessage] = useState("");
const [remoteStatus, setRemoteStatus] = useState<any>(null);
const [remoteStatusLoading, setRemoteStatusLoading] = useState(false);
const [remoteStatusError, setRemoteStatusError] = useState("");

const [fetchLoading, setFetchLoading] = useState(false);
const [fetchMessage, setFetchMessage] = useState("");
const [fetchError, setFetchError] = useState("");

const [stashes, setStashes] = useState<
  { ref: string; message: string }[]
>([]);

const [stashMessage, setStashMessage] = useState("");
const [stashLoading, setStashLoading] = useState(false);
const [stashActionLoading, setStashActionLoading] = useState(false);
const [stashSuccess, setStashSuccess] = useState("");
const [stashError, setStashError] = useState("");

// Git Tags
const [gitTags, setGitTags] = useState<
  {
    name: string;
    type: "annotated" | "lightweight";
    objectHash: string;
    commitHash: string;
    tagger: string;
    date: string;
    message: string;
  }[]
>([]);

const [tagName, setTagName] = useState("");
const [tagType, setTagType] = useState<"lightweight" | "annotated">("annotated");
const [tagMessage, setTagMessage] = useState("");
const [tagTarget, setTagTarget] = useState("");
const [tagRemote, setTagRemote] = useState("origin");

const [tagLoading, setTagLoading] = useState(false);
const [tagActionLoading, setTagActionLoading] = useState(false);
const [tagSuccess, setTagSuccess] = useState("");
const [tagError, setTagError] = useState("");

// Cherry-pick & Revert
const [operationCommitHash, setOperationCommitHash] = useState("");
const [operationLoading, setOperationLoading] = useState(false);
const [operationMessage, setOperationMessage] = useState("");
const [operationError, setOperationError] = useState("");

const [gitOperationStatus, setGitOperationStatus] = useState<{
  inProgress: boolean;
  operation: "cherry-pick" | "revert" | null;
  hasConflicts: boolean;
  conflicts: string[];
}>({
  inProgress: false,
  operation: null,
  hasConflicts: false,
  conflicts: [],
});

const [gitActionLoading, setGitActionLoading] = useState(false);
const [gitActionMessage, setGitActionMessage] = useState("");
const [gitActionError, setGitActionError] = useState("");

const [commitFiles, setCommitFiles] = useState<
  {
    file: string;
    changes: string;
    insertions: number;
    deletions: number;
  }[]
>([]);

const [commitFilesLoading, setCommitFilesLoading] = useState(false);
const [commitFilesError, setCommitFilesError] = useState("");


  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");


  useEffect(() => {
    let active = true;

    api
      .get("/health")
      .then((response) => {
        if (!active) return;
        setApiStatus("connected");
        setApiMessage(
          response.data.message || "Backend connected successfully",
        );
      })
      .catch(() => {
        if (!active) return;
        setApiStatus("error");
        setApiMessage(
          "Backend unavailable. Check whether the server is running.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  
useEffect(() => {
  try {
    const savedProjects = localStorage.getItem("codebase-xray-history");

    if (savedProjects) {
      setRecentProjects(JSON.parse(savedProjects) as RecentProject[]);
    }
  } catch (error) {
    console.error("Unable to load scan history:", error);
  }
}, []);

async function loadGitInfo(repoPath: string) {
  setGitLoading(true);
  setGitError("");

  try {
    const response = await api.get("/git-info", {
      params: { path: repoPath },
    });

    setGitInfo(response.data.data);
  } catch {
    setGitInfo(null);
    setGitError("Unable to fetch Git information.");
  } finally {
    setGitLoading(false);
  }
}

function toggleGitFile(filePath: string) {
  setSelectedGitFiles((previous) =>
    previous.includes(filePath)
      ? previous.filter((file) => file !== filePath)
      : [...previous, filePath]
  );
}

function toggleAllGitFiles(files: string[]) {
  setSelectedGitFiles((previous) =>
    files.every((file) => previous.includes(file))
      ? previous.filter((file) => !files.includes(file))
      : [...new Set([...previous, ...files])]
  );
}

async function handleStageFiles() {
  if (!selectedGitFiles.length) {
    setGitActionError("Select at least one file to stage.");
    return;
  }

  try {
    setGitActionLoading(true);
    setGitActionError("");
    setGitActionMessage("");

    await api.post("/git-stage", {
      path: scanPath.trim(),
      files: selectedGitFiles,
    });

    setGitActionMessage("Selected files staged successfully.");
    setSelectedGitFiles([]);

    await loadGitInfo(scanPath.trim());
  } catch (error: any) {
    setGitActionError(
      error.response?.data?.message || "Unable to stage files."
    );
  } finally {
    setGitActionLoading(false);
  }
}

async function handleUnstageFiles() {
  if (!selectedGitFiles.length) {
    setGitActionError("Select at least one file to unstage.");
    return;
  }

  try {
    setGitActionLoading(true);
    setGitActionError("");
    setGitActionMessage("");

    await api.post("/git-unstage", {
      path: scanPath.trim(),
      files: selectedGitFiles,
    });

    setGitActionMessage("Selected files unstaged successfully.");
    setSelectedGitFiles([]);

    await loadGitInfo(scanPath.trim());
  } catch (error: any) {
    setGitActionError(
      error.response?.data?.message || "Unable to unstage files."
    );
  } finally {
    setGitActionLoading(false);
  }
}

async function handleCreateCommit() {
  if (!commitMessage.trim()) {
    setGitActionError("Please enter a commit message.");
    return;
  }

  try {
    setGitActionLoading(true);
    setGitActionError("");
    setGitActionMessage("");

    await api.post("/git-commit", {
      path: scanPath.trim(),
      message: commitMessage.trim(),
    });

    setGitActionMessage("Commit created successfully.");
    setCommitMessage("");
    setSelectedGitFiles([]);

    await loadGitInfo(scanPath.trim());
  } catch (error: any) {
    setGitActionError(
      error.response?.data?.message || "Unable to create commit."
    );
  } finally {
    setGitActionLoading(false);
  }
}

async function loadFileDiff() {
  if (!selectedDiffFile) return;

  setDiffLoading(true);
  setDiffError("");
  setGitDiff(null);
  setFilePreview(null);
  setPreviewError("");

  try {
    const response = await api.get("/git-diff", {
      params: {
        path: scanPath.trim(),
        file: selectedDiffFile,
      },
    });

    setGitDiff(response.data.data);
  } catch (error) {
    console.error("Git diff error:", error);
    setDiffError("Unable to load file changes.");
  } finally {
    setDiffLoading(false);
  }
}
async function loadUntrackedPreview() {
  if (!selectedDiffFile) return;

   setPreviewLoading(true);
  setPreviewError("");
  setFilePreview(null);
  setGitDiff(null);
  setDiffError("");


  try {
    const response = await api.get("/git-preview", {
      params: {
        path: scanPath.trim(),
        file: selectedDiffFile,
      },
    });

    setFilePreview(response.data.data);
  } catch (error) {
    console.error("File preview error:", error);

    setPreviewError(
      "Unable to preview this file. It may be too large or a binary file."
    );
  } finally {
    setPreviewLoading(false);
  }
}

async function loadBranches() {
  try {
    setBranchLoading(true);
    setBranchError("");

    const response = await api.get("/git-branches", {
      params: { path: scanPath.trim() },
    });

    setBranches(response.data.branches);
    setCurrentBranch(response.data.current);
  } catch (error: any) {
    setBranchError(
      error.response?.data?.message || "Failed to load branches"
    );
  } finally {
    setBranchLoading(false);
  }
}


const loadMergeStatus = async () => {
  if (!scanPath.trim()) return;

  try {
    setMergeLoading(true);
    setMergeError("");

    const response = await fetch(
      `http://localhost:5000/api/git-merge-status?path=${encodeURIComponent(scanPath)}`
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load merge status");
    }

    setMergeStatus(result.data);
  } catch (error) {
    setMergeError(
      error instanceof Error ? error.message : "Failed to load merge status"
    );
  } finally {
    setMergeLoading(false);
  }
};

const handleMergeBranch = async () => {
  if (!mergeBranchName || !scanPath.trim()) return;

  const confirmed = window.confirm(
    `Merge "${mergeBranchName}" into "${currentBranch}"?`
  );

  if (!confirmed) return;

  try {
    setMergeLoading(true);
    setMergeError("");
    setMergeMessage("");

    const response = await fetch("http://localhost:5000/api/git-merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: scanPath,
        branchName: mergeBranchName,
        confirmed: true,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Merge failed");
    }

    setMergeMessage(result.data.message);
    setMergeBranchName("");
    await loadMergeStatus();
    await loadBranches();
  } catch (error) {
    setMergeError(
      error instanceof Error ? error.message : "Merge failed"
    );
    await loadMergeStatus();
  } finally {
    setMergeLoading(false);
  }
};

const handleResolveConflict = async (
  filePath: string,
  strategy: "ours" | "theirs" | "manual"
) => {
  if (strategy === "manual") {
    window.alert(
      `Open "${filePath}" in VS Code, resolve the conflict markers, save the file, then click "Mark Resolved".`
    );
  }

  try {
    setMergeLoading(true);
    setMergeError("");
    setMergeMessage("");

    const response = await fetch(
      "http://localhost:5000/api/git-merge/resolve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: scanPath,
          filePath,
          strategy,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Conflict resolution failed");
    }

    setMergeMessage(result.data.message);
    await loadMergeStatus();
  } catch (error) {
    setMergeError(
      error instanceof Error ? error.message : "Conflict resolution failed"
    );
  } finally {
    setMergeLoading(false);
  }
};

const handleCompleteMerge = async () => {
  if (!window.confirm("Are you sure you want to complete this merge?")) {
    return;
  }

  try {
    setMergeLoading(true);
    setMergeError("");

    const response = await fetch(
      "http://localhost:5000/api/git-merge/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: scanPath, confirmed: true }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to complete merge");
    }

    setMergeMessage(result.data.message);
    await loadMergeStatus();
    await loadBranches();
  } catch (error) {
    setMergeError(
      error instanceof Error ? error.message : "Unable to complete merge"
    );
  } finally {
    setMergeLoading(false);
  }
};

const handleAbortMerge = async () => {
  if (!window.confirm("Abort this merge? All merge-in-progress changes will be discarded.")) {
    return;
  }

  try {
    setMergeLoading(true);
    setMergeError("");

    const response = await fetch(
      "http://localhost:5000/api/git-merge/abort",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: scanPath, confirmed: true }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to abort merge");
    }

    setMergeMessage(result.data.message);
    await loadMergeStatus();
    await loadBranches();
  } catch (error) {
    setMergeError(
      error instanceof Error ? error.message : "Unable to abort merge"
    );
  } finally {
    setMergeLoading(false);
  }
};


async function loadCommitDiff(commitHash: string) {
  try {
    setCommitDiffLoading(true);
    setCommitDiffError("");
    setCommitDiff("");

    setSelectedCommit(commitHash);

    const response = await api.get("/git-commit-diff", {
      params: {
        path: scanPath.trim(),
        hash: commitHash,
      },
    });

    setCommitDiff(response.data.data.diff);
  } catch (error: any) {
    setCommitDiffError(
      error.response?.data?.message || "Unable to load commit diff"
    );
  } finally {
    setCommitDiffLoading(false);
  }
}

async function loadCommitHistory(page = 1) {
  try {
    setHistoryLoading(true);
    setHistoryError("");

    const response = await api.get("/git-history", {
      params: {
        path: scanPath.trim(),
        page,
        pageSize: 20,
      },
    });

    const result = response.data.data;

    setCommitHistory((previous) =>
      page === 1
        ? result.commits
        : [...previous, ...result.commits]
    );

    setCommitPage(page);
    setHasMoreCommits(result.hasMore);
  } catch (error: any) {
    setHistoryError(
      error.response?.data?.message || "Unable to load commit history."
    );
  } finally {
    setHistoryLoading(false);
  }
}

async function loadCommitFiles(commitHash: string) {
  try {
    setCommitFilesLoading(true);
    setCommitFilesError("");
    setCommitFiles([]);

    const response = await api.get("/git-commit-files", {
      params: {
        path: scanPath.trim(),
        hash: commitHash,
      },
    });

   setCommitFiles(
  response.data.data.files.map((file: {
    status: string;
    oldPath: string | null;
    filePath: string;
  }) => ({
    file: file.filePath,
    changes: file.status,
    insertions: 0,
    deletions: 0,
  }))
);
  } catch (error: any) {
    setCommitFilesError(
      error.response?.data?.message || "Unable to load commit files."
    );
  } finally {
    setCommitFilesLoading(false);
  }
}

const [commitHistory, setCommitHistory] = useState<
  {
    hash: string;
    message: string;
    author: string;
    date: string;
  }[]
>([]);

const [commitPage, setCommitPage] = useState(1);
const [hasMoreCommits, setHasMoreCommits] = useState(false);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");

async function handleCreateBranch() {
  if (!newBranchName.trim()) {
    setBranchError("Please enter a branch name");
    return;
  }

  try {
    setBranchLoading(true);
    setBranchError("");
    setBranchMessage("");

    await api.post("/git-branches/create", {
      path: scanPath.trim(),
      branchName: newBranchName.trim(),
    });

    setBranchMessage(`Branch "${newBranchName.trim()}" created successfully`);
    setNewBranchName("");

    await loadBranches();
  } catch (error: any) {
    setBranchError(
      error.response?.data?.message || "Failed to create branch"
    );
  } finally {
    setBranchLoading(false);
  }
}

async function handleSwitchBranch(branchName: string) {
  if (branchName === currentBranch) return;

  try {
    setBranchLoading(true);
    setBranchError("");
    setBranchMessage("");

    await api.post("/git-branches/switch", {
      path: scanPath.trim(),
      branchName,
    });

    setBranchMessage(`Switched to "${branchName}" successfully`);

    await loadBranches();
    await loadGitInfo(scanPath.trim());
  } catch (error: any) {
    setBranchError(
      error.response?.data?.message || "Failed to switch branch"
    );
  } finally {
    setBranchLoading(false);
  }
}

async function handlePush() {
  if (!scanPath.trim()) return;

  const confirmed = window.confirm(
    "Are you sure you want to push your commits to the remote repository?"
  );

  if (!confirmed) return;

  try {
    setPushLoading(true);
    setPushMessage("");
    setPushError("");

    const response = await api.post("/git-push", {
      path: scanPath.trim(),
      confirmed: true,
    });

    setPushMessage(
      response.data.data.message || "Changes pushed successfully."
    );

    await loadGitInfo(scanPath.trim());
  } catch (error: any) {
    setPushError(
      error.response?.data?.message || "Failed to push changes."
    );
  } finally {
    setPushLoading(false);
  }
}

async function handlePull() {
  if (!scanPath.trim()) return;

  const confirmed = window.confirm(
    "Pull latest changes from the remote repository?"
  );

  if (!confirmed) return;

  try {
    setPullLoading(true);
    setPullMessage("");
    setPullError("");

    const response = await api.post("/git-pull", {
      path: scanPath.trim(),
      confirmed: true,
    });

    setPullMessage(
      response.data.data.message || "Changes pulled successfully."
    );

    await loadGitInfo(scanPath.trim());
  } catch (error: any) {
    setPullError(
      error.response?.data?.message || "Failed to pull changes."
    );
  } finally {
    setPullLoading(false);
  }
}

async function loadStashes(path: string) {
  if (!path.trim()) return;

  try {
    setStashLoading(true);
    setStashError("");

    const response = await api.get("/git-stashes", {
      params: { path: path.trim() },
    });

    setStashes(response.data.data.stashes || []);
  } catch (error: any) {
    setStashError(
      error.response?.data?.message || "Failed to load stashes."
    );
  } finally {
    setStashLoading(false);
  }
}

async function handleCreateStash() {
  if (!scanPath.trim()) return;

  try {
    setStashActionLoading(true);
    setStashSuccess("");
    setStashError("");

    const response = await api.post("/git-stash", {
      path: scanPath.trim(),
      message: stashMessage.trim(),
    });

    setStashSuccess(response.data.data.message);
    setStashMessage("");

    await loadStashes(scanPath);
    await loadGitInfo(scanPath);
  } catch (error: any) {
    setStashError(
      error.response?.data?.message || "Failed to create stash."
    );
  } finally {
    setStashActionLoading(false);
  }
}

async function handleStashAction(
  action: "apply" | "pop" | "drop",
  stashRef: string
) {
  if (!scanPath.trim()) return;

  const labels = {
    apply: "apply this stash",
    pop: "apply and remove this stash",
    drop: "permanently delete this stash",
  };

  if (!window.confirm(`Are you sure you want to ${labels[action]}?`)) {
    return;
  }

  try {
    setStashActionLoading(true);
    setStashSuccess("");
    setStashError("");

    let response;

    if (action === "apply" || action === "pop") {
      response = await api.post("/git-stash-apply", {
        path: scanPath.trim(),
        stashRef,
        pop: action === "pop",
      });
    } else {
      response = await api.post("/git-stash-drop", {
        path: scanPath.trim(),
        stashRef,
      });
    }

    setStashSuccess(response.data.data.message);

    await loadStashes(scanPath);
    await loadGitInfo(scanPath);
  } catch (error: any) {
    setStashError(
      error.response?.data?.message ||
        `Failed to ${action} stash.`
    );
  } finally {
    setStashActionLoading(false);
  }
}

async function loadRemoteStatus(path: string) {
  if (!path.trim()) return;

  try {
    setRemoteStatusLoading(true);
    setRemoteStatusError("");

    const response = await api.get("/git-remote-status", {
      params: { path: path.trim() },
    });

    setRemoteStatus(response.data.data);
  } catch (error: any) {
    setRemoteStatus(null);
    setRemoteStatusError(
      error.response?.data?.message || "Failed to fetch remote status."
    );
  } finally {
    setRemoteStatusLoading(false);
  }
}

async function handleFetchLatest() {
  if (!scanPath.trim()) return;

  try {
    setFetchLoading(true);
    setFetchMessage("");
    setFetchError("");

    const response = await api.post("/git-fetch", {
      path: scanPath.trim(),
    });

    setFetchMessage(
      response.data.data.message || "Remote information fetched successfully."
    );

    await loadRemoteStatus(scanPath.trim());
    await loadGitInfo(scanPath.trim());
  } catch (error: any) {
    setFetchError(
      error.response?.data?.message || "Failed to fetch remote changes."
    );
  } finally {
    setFetchLoading(false);
  }
}

// Load Git tags
async function loadGitTags() {
  if (!scanPath.trim()) return;

  try {
    setTagLoading(true);
    setTagError("");

    const response = await api.get("/git-tags", {
      params: { path: scanPath.trim() },
    });

    setGitTags(response.data.data.tags || []);
  } catch (error: any) {
    setTagError(
      error.response?.data?.message || "Failed to load Git tags."
    );
  } finally {
    setTagLoading(false);
  }
}

// Create a tag
async function handleCreateGitTag() {
  if (!tagName.trim()) {
    setTagError("Please enter a tag name.");
    return;
  }

  if (tagType === "annotated" && !tagMessage.trim()) {
    setTagError("Please enter a message for the annotated tag.");
    return;
  }

  try {
    setTagActionLoading(true);
    setTagError("");
    setTagSuccess("");

    const response = await api.post("/git-tags/create", {
      path: scanPath.trim(),
      tagName: tagName.trim(),
      type: tagType,
      message: tagMessage.trim(),
      target: tagTarget.trim() || "HEAD",
    });

    setTagSuccess(response.data.data.message);
    setTagName("");
    setTagMessage("");
    setTagTarget("");

    await loadGitTags();
  } catch (error: any) {
    setTagError(
      error.response?.data?.message || "Failed to create tag."
    );
  } finally {
    setTagActionLoading(false);
  }
}

// Delete a tag
async function handleDeleteGitTag(name: string) {
  if (!window.confirm(`Permanently delete local tag "${name}"?`)) {
    return;
  }

  try {
    setTagActionLoading(true);
    setTagError("");
    setTagSuccess("");

    const response = await api.post("/git-tags/delete", {
      path: scanPath.trim(),
      tagName: name,
      confirmed: true,
    });

    setTagSuccess(response.data.data.message);

    await loadGitTags();
  } catch (error: any) {
    setTagError(
      error.response?.data?.message || "Failed to delete tag."
    );
  } finally {
    setTagActionLoading(false);
  }
}

// Push an individual tag
async function handlePushGitTag(name: string) {
  if (!tagRemote.trim()) {
    setTagError("Enter a remote name.");
    return;
  }

  if (!window.confirm(`Push tag "${name}" to ${tagRemote}?`)) {
    return;
  }

  try {
    setTagActionLoading(true);
    setTagError("");
    setTagSuccess("");

    const response = await api.post("/git-tags/push", {
      path: scanPath.trim(),
      tagName: name,
      remote: tagRemote.trim(),
      confirmed: true,
    });

    setTagSuccess(response.data.data.message);
  } catch (error: any) {
    setTagError(
      error.response?.data?.message || "Failed to push tag."
    );
  } finally {
    setTagActionLoading(false);
  }
}

// Push all tags
async function handlePushAllGitTags() {
  if (!tagRemote.trim()) {
    setTagError("Enter a remote name.");
    return;
  }

  if (gitTags.length === 0) {
    setTagError("There are no tags to push.");
    return;
  }

  if (!window.confirm(`Push all ${gitTags.length} tags to ${tagRemote}?`)) {
    return;
  }

  try {
    setTagActionLoading(true);
    setTagError("");
    setTagSuccess("");

    const response = await api.post("/git-tags/push-all", {
      path: scanPath.trim(),
      remote: tagRemote.trim(),
      confirmed: true,
    });

    setTagSuccess(response.data.data.message);
  } catch (error: any) {
    setTagError(
      error.response?.data?.message || "Failed to push all tags."
    );
  } finally {
    setTagActionLoading(false);
  }
}

const loadGitOperationStatus = async () => {
  if (!scanPath.trim()) return;

  try {
    const response = await api.get("/git-operation-status", {
      params: { path: scanPath.trim() },
    });

    setGitOperationStatus(response.data.data);
  } catch (error) {
    console.error("Failed to load Git operation status:", error);
  }
};

const handleGitOperation = async (
  action: "cherry-pick" | "revert"
) => {
  if (!scanPath.trim() || !operationCommitHash.trim()) {
    setOperationError("Enter a commit hash first.");
    return;
  }

  const confirmed = window.confirm(
    action === "cherry-pick"
      ? `Cherry-pick commit ${operationCommitHash}?`
      : `Revert commit ${operationCommitHash}?`
  );

  if (!confirmed) return;

  setOperationLoading(true);
  setOperationError("");
  setOperationMessage("");

  try {
    const endpoint =
      action === "cherry-pick" ? "/git-cherry-pick" : "/git-revert";

    const response = await api.post(endpoint, {
      path: scanPath.trim(),
      commitHash: operationCommitHash.trim(),
    });

    const result = response.data.data;

    setOperationMessage(result.message);
    setGitOperationStatus({
      inProgress: result.inProgress,
      operation: result.operation,
      hasConflicts: result.hasConflicts,
      conflicts: result.conflicts,
    });

    if (!result.inProgress) {
      setOperationCommitHash("");
      await loadGitInfo(scanPath.trim());
      await loadCommitHistory(1);
    }
  } catch (error: any) {
    setOperationError(
      error.response?.data?.message || "Git operation failed."
    );
    await loadGitOperationStatus();
  } finally {
    setOperationLoading(false);
  }
};

const handleContinueGitOperation = async () => {
  const operation = gitOperationStatus.operation;
  if (!operation) return;

  setOperationLoading(true);
  setOperationError("");
  setOperationMessage("");

  try {
    const endpoint =
      operation === "cherry-pick"
        ? "/git-cherry-pick/continue"
        : "/git-revert/continue";

    const response = await api.post(endpoint, {
      path: scanPath.trim(),
    });

    setOperationMessage(response.data.data.message);

    await loadGitOperationStatus();
    await loadGitInfo(scanPath.trim());
    await loadCommitHistory(1);
  } catch (error: any) {
    setOperationError(
      error.response?.data?.message || "Could not continue operation."
    );
    await loadGitOperationStatus();
  } finally {
    setOperationLoading(false);
  }
};

const handleAbortGitOperation = async () => {
  const operation = gitOperationStatus.operation;
  if (!operation) return;

  const confirmed = window.confirm(
    `Are you sure you want to abort this ${operation} operation?`
  );

  if (!confirmed) return;

  setOperationLoading(true);
  setOperationError("");
  setOperationMessage("");

  try {
    const endpoint =
      operation === "cherry-pick"
        ? "/git-cherry-pick/abort"
        : "/git-revert/abort";

    const response = await api.post(endpoint, {
      path: scanPath.trim(),
    });

    setOperationMessage(response.data.data.message);

    await loadGitOperationStatus();
    await loadGitInfo(scanPath.trim());
    await loadCommitHistory(1);
  } catch (error: any) {
    setOperationError(
      error.response?.data?.message || "Could not abort operation."
    );
  } finally {
    setOperationLoading(false);
  }
};

  async function handleScan() {
    if (!scanPath.trim()) {
      setScanError("Please enter a project folder path.");
      return;
    }

    setScanLoading(true);
    setScanError("");
    setScanResult(null);
    setSelectedFilePath(null);
    setFileSearch("");
    setGraphFilter("all");

    try {
      const response = await api.post("/scan", {
        path: scanPath.trim(),
      });

      
const result = response.data as ScanResult;
setScanResult(result);

if (result.success) {
  await loadGitInfo(scanPath.trim());
  await loadBranches();
  await loadCommitHistory(1);
  await loadGitTags();
  await loadGitOperationStatus();
}
if (result.success) {
  const normalizedPath = result.root.replace(/[\\/]+$/, "").toLowerCase();

  const projectName =
    normalizedPath.split(/[\\/]/).filter(Boolean).pop() || result.root;

  const extensionList = [
    ...new Set(
      result.sourceFiles
        .filter((file) => !file.skipped)
        .map((file) => file.extension.toLowerCase()),
    ),
  ];

  const language =
    extensionList.some((ext) => [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext))
      ? "JavaScript / TypeScript"
      : extensionList.join(", ") || "Unknown";

  const project: RecentProject = {
    name: projectName,
    path: result.root,
    language,
    status: "Scanned",
    color: "text-blue-400",
    dot: "bg-emerald-400",
    lastScanned: new Date().toLocaleString(),
    analyzedFiles: result.analyzedFiles,
    dependencyCount: result.dependencyCount,
  };

  setRecentProjects((previous) => {
    const updated = [
      project,
      ...previous.filter(
        (item) => item.path.toLowerCase() !== normalizedPath,
      ),
    ].slice(0, 10);

    try {
      localStorage.setItem(
        "codebase-xray-history",
        JSON.stringify(updated),
      );
    } catch (error) {
      console.error("Unable to save scan history:", error);
    }

    return updated;
  });
}

      if (!result.success && !result.sourceFiles) {
        setScanError("The scanner returned an unexpected response.");
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? (error as {
              response?: { data?: { message?: string } };
            }).response?.data?.message
          : undefined;

      setScanError(
        message ||
          "Scan failed. Check that the backend is running and the folder path is valid.",
      );
    } finally {
      setScanLoading(false);
    }
  }

  const filteredProjects = recentProjects.filter((project) =>
    `${project.name} ${project.language} ${project.path}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const filteredFiles = useMemo(() => {
    if (!scanResult) return [];
    const query = fileSearch.trim().toLowerCase();

    return scanResult.sourceFiles.filter((file) => {
      if (!query) return true;
      return `${file.path} ${file.extension} ${file.imports.join(" ")}`
        .toLowerCase()
        .includes(query);
    });
  }, [scanResult, fileSearch]);

  const graphFiles = useMemo(() => {
    if (!scanResult) return [];

    const searchedPaths = new Set(filteredFiles.map((file) => file.path));

    if (graphFilter === "all" || !selectedFilePath) {
      return scanResult.sourceFiles.filter((file) =>
        searchedPaths.has(file.path),
      );
    }

    const selectedFile = scanResult.sourceFiles.find(
      (file) => file.path === selectedFilePath,
    );

    const connectedPaths = new Set<string>([selectedFilePath]);

    selectedFile?.localDependencies.forEach((path) => {
      connectedPaths.add(path);
    });

    scanResult.sourceFiles.forEach((file) => {
      if (file.localDependencies.includes(selectedFilePath)) {
        connectedPaths.add(file.path);
      }
    });

    return scanResult.sourceFiles.filter(
      (file) =>
        searchedPaths.has(file.path) && connectedPaths.has(file.path),
    );
  }, [scanResult, filteredFiles, graphFilter, selectedFilePath]);

  const selectedFile = scanResult?.sourceFiles.find(
    (file) => file.path === selectedFilePath,
  );
  const selectedFileDependencies = useMemo(() => {
  if (!scanResult || !selectedFile) {
    return {
      imports: [],
      usedBy: [],
    };
  }

  const imports = selectedFile.localDependencies
    .map((path) =>
      scanResult.sourceFiles.find((file) => file.path === path),
    )
    .filter((file) => file !== undefined);

  const usedBy = scanResult.sourceFiles.filter(
    (file) =>
      !file.skipped &&
      file.localDependencies.includes(selectedFile.path),
  );

  return {
    imports,
    usedBy,
  };
}, [scanResult, selectedFile]);

const impactAnalysis = useMemo(() => {
  if (!scanResult || !selectedFile) {
    return {
      affectedFiles: [] as ScannedFile[],
      directCount: 0,
      totalCount: 0,
    };
  }

  const affectedPaths = new Set<string>();
  const visited = new Set<string>([selectedFile.path]);
  const queue = [selectedFile.path];

  while (queue.length > 0) {
    const currentPath = queue.shift()!;

    const dependents = scanResult.sourceFiles.filter(
      (file) =>
        !file.skipped &&
        file.localDependencies.includes(currentPath),
    );

    for (const dependent of dependents) {
      if (!visited.has(dependent.path)) {
        visited.add(dependent.path);
        affectedPaths.add(dependent.path);
        queue.push(dependent.path);
      }
    }
  }

  const affectedFiles = scanResult.sourceFiles.filter((file) =>
    affectedPaths.has(file.path),
  );

  const directCount = scanResult.sourceFiles.filter(
    (file) =>
      !file.skipped &&
      file.localDependencies.includes(selectedFile.path),
  ).length;

  return {
    affectedFiles,
    directCount,
    totalCount: affectedFiles.length,
  };
}, [scanResult, selectedFile]);

  
const dependencyHotspots = useMemo(() => {
  if (!scanResult) return [];

  return scanResult.sourceFiles
    .filter((file) => !file.skipped)
    .map((file) => ({
      ...file,
      dependentCount: scanResult.sourceFiles.filter(
        (otherFile) =>
          !otherFile.skipped &&
          otherFile.localDependencies.includes(file.path),
      ).length,
    }))
    .filter((file) => file.dependentCount > 0)
    .sort((a, b) => b.dependentCount - a.dependentCount)
    .slice(0, 5);
}, [scanResult]);


const orphanFiles = useMemo(() => {
  if (!scanResult) return [];

  const importedPaths = new Set(
    scanResult.sourceFiles.flatMap(
      (file) => file.localDependencies
    ),
  );

  return scanResult.sourceFiles.filter(
    (file) =>
      !file.skipped &&
      !importedPaths.has(file.path),
  );
}, [scanResult]);

const fileRiskScores = useMemo(() => {
  if (!scanResult) return [];

  return scanResult.sourceFiles
    .filter((file) => !file.skipped)
    .map((file) => {
      const dependentCount = scanResult.sourceFiles.filter(
        (otherFile) =>
          !otherFile.skipped &&
          otherFile.localDependencies.includes(file.path),
      ).length;

      const hasCircularDependency =
        scanResult.circularDependencies.some((cycle) =>
          cycle.includes(file.path),
        );

      const isUnreferenced = orphanFiles.some(
        (orphan) => orphan.path === file.path,
      );

      let score = 0;

      if (hasCircularDependency) score += 50;
      if (dependentCount >= 5) score += 25;
      else if (dependentCount >= 3) score += 15;
      if (isUnreferenced) score += 10;

      return {
        ...file,
        dependentCount,
        hasCircularDependency,
        isUnreferenced,
        riskScore: Math.min(score, 100),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);
}, [scanResult, orphanFiles]);

const diffSummary = useMemo(() => {
  if (!gitDiff?.diff) {
    return { additions: 0, deletions: 0 };
  }

  const lines = gitDiff.diff.split("\n");

  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }

  return { additions, deletions };
}, [gitDiff]);

  function selectFile(path: string) {
    setSelectedFilePath(path);
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-gray-200">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0e1014] md:flex">
          <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.08] px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-[#07110c]">
              <Command size={21} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-white">
                Codebase X-Ray
              </h1>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-gray-500">
                Code intelligence
              </p>
            </div>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Workspace
            </p>
            <nav className="space-y-1">
              <button className="flex w-full items-center gap-3 rounded-lg border border-emerald-400/10 bg-emerald-400/[0.09] px-3 py-2.5 text-left text-sm font-medium text-emerald-300">
                <LayoutDashboard size={17} />
                Overview
                <ChevronRight size={15} className="ml-auto" />
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("codebases")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <Boxes size={17} />
                Codebases
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("dependency-graph")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <Network size={17} />
                Dependency graph
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("selected-file-details")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <GitBranch size={17} />
                File details
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("code-insights")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <ShieldCheck size={17} />
                Code insights
              </button>
            </nav>
          </div>

          <div className="px-4 pt-8">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Tools
            </p>
            <nav className="space-y-1">
              <button
                onClick={() =>
                  document
                    .getElementById("file-search")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <Files size={17} />
                File explorer
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("scanner")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <Settings2 size={17} />
                Scanner settings
              </button>
            </nav>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#14171c] p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">AI insights</p>
                  <p className="text-[11px] text-gray-500">Coming soon</p>
                </div>
              </div>
              <p className="text-xs leading-5 text-gray-400">
                Understand your codebase with intelligent code analysis.
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full w-[35%] rounded-full bg-violet-400/70" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 px-2 text-xs text-gray-500">
              <CircleHelp size={15} />
              Help & documentation
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-8">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                Workspace
                <ChevronRight size={13} />
                <span className="text-gray-300">Overview</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
                Dashboard
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex w-full max-w-[230px] items-center gap-2 rounded-lg border border-white/[0.09] bg-[#111419] px-3 py-2 sm:w-[230px]">
                <Search size={16} className="shrink-0 text-gray-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search codebases..."
                  className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                />
              </label>
              <button
                aria-label="Notifications"
                className="relative rounded-lg border border-white/[0.09] p-2.5 text-gray-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Bell size={17} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </button>
              <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#1a2026] text-sm font-semibold text-white sm:flex">
                K
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-7 p-5 sm:p-8">
            <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1 text-xs text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Your code intelligence workspace
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Understand your codebase.
                  <br className="hidden sm:block" />{" "}
                  <span className="text-gray-500">Before you change it.</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
                  Map dependencies, discover related files, and understand the
                  impact of code changes from one workspace.
                </p>
              </div>
              <button
                onClick={() =>
                  document
                    .getElementById("scanner")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#07110c] transition hover:bg-emerald-300"
              >
                <Plus size={17} />
                Scan a codebase
                <ArrowRight size={15} />
              </button>
            </section>

            <section
              className={`flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
                apiStatus === "connected"
                  ? "border-emerald-400/20 bg-emerald-400/[0.045]"
                  : apiStatus === "error"
                    ? "border-red-400/20 bg-red-400/[0.045]"
                    : "border-amber-400/20 bg-amber-400/[0.045]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    apiStatus === "connected"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : apiStatus === "error"
                        ? "bg-red-400/10 text-red-300"
                        : "bg-amber-400/10 text-amber-300"
                  }`}
                >
                  {apiStatus === "connected" ? (
                    <CheckCircle2 size={19} />
                  ) : apiStatus === "error" ? (
                    <XCircle size={19} />
                  ) : (
                    <LoaderCircle size={19} className="animate-spin" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Backend connection
                  </p>
                  <p className="mt-1 break-words text-xs text-gray-400">
                    {apiMessage}
                  </p>
                </div>
              </div>
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                  apiStatus === "connected"
                    ? "bg-emerald-400/10 text-emerald-300"
                    : apiStatus === "error"
                      ? "bg-red-400/10 text-red-300"
                      : "bg-amber-400/10 text-amber-300"
                }`}
              >
                {apiStatus === "connected"
                  ? "Connected"
                  : apiStatus === "error"
                    ? "Disconnected"
                    : "Connecting"}
              </span>
            </section>

            <section
              id="scanner"
              className="rounded-xl border border-white/[0.08] bg-[#111419] p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                  <Search size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Scan a codebase
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter a local project folder path to analyze its source
                    files.
                  </p>
                </div>
              </div>

              <form
                className="mt-5 flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleScan();
                }}
              >
                <input
                  value={scanPath}
                  onChange={(event) => setScanPath(event.target.value)}
                  placeholder="Enter project folder path"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b0d10] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/50"
                />
                <button
                  type="submit"
                  disabled={scanLoading || apiStatus !== "connected"}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#07110c] hover:bg-emerald-300 disabled:opacity-50"
                >
                  {scanLoading ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  {scanLoading ? "Scanning..." : "Scan codebase"}
                </button>
              </form>

              {scanError && (
                <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">
                  {scanError}
                </p>
              )}

              {scanResult && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-white/[0.08] p-4">
                    <p className="text-xs text-gray-500">Total files found</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {scanResult.totalFiles}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.08] p-4">
                    <p className="text-xs text-gray-500">Source files analyzed</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {scanResult.analyzedFiles}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.08] p-4">
                    <p className="text-xs text-gray-500">Local dependencies</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {scanResult.dependencyCount}
                    </p>
                    <div className="rounded-lg border border-white/[0.08] p-4">
  <p className="text-xs text-gray-500">Circular dependencies</p>

  <p
    className={`mt-2 text-2xl font-semibold ${
      scanResult.circularDependencyCount > 0
        ? "text-red-400"
        : "text-emerald-300"
    }`}
  >
    {scanResult.circularDependencyCount}
  </p>

  <p className="mt-1 text-xs text-gray-500">
    {scanResult.circularDependencyCount > 0
      ? "Dependency cycles detected"
      : "No cycles detected"}
  </p>
</div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-white/[0.08] bg-[#111419] p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <div className="flex items-center gap-2">
        <GitBranch size={18} className="text-emerald-300" />
        <h2 className="text-sm font-semibold text-white">Git Integration</h2>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Repository status, changed files and recent commits.
      </p>
    </div>

    <button
      type="button"
      onClick={() => void loadGitInfo(scanPath.trim())}
      disabled={gitLoading}
      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
    >
      {gitLoading ? "Refreshing..." : "Refresh Git"}
    </button>
  </div>

  {gitLoading ? (
    <p className="mt-5 text-sm text-gray-400">Loading Git information...</p>
  ) : gitError ? (
    <p className="mt-5 text-sm text-red-300">{gitError}</p>
  ) : !gitInfo ? (
    <p className="mt-5 text-sm text-gray-500">
      Scan a codebase to load its Git information.
    </p>
  ) : !gitInfo.isGitRepo ? (
    <p className="mt-5 text-sm text-gray-400">
      This folder is not inside a Git repository.
    </p>

    
  ) : (
    <>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/[0.07] p-4">
          <p className="text-xs text-gray-500">Current branch</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-emerald-300">
            <GitBranch size={16} />
            {gitInfo.branch}
          </p>
        </div>

        {gitInfo && (
  <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-white">
          Git Changes
        </h3>
        <p className="text-sm text-slate-400">
          Select files to stage or unstage before committing.
        </p>
      </div>

      <button
        type="button"
        onClick={() => loadGitInfo(scanPath.trim())}
        disabled={gitLoading || gitActionLoading}
        className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        Refresh
      </button>
    </div>

    {gitInfo.changedFiles.length === 0 ? (
      <p className="rounded-lg bg-slate-800/60 p-4 text-sm text-slate-400">
        Working tree clean. No changed files.
      </p>
    ) : (
      <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-400">
            {gitInfo.changedFiles.length} changed file(s)
          </span>

          <button
            type="button"
            onClick={() =>
              toggleAllGitFiles(
                gitInfo.changedFiles.map((file) => file.path)
              )
            }
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {gitInfo.changedFiles.every((file) =>
              selectedGitFiles.includes(file.path)
            )
              ? "Deselect all"
              : "Select all"}
          </button>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {gitInfo.changedFiles.map((file) => {
            const isStaged = Boolean(file.index.trim());
            const isUnstaged = Boolean(file.workingTree.trim());

            const status = isStaged
              ? "Staged"
              : isUnstaged
                ? "Unstaged"
                : "Changed";

            return (
              <label
                key={file.path}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedGitFiles.includes(file.path)}
                    onChange={() => toggleGitFile(file.path)}
                    className="h-4 w-4 accent-blue-500"
                  />

                  <span className="truncate text-sm text-slate-200">
                    {file.path}
                  </span>
                </div>

                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-xs ${
                    isStaged
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {status}
                </span>
              </label>
            );
          })}
        </div>
      </>
    )}

    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleStageFiles}
        disabled={gitActionLoading || selectedGitFiles.length === 0}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        Stage Selected
      </button>

      <button
        type="button"
        onClick={handleUnstageFiles}
        disabled={gitActionLoading || selectedGitFiles.length === 0}
        className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        Unstage Selected
      </button>
    </div>

    <div className="mt-5 border-t border-slate-700 pt-5">
      <label className="mb-2 block text-sm font-medium text-slate-200">
        Commit Message
      </label>

      <input
        type="text"
        value={commitMessage}
        onChange={(event) => setCommitMessage(event.target.value)}
        placeholder="e.g. Add Git staging workflow"
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
      />

      <button
        type="button"
        onClick={handleCreateCommit}
        disabled={gitActionLoading || !commitMessage.trim()}
        className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {gitActionLoading ? "Processing..." : "Create Commit"}
      </button>
    </div>

    {gitActionMessage && (
      <p className="mt-3 text-sm text-emerald-400">
        {gitActionMessage}
      </p>
    )}

    {gitActionError && (
      <p className="mt-3 text-sm text-red-400">
        {gitActionError}
      </p>
    )}
  </div>
)}

<div className="mt-4 flex flex-wrap items-center gap-3">
  <button
    onClick={handlePush}
   disabled={pushLoading || !scanPath.trim()}
    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {pushLoading ? "Pushing..." : "Push to Remote"}
  </button>

  {pushMessage && (
    <p className="text-sm text-green-600">{pushMessage}</p>
  )}

  {pushError && (
    <p className="text-sm text-red-600">{pushError}</p>
  )}
</div>


<div className="mt-4 flex flex-wrap items-center gap-3">
  <button
    onClick={handlePull}
    disabled={pullLoading || !scanPath.trim()}
    className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {pullLoading ? "Pulling..." : "Pull from Remote"}
  </button>

  {pullMessage && (
    <p className="text-sm text-green-600">{pullMessage}</p>
  )}

  {pullError && (
    <p className="text-sm text-red-600">{pullError}</p>
  )}
</div>

{/* Remote Status */}
<div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 className="text-sm font-semibold text-white">Remote Status</h3>
      <p className="mt-1 text-xs text-gray-500">
        Track your local branch against the remote repository.
      </p>
    </div>
    

    <button
      type="button"
      onClick={() => loadRemoteStatus(scanPath)}
      disabled={remoteStatusLoading || !scanPath.trim()}
      className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {remoteStatusLoading ? "Refreshing..." : "Refresh Status"}
    </button>
  </div>

  {remoteStatusError && (
    <p className="mt-4 text-sm text-red-400">{remoteStatusError}</p>
  )}

  {!remoteStatus && !remoteStatusLoading && !remoteStatusError && (
    <p className="mt-4 text-xs text-gray-500">
      Click Refresh Status to load repository information.
    </p>
  )}

  {remoteStatus && (
    <>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/[0.07] p-3">
          <p className="text-xs text-gray-500">Current Branch</p>
          <p className="mt-2 break-all text-sm font-semibold text-white">
            {remoteStatus.branch || "No branch"}
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.07] p-3">
          <p className="text-xs text-gray-500">Ahead</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">
            {remoteStatus.ahead}
          </p>
          <p className="text-xs text-gray-500">Commits to push</p>
        </div>

        <div className="rounded-lg border border-white/[0.07] p-3">
          <p className="text-xs text-gray-500">Behind</p>
          <p className="mt-2 text-2xl font-semibold text-sky-300">
            {remoteStatus.behind}
          </p>
          <p className="text-xs text-gray-500">Commits to pull</p>
        </div>

        <div className="rounded-lg border border-white/[0.07] p-3">
          <p className="text-xs text-gray-500">Working Tree</p>
          <p className={`mt-2 text-sm font-semibold ${
            remoteStatus.isClean ? "text-emerald-400" : "text-amber-300"
          }`}>
            {remoteStatus.isClean ? "Clean" : "Changes detected"}
          </p>
        </div>
      </div>

      <button
  type="button"
  onClick={handleFetchLatest}
  disabled={fetchLoading || !scanPath.trim()}
  className="rounded-lg bg-sky-600 px-3 py-2 text-xs text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
>
  {fetchLoading ? "Fetching..." : "Fetch Latest"}
</button>
{fetchMessage && (
  <p className="mt-3 text-sm text-green-400">{fetchMessage}</p>
)}

{fetchError && (
  <p className="mt-3 text-sm text-red-400">{fetchError}</p>
)}

      <div className="mt-4 border-t border-white/[0.07] pt-4">
        <p className="mb-2 text-xs font-medium text-gray-400">Remotes</p>

        {remoteStatus.remotes.length === 0 ? (
          <p className="text-xs text-amber-300">No remote configured.</p>
        ) : (
          <div className="space-y-2">
            {remoteStatus.remotes.map((remote: any) => (
              <div
                key={remote.name}
                className="rounded-lg bg-white/[0.03] p-3"
              >
                <p className="text-xs font-semibold text-white">
                  {remote.name}
                </p>
                <p className="mt-1 break-all text-xs text-gray-500">
                  Fetch: {remote.fetchUrl}
                </p>
                <p className="mt-1 break-all text-xs text-gray-500">
                  Push: {remote.pushUrl}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Tracking branch: {remoteStatus.tracking || "No upstream configured"}
        </p>
      </div>
    </>
  )}
</div>

<div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 className="text-lg font-semibold text-white">
        Git Stash Management
      </h3>
      <p className="mt-1 text-sm text-gray-400">
        Temporarily save and restore your uncommitted changes.
      </p>
    </div>

    <button
      onClick={() => loadStashes(scanPath)}
      disabled={stashLoading || !scanPath.trim()}
      className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50"
    >
      {stashLoading ? "Refreshing..." : "Refresh Stashes"}
    </button>
  </div>

  <div className="flex flex-col gap-3 sm:flex-row">
    <input
      type="text"
      value={stashMessage}
      onChange={(e) => setStashMessage(e.target.value)}
      placeholder="Enter stash message (optional)"
      className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
    />

    <button
      onClick={handleCreateStash}
      disabled={stashActionLoading || !scanPath.trim()}
      className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {stashActionLoading ? "Please wait..." : "Stash Changes"}
    </button>
  </div>

  {stashSuccess && (
    <p className="rounded-lg border border-green-800 bg-green-950/40 p-3 text-sm text-green-400">
      {stashSuccess}
    </p>
  )}

  {stashError && (
    <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-400">
      {stashError}
    </p>
  )}

  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="font-medium text-white">
        Saved Stashes
      </h4>
      <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
        {stashes.length} total
      </span>
    </div>

    {stashLoading && stashes.length === 0 ? (
      <p className="py-6 text-center text-sm text-gray-400">
        Loading stashes...
      </p>
    ) : stashes.length === 0 ? (
      <div className="rounded-lg border border-dashed border-gray-700 py-8 text-center">
        <p className="text-sm text-gray-300">No stashes found</p>
        <p className="mt-1 text-xs text-gray-500">
          Your saved changes will appear here.
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {stashes.map((stash) => (
          <div
            key={stash.ref}
            className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800/60 p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-blue-400">
                {stash.ref}
              </p>
              <p className="mt-1 break-words text-sm text-gray-300">
                {stash.message}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStashAction("apply", stash.ref)}
                disabled={stashActionLoading}
                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>

              <button
                onClick={() => handleStashAction("pop", stash.ref)}
                disabled={stashActionLoading}
                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Pop
              </button>

              <button
                onClick={() => handleStashAction("drop", stash.ref)}
                disabled={stashActionLoading}
                className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Drop
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</div>

{/* Git Tags Management */}
<div className="mt-6 rounded-xl border border-white/[0.08] bg-[#111419] p-5 space-y-5">

  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <div className="flex items-center gap-2">
        <GitBranch size={18} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-white">
          Git Tags Management
        </h3>
      </div>

      <p className="mt-1 text-sm text-gray-400">
        Create release versions, manage tags and publish them to remote.
      </p>
    </div>

    <button
      type="button"
      onClick={loadGitTags}
      disabled={tagLoading || !scanPath.trim()}
      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
    >
      {tagLoading ? "Refreshing..." : "Refresh Tags"}
    </button>
  </div>

  {/* Create Tag */}
  <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 space-y-4">

    <h4 className="text-sm font-semibold text-white">
      Create New Tag
    </h4>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

      <input
        type="text"
        value={tagName}
        onChange={(e) => setTagName(e.target.value)}
        placeholder="Tag name (e.g. v1.0.0)"
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-sm text-white outline-none focus:border-purple-500"
      />

      <select
        value={tagType}
        onChange={(e) =>
          setTagType(e.target.value as "lightweight" | "annotated")
        }
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-sm text-white outline-none focus:border-purple-500"
      >
        <option value="annotated">Annotated Tag</option>
        <option value="lightweight">Lightweight Tag</option>
      </select>

    </div>

    {tagType === "annotated" && (
      <textarea
        value={tagMessage}
        onChange={(e) => setTagMessage(e.target.value)}
        placeholder="Enter tag message (e.g. Stable release version 1.0.0)"
        rows={3}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-sm text-white outline-none focus:border-purple-500"
      />
    )}

    <input
      type="text"
      value={tagTarget}
      onChange={(e) => setTagTarget(e.target.value)}
      placeholder="Target commit hash (optional, default: HEAD)"
      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-3 text-sm text-white outline-none focus:border-purple-500"
    />

    <button
      type="button"
      onClick={handleCreateGitTag}
      disabled={tagActionLoading || !tagName.trim() || !scanPath.trim()}
      className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
    >
      {tagActionLoading ? "Processing..." : "Create Tag"}
    </button>

  </div>

  {/* Remote Push */}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

    <input
      type="text"
      value={tagRemote}
      onChange={(e) => setTagRemote(e.target.value)}
      placeholder="Remote name (origin)"
      className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
    />

    <button
      type="button"
      onClick={handlePushAllGitTags}
      disabled={tagActionLoading || gitTags.length === 0 || !scanPath.trim()}
      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      Push All Tags
    </button>

  </div>

  {tagSuccess && (
    <p className="rounded-lg border border-green-800 bg-green-950/40 p-3 text-sm text-green-400">
      {tagSuccess}
    </p>
  )}

  {tagError && (
    <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-400">
      {tagError}
    </p>
  )}

  {/* Tag List */}
  <div className="space-y-3">

    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-white">
        Available Tags
      </h4>

      <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
        {gitTags.length} total
      </span>
    </div>

    {tagLoading && gitTags.length === 0 ? (
      <p className="py-6 text-center text-sm text-gray-400">
        Loading tags...
      </p>
    ) : gitTags.length === 0 ? (
      <div className="rounded-lg border border-dashed border-gray-700 py-8 text-center">
        <p className="text-sm text-gray-300">
          No Git tags found
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Create your first tag to mark a release or milestone.
        </p>
      </div>
    ) : (
      <div className="space-y-3">

        {gitTags.map((tag) => (
          <div
            key={tag.name}
            className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4"
          >

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <span className="font-semibold text-purple-300">
                    {tag.name}
                  </span>

                  <span
                    className={`rounded-md px-2 py-1 text-[10px] ${
                      tag.type === "annotated"
                        ? "bg-blue-500/10 text-blue-300"
                        : "bg-gray-500/10 text-gray-300"
                    }`}
                  >
                    {tag.type}
                  </span>

                </div>

                {tag.message && (
                  <p className="mt-2 break-words text-sm text-gray-300">
                    {tag.message}
                  </p>
                )}

                <p className="mt-2 break-all font-mono text-xs text-gray-500">
                  Commit: {tag.commitHash}
                </p>

                {tag.tagger && (
                  <p className="mt-1 text-xs text-gray-500">
                    Tagger: {tag.tagger}
                  </p>
                )}

                {tag.date && (
                  <p className="mt-1 text-xs text-gray-500">
                    Created: {tag.date}
                  </p>
                )}

              </div>

              <div className="flex shrink-0 flex-wrap gap-2">

                <button
                  type="button"
                  onClick={() => handlePushGitTag(tag.name)}
                  disabled={tagActionLoading}
                  className="rounded-md bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Push
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteGitTag(tag.name)}
                  disabled={tagActionLoading}
                  className="rounded-md bg-red-600/10 px-3 py-2 text-xs text-red-400 hover:bg-red-600/20 disabled:opacity-50"
                >
                  Delete
                </button>

              </div>

            </div>

          </div>
        ))}

      </div>
    )}

  </div>
</div>

{/* Cherry-pick & Revert */}
<section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
  <div className="flex items-center gap-3">
    <div className="p-2 bg-indigo-100 rounded-lg">
      <GitBranch className="w-5 h-5 text-indigo-600" />
    </div>

    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        Cherry-pick & Revert
      </h2>
      <p className="text-sm text-gray-500">
        Apply a specific commit or safely undo its changes.
      </p>
    </div>
  </div>

  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      Commit Hash
    </label>

    <input
      type="text"
      value={operationCommitHash}
      onChange={(e) => setOperationCommitHash(e.target.value)}
      placeholder="Enter commit hash (e.g. a1b2c3d)"
      disabled={operationLoading || gitOperationStatus.inProgress}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />

    <p className="text-xs text-gray-500">
      Copy the commit hash from your Git Commit History section.
    </p>
  </div>

  <div className="flex flex-wrap gap-3">
    <button
      onClick={() => handleGitOperation("cherry-pick")}
      disabled={
        operationLoading ||
        gitOperationStatus.inProgress ||
        !operationCommitHash.trim()
      }
      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
    >
      {operationLoading ? "Processing..." : "Cherry-pick Commit"}
    </button>

    <button
      onClick={() => handleGitOperation("revert")}
      disabled={
        operationLoading ||
        gitOperationStatus.inProgress ||
        !operationCommitHash.trim()
      }
      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
    >
      {operationLoading ? "Processing..." : "Revert Commit"}
    </button>
  </div>

  {operationMessage && (
    <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
      {operationMessage}
    </div>
  )}

  {operationError && (
    <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
      {operationError}
    </div>
  )}

  {gitOperationStatus.inProgress && (
    <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-yellow-900">
          {gitOperationStatus.operation === "cherry-pick"
            ? "Cherry-pick in progress"
            : "Revert in progress"}
        </h3>

        <p className="text-sm text-yellow-800 mt-1">
          {gitOperationStatus.hasConflicts
            ? "Conflicts detected. Resolve them in your editor, save the files, and then continue."
            : "Operation is in progress. You can continue or abort it."}
        </p>
      </div>

      {gitOperationStatus.conflicts.length > 0 && (
        <div>
          <p className="text-sm font-medium text-yellow-900 mb-2">
            Conflicting files:
          </p>

          <ul className="list-disc pl-5 text-sm text-yellow-800 space-y-1">
            {gitOperationStatus.conflicts.map((file) => (
              <li key={file} className="break-all">
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleContinueGitOperation}
          disabled={operationLoading || gitOperationStatus.hasConflicts}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        >
          Continue Operation
        </button>

        <button
          onClick={loadGitOperationStatus}
          disabled={operationLoading}
          className="px-4 py-2 bg-white border border-yellow-400 text-yellow-900 rounded-lg text-sm hover:bg-yellow-100 disabled:opacity-50"
        >
          Refresh Status
        </button>

        <button
          onClick={handleAbortGitOperation}
          disabled={operationLoading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
        >
          Abort Operation
        </button>
      </div>
    </div>
  )}

  <p className="text-xs text-gray-500">
    Cherry-pick and Revert create new commits. Existing commit history is preserved.
  </p>
</section>

        <div className="rounded-lg border border-white/[0.07] p-4">
          <p className="text-xs text-gray-500">Changed files</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {gitInfo.changedFiles.length}
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.07] p-4">
          <p className="text-xs text-gray-500">Recent commits</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {gitInfo.recentCommits.length}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-medium text-white">
            Changed Files
          </h3>

          {gitInfo.changedFiles.length === 0 ? (
            <p className="text-xs text-gray-500">Working tree is clean.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {gitInfo.changedFiles.map((file) => {
                const status =
                  file.index === "?" || file.workingTree === "?"
                    ? "Untracked"
                    : file.index === "D" || file.workingTree === "D"
                      ? "Deleted"
                      : file.index === "A" || file.workingTree === "A"
                        ? "Added"
                        : "Modified";

                const statusColor =
                  status === "Deleted"
                    ? "text-red-300 bg-red-400/10"
                    : status === "Untracked"
                      ? "text-amber-300 bg-amber-400/10"
                      : status === "Added"
                        ? "text-emerald-300 bg-emerald-400/10"
                        : "text-sky-300 bg-sky-400/10";

                return (
                  <div
                    key={file.path}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.07] p-3"
                  >
                    <span className="break-all text-xs text-gray-300">
                      {file.path}
                    </span>
                    <span className={`rounded px-2 py-1 text-[10px] ${statusColor}`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
  <h3 className="mb-3 text-sm font-medium text-white">
    Recent Commits
  </h3>

  {commitHistory.length === 0 && !historyLoading ? (
    <p className="text-xs text-gray-500">No commits found.</p>
  ) : (
    <div className="space-y-3">
      {commitHistory.map((commit) => (
        <div
          key={commit.hash}
          className={`w-full rounded-lg border p-3 transition ${
            selectedCommit === commit.hash
              ? "border-sky-500 bg-sky-500/10"
              : "border-white/[0.07] hover:border-sky-500/50 hover:bg-white/[0.03]"
          }`}
        >
          <p className="text-sm text-gray-200">{commit.message}</p>

          <p className="mt-2 text-xs text-gray-500">
            {commit.author} · {new Date(commit.date).toLocaleString()}
          </p>

          <p className="mt-1 font-mono text-[10px] text-gray-600">
            {commit.hash.slice(0, 8)}
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadCommitDiff(commit.hash)}
              disabled={commitDiffLoading}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              View commit diff
            </button>

            <button
              type="button"
              onClick={() => loadCommitFiles(commit.hash)}
              disabled={commitFilesLoading}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              View changed files
            </button>
          </div>

          {selectedCommit === commit.hash && (
            <p className="mt-2 text-xs text-sky-400">
              Selected commit
            </p>
          )}
        </div>
      ))}
    </div>
  )}

  {historyError && (
    <p className="mt-3 text-xs text-red-400">{historyError}</p>
  )}

  {historyLoading && (
    <p className="mt-3 text-xs text-gray-400">
      Loading commit history...
    </p>
  )}

  {hasMoreCommits && !historyLoading && (
    <button
      type="button"
      onClick={() => loadCommitHistory(commitPage + 1)}
      className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-sky-400 hover:bg-white/[0.04]"
    >
      Load More Commits
    </button>
  )}

  {commitFilesError && (
    <p className="mt-3 text-xs text-red-400">{commitFilesError}</p>
  )}

  {commitFilesLoading && (
    <p className="mt-3 text-xs text-gray-400">
      Loading changed files...
    </p>
  )}

  {commitFiles.length > 0 && (
    <div className="mt-4 rounded-lg border border-white/[0.07] p-3">
      <h4 className="mb-3 text-xs font-semibold text-white">
        Changed Files
      </h4>

      <div className="space-y-2">
        {commitFiles.map((file) => (
          <div
            key={file.file}
            className="flex flex-wrap justify-between gap-2 text-xs"
          >
            <span className="break-all text-gray-300">{file.file}</span>
            <span className="text-gray-500">
              +{file.insertions} / -{file.deletions}
            </span>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
        </div>
    </>
  )}
</section>

{selectedCommit && (
  <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-white">
          Commit Changes
        </h3>
        <p className="mt-1 font-mono text-xs text-slate-500">
          {selectedCommit}
        </p>
      </div>

      <span className="text-xs text-sky-400">Commit Diff</span>
    </div>

    {commitDiffLoading ? (
      <p className="mt-5 text-sm text-slate-400">
        Loading commit changes...
      </p>
    ) : commitDiffError ? (
      <p className="mt-5 text-sm text-red-400">
        {commitDiffError}
      </p>
    ) : (
      <pre className="mt-4 max-h-[500px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-300">
        <code>{commitDiff}</code>
      </pre>
    )}
  </section>
)}

<section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
  <div>
    <div className="flex items-center gap-2">
      <GitBranch className="h-5 w-5 text-sky-400" />
      <h2 className="text-lg font-semibold text-white">
        Git Diff Analysis
      </h2>
    </div>

    <p className="mt-1 text-sm text-slate-400">
      Inspect added and removed lines in your changed files.
    </p>
  </div>

  <div className="flex flex-col gap-3 sm:flex-row">
    <select
      value={selectedDiffFile}
      onChange={(e) => {
        setSelectedDiffFile(e.target.value);
        setGitDiff(null);
        setDiffError("");
      }}
      className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-500"
    >
      <option value="">Select a changed file</option>

      {gitInfo?.changedFiles.map((file) => {
  const isUntracked =
    file.index === "?" || file.workingTree === "?";

  return (
    <option key={file.path} value={file.path}>
      {isUntracked ? "[Untracked] " : "[Changed] "}
      {file.path}
    </option>
  );
})}
    </select>

    <section className="branch-management">
  <div className="section-header">
    <div>
      <h2>Branch Management</h2>
      <p>Manage your repository branches</p>
    </div>

    <button
      onClick={loadBranches}
      disabled={branchLoading || !scanPath.trim()}
    >
      {branchLoading ? "Loading..." : "Refresh"}
    </button>
  </div>

  <div className="current-branch">
    <span>Current Branch</span>
    <strong>{currentBranch || "Not loaded"}</strong>
  </div>

  <div className="create-branch">
    <input
      type="text"
      placeholder="Enter new branch name"
      value={newBranchName}
      onChange={(e) => setNewBranchName(e.target.value)}
    />

    <button
      onClick={handleCreateBranch}
      disabled={branchLoading || !newBranchName.trim()}
    >
      Create Branch
    </button>
  </div>

  {branchMessage && <p className="success-message">{branchMessage}</p>}
  {branchError && <p className="error-message">{branchError}</p>}

  <div className="branch-list">
    <h3>Local Branches ({branches.length})</h3>

    {branches.map((branch) => (
      <div className="branch-item" key={branch}>
        <span>
          {branch}
          {branch === currentBranch && (
            <small className="active-branch">Current</small>
          )}
        </span>

        <button
          onClick={() => handleSwitchBranch(branch)}
          disabled={branchLoading || branch === currentBranch}
        >
          {branch === currentBranch ? "Active" : "Switch"}
        </button>
      </div>
    ))}

    {branches.length === 0 && (
      <p>No branches loaded. Click Refresh.</p>
    )}
  </div>
</section>


<section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-semibold text-white">
        Merge & Conflict Resolution
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Merge branches and resolve conflicting files.
      </p>
    </div>

    <button
      type="button"
      onClick={loadMergeStatus}
      disabled={mergeLoading || !scanPath.trim()}
      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
    >
      Refresh Status
    </button>
  </div>

  <div className="mt-5 grid gap-3 sm:grid-cols-3">
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-400">Current Branch</p>
      <p className="mt-2 break-all font-semibold text-sky-400">
        {currentBranch || "Not loaded"}
      </p>
    </div>

    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-400">Merge Status</p>
      <p className="mt-2 font-semibold text-white">
        {mergeStatus.inProgress ? "In Progress" : "No Active Merge"}
      </p>
    </div>

    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs text-slate-400">Conflicted Files</p>
      <p className="mt-2 font-semibold text-white">
        {mergeStatus.conflicts.length}
      </p>
    </div>
  </div>

  {!mergeStatus.inProgress && (
    <div className="mt-5 rounded-xl border border-slate-800 p-4">
      <h3 className="font-medium text-white">Merge a Branch</h3>
      <p className="mt-1 text-sm text-slate-400">
        The selected branch will be merged into your current branch.
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <select
          value={mergeBranchName}
          onChange={(e) => setMergeBranchName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"
        >
          <option value="">Select branch to merge</option>
          {branches
            .filter((branch) => branch !== currentBranch)
            .map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
        </select>

        <button
          type="button"
          onClick={handleMergeBranch}
          disabled={
            mergeLoading ||
            !mergeBranchName ||
            !currentBranch ||
            !scanPath.trim()
          }
          className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {mergeLoading ? "Processing..." : "Merge Branch"}
        </button>
      </div>
    </div>
  )}

  {mergeStatus.inProgress && (
    <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-amber-300">
            Merge in Progress
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Resolve all conflicting files before completing the merge.
          </p>
        </div>

        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
          {mergeStatus.conflicts.length} conflicts
        </span>
      </div>

      {mergeStatus.conflicts.map((file) => (
        <div
          key={file}
          className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3"
        >
          <p className="break-all text-sm font-medium text-white">
            {file}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleResolveConflict(file, "ours")}
              disabled={mergeLoading}
              className="rounded-lg border border-sky-500/40 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/10 disabled:opacity-50"
            >
              Use Current
            </button>

            <button
              type="button"
              onClick={() => handleResolveConflict(file, "theirs")}
              disabled={mergeLoading}
              className="rounded-lg border border-violet-500/40 px-3 py-2 text-xs text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
            >
              Use Incoming
            </button>

            <button
              type="button"
              onClick={() => handleResolveConflict(file, "manual")}
              disabled={mergeLoading}
              className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              Mark Resolved
            </button>
          </div>
        </div>
      ))}

      {mergeStatus.conflicts.length === 0 && (
        <p className="mt-4 text-sm text-emerald-300">
          No unresolved conflicts. You can complete the merge.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCompleteMerge}
          disabled={mergeLoading || mergeStatus.conflicts.length > 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          Complete Merge
        </button>

        <button
          type="button"
          onClick={handleAbortMerge}
          disabled={mergeLoading}
          className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
        >
          Abort Merge
        </button>
      </div>
    </div>
  )}

  {mergeMessage && (
    <p className="mt-4 text-sm text-emerald-400">{mergeMessage}</p>
  )}

  {mergeError && (
    <p className="mt-4 text-sm text-red-400">{mergeError}</p>
  )}
</section>


    {(() => {
  const selectedFile = gitInfo?.changedFiles.find(
    (file) => file.path === selectedDiffFile
  );

  const isUntracked =
    selectedFile?.index === "?" ||
    selectedFile?.workingTree === "?";

  return (
    <button
      type="button"
      onClick={
        isUntracked ? loadUntrackedPreview : loadFileDiff
      }
      disabled={
        !selectedDiffFile ||
        diffLoading ||
        previewLoading
      }
      className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isUntracked
        ? previewLoading
          ? "Loading..."
          : "Preview File"
        : diffLoading
          ? "Loading..."
          : "View Diff"}
    </button>
  );
})()}
  </div>

  {diffError && (
    <p className="text-sm text-red-400">{diffError}</p>
  )}

  {gitDiff && (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <span className="break-all text-sm font-medium text-slate-200">
          {gitDiff.filePath}
        </span>

        <span className="text-xs text-slate-400">
          {gitDiff.hasChanges ? "Changes detected" : "No diff available"}
        </span>
      </div>

{gitDiff.hasChanges ? (
  <div>
    <div className="flex gap-4 border-b border-slate-800 bg-slate-900 px-4 py-3 text-xs">
      <span className="font-medium text-emerald-400">
        +{diffSummary.additions} additions
      </span>

      <span className="font-medium text-red-400">
        -{diffSummary.deletions} deletions
      </span>
    </div>

    <div className="max-h-[500px] overflow-auto bg-slate-950 font-mono text-xs">
      {(() => {
        let oldLine = 0;
        let newLine = 0;

        return gitDiff.diff.split("\n").map((line, index) => {
          if (line.startsWith("@@")) {
            const match = line.match(
              /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/
            );

            if (match) {
              oldLine = Number(match[1]);
              newLine = Number(match[2]);
            }

            return (
              <div
                key={index}
                className="whitespace-pre border-y border-slate-800 bg-sky-500/10 px-3 py-1 text-sky-400"
              >
                {line}
              </div>
            );
          }

          if (
            line.startsWith("diff --git") ||
            line.startsWith("index ") ||
            line.startsWith("---") ||
            line.startsWith("+++")
          ) {
            return (
              <div
                key={index}
                className="whitespace-pre px-3 py-1 text-slate-500"
              >
                {line}
              </div>
            );
          }

          let oldNumber = "";
          let newNumber = "";
          let lineClass = "text-slate-400";

          if (line.startsWith("+")) {
            newNumber = String(newLine++);
            lineClass = "bg-emerald-500/10 text-emerald-400";
          } else if (line.startsWith("-")) {
            oldNumber = String(oldLine++);
            lineClass = "bg-red-500/10 text-red-400";
          } else {
            if (oldLine > 0) oldNumber = String(oldLine++);
            if (newLine > 0) newNumber = String(newLine++);
          }

          return (
            <div
              key={index}
              className={`flex min-w-max ${lineClass}`}
            >
              <span className="w-12 shrink-0 select-none border-r border-slate-800 px-2 text-right text-slate-600">
                {oldNumber}
              </span>

              <span className="w-12 shrink-0 select-none border-r border-slate-800 px-2 text-right text-slate-600">
                {newNumber}
              </span>

              <span className="whitespace-pre px-3">
                {line || " "}
              </span>
            </div>
          );
        });
      })()}
    </div>
  </div>
) : (
  <p className="p-5 text-sm text-slate-400">
    No tracked changes found for this file. Untracked files do not have
    a Git diff until Git starts tracking them.
  </p>
)}
    </div>
  )}

  {filePreview && (
  <div className="overflow-hidden rounded-xl border border-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
      <span className="break-all text-sm font-medium text-white">
        {filePreview.filePath}
      </span>

      <span className="text-xs text-amber-400">
        Untracked · {filePreview.size.toLocaleString()} bytes
      </span>
    </div>

    <pre className="max-h-[500px] overflow-auto bg-slate-950 p-4 text-xs leading-6 text-slate-300">
      <code>{filePreview.content}</code>
    </pre>
  </div>
)}

{previewError && (
  <p className="text-sm text-red-400">{previewError}</p>
)}

  {!gitDiff && !diffError && !diffLoading && (
    <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
      <GitBranch className="mx-auto mb-3 h-8 w-8 text-slate-500" />
      <p className="text-sm text-slate-400">
        Select a changed file to inspect its code differences.
      </p>
    </div>
  )}
</section>
            <section
              id="file-search"
              className="rounded-xl border border-white/[0.08] bg-[#111419] p-5"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Files size={17} className="text-emerald-300" />
                    File explorer
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Search filenames, paths, extensions, or imported modules.
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {scanResult
                    ? `${filteredFiles.length} of ${scanResult.sourceFiles.length} files`
                    : "Scan a codebase first"}
                </span>
              </div>

              <label className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3 focus-within:border-emerald-400/50">
                <Search size={16} className="text-gray-500" />
                <input
                  value={fileSearch}
                  onChange={(event) => setFileSearch(event.target.value)}
                  placeholder="e.g. App.tsx, api, .tsx..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                />
                {fileSearch && (
                  <button
                    type="button"
                    onClick={() => setFileSearch("")}
                    aria-label="Clear file search"
                    className="text-gray-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </label>

              {!scanResult ? (
                <p className="mt-4 text-sm text-gray-500">
                  Scan a project to search its files.
                </p>
              ) : filteredFiles.length === 0 ? (
                <p className="mt-4 rounded-lg border border-white/[0.07] p-5 text-center text-sm text-gray-500">
                  No files match that search.
                </p>
              ) : (
                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                  {filteredFiles.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => {
                        selectFile(file.path);
                        document
                          .getElementById("dependency-graph")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        selectedFilePath === file.path
                          ? "border-emerald-400/30 bg-emerald-400/[0.06]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]"
                      }`}
                    >
                      <FileCode2
                        size={16}
                        className="mt-0.5 shrink-0 text-emerald-300"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-all text-sm text-gray-200">
                          {file.path}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {file.extension} · {file.imports.length} imports ·{" "}
                          {file.localDependencies.length} local dependencies
                        </span>
                      </span>
                      {selectedFilePath === file.path && (
                        <CheckCircle2
                          size={16}
                          className="shrink-0 text-emerald-300"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Workspace overview
                </h2>
                <span className="text-xs text-gray-500">
                  {scanResult ? "Latest scan" : "Awaiting first scan"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Codebases"
                  value="3"
                  subtitle="Projects in your workspace"
                  icon={Boxes}
                />
                <StatCard
                  title="Files analyzed"
                  value={scanResult ? String(scanResult.analyzedFiles) : "—"}
                  subtitle="Available after scanning"
                  icon={FileCode2}
                />
                <StatCard
                  title="Dependencies"
                  value={scanResult ? String(scanResult.dependencyCount) : "—"}
                  subtitle="Imports discovered during analysis"
                  icon={GitFork}
                />
                
<StatCard
  title="Potential issues"
  value={
    scanResult
      ? String(
          fileRiskScores.filter(
            (file) =>
              file.riskScore >= 25 ||
              file.hasCircularDependency,
          ).length,
        )
      : "—"
  }
  subtitle={
    scanResult
      ? "Files with medium/high risk or circular dependencies"
      : "Available after scanning"
  }
  icon={Activity}
/>

              </div>
            </section>

            
<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
  <div className="rounded-xl border border-white/[0.08] bg-[#111419] p-4">
    <p className="text-xs text-gray-500">Total Files</p>
    <p className="mt-2 text-2xl font-semibold text-white">
      {scanResult?.totalFiles ?? 0}
    </p>
  </div>

  <div className="rounded-xl border border-white/[0.08] bg-[#111419] p-4">
    <p className="text-xs text-gray-500">Dependencies</p>
    <p className="mt-2 text-2xl font-semibold text-white">
      {scanResult?.dependencyCount ?? 0}
    </p>
  </div>

  <div className="rounded-xl border border-white/[0.08] bg-[#111419] p-4">
    <p className="text-xs text-gray-500">Circular Issues</p>
    <p className="mt-2 text-2xl font-semibold text-rose-300">
      {scanResult?.circularDependencyCount ?? 0}
    </p>
  </div>

  <div className="rounded-xl border border-white/[0.08] bg-[#111419] p-4">
    <p className="text-xs text-gray-500">High-Risk Files</p>
    <p className="mt-2 text-2xl font-semibold text-amber-300">
      {fileRiskScores.filter((file) => file.riskScore >= 50).length}
    </p>
  </div>
</section>


            <section
              id="dependency-graph"
              className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111419]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Network size={17} className="text-emerald-300" />
                    <h2 className="text-sm font-semibold text-white">
                      Dependency overview
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Interactive map of your scanned source files
                  </p>
                </div>
                <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-gray-400">
                  {graphFiles.length} visible nodes
                </span>
              </div>

              <div className="border-b border-white/[0.07] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Filter size={15} />
                    Graph filter
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setGraphFilter("all")}
                      className={`rounded-lg border px-3 py-2 text-xs transition ${
                        graphFilter === "all"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 text-gray-400 hover:bg-white/[0.04]"
                      }`}
                    >
                      All matching files
                    </button>
                    <button
                      type="button"
                      disabled={!selectedFilePath}
                      onClick={() => setGraphFilter("connected")}
                      className={`rounded-lg border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        graphFilter === "connected"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 text-gray-400 hover:bg-white/[0.04]"
                      }`}
                    >
                      Selected + connections
                    </button>
                  </div>
                </div>
                {!selectedFilePath && (
                  <p className="mt-2 text-xs text-gray-500">
                    Select a file from the graph or file explorer to enable
                    connection filtering.
                  </p>
                )}
              </div>

              {!scanResult ? (
                <div className="flex min-h-[220px] items-center justify-center p-6 text-center text-sm text-gray-500">
                  Scan a codebase to generate its dependency graph.
                </div>
              ) : graphFiles.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center p-6 text-center text-sm text-gray-500">
                  No files match the current search and graph filter.
                </div>
              ) : (
                <div className="p-4">
                  <DependencyGraph
                    files={graphFiles}
                    selectedFilePath={selectedFilePath}
                    onSelectFile={selectFile}
                  />
                  <p className="mt-3 text-xs text-gray-500">
                    Select a node to inspect it. Drag nodes to arrange them,
                    scroll to zoom, and use the controls to navigate.
                  </p>
                </div>
              )}
            </section>

            <section
              id="selected-file-details"
              className="rounded-xl border border-white/[0.08] bg-[#111419] p-5"
            >
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-white">
                  Selected File Details
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Imports and direct local dependencies for the selected file.
                </p>
              </div>

              {!selectedFile ? (
                <p className="text-sm text-gray-500">
                  Select a node in the graph or a file in the explorer to
                  inspect its details.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-xs text-gray-500">File path</p>
                    <p className="break-all text-sm text-emerald-300">
                      {selectedFile.path}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Extension</p>
                    <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-gray-200">
                      {selectedFile.extension}
                    </span>
                  </div>

                  
<div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
  <div className="flex items-center gap-2">
    <Zap size={16} className="text-amber-300" />
    <h3 className="text-sm font-semibold text-white">
      Impact Analysis
    </h3>
  </div>

  <p className="mt-1 text-xs text-gray-500">
    Files that may be affected if this file changes.
  </p>

  <div className="mt-4 grid grid-cols-2 gap-3">
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
      <p className="text-xs text-gray-500">Direct Impact</p>
      <p className="mt-1 text-2xl font-semibold text-amber-300">
        {impactAnalysis.directCount}
      </p>
      <p className="mt-1 text-[11px] text-gray-500">
        Directly dependent files
      </p>
    </div>

    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
      <p className="text-xs text-gray-500">Total Impact</p>
      <p className="mt-1 text-2xl font-semibold text-amber-300">
        {impactAnalysis.totalCount}
      </p>
      <p className="mt-1 text-[11px] text-gray-500">
        Direct + indirect files
      </p>
    </div>
  </div>

  <div className="mt-4">
    <p className="mb-2 text-xs font-medium text-gray-400">
      Potentially Affected Files ({impactAnalysis.totalCount})
    </p>

    <div className="space-y-2">
      {impactAnalysis.affectedFiles.length > 0 ? (
        impactAnalysis.affectedFiles.map((file) => (
          <button
            type="button"
            key={file.path}
            onClick={() => {
              selectFile(file.path);
              document
                .getElementById("selected-file-details")
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-amber-400/10 bg-amber-400/[0.03] px-3 py-2 text-left text-xs text-gray-300 transition hover:border-amber-400/30 hover:bg-amber-400/[0.07]"
          >
            <FileCode2 size={14} className="shrink-0 text-amber-300" />
            <span className="break-all">{file.path}</span>
            <ChevronRight size={14} className="ml-auto shrink-0 text-gray-500" />
          </button>
        ))
      ) : (
        <p className="text-xs text-gray-500">
          No other files depend on this file.
        </p>
      )}
    </div>
  </div>
</div>

                  <div>
                    <p className="mb-2 text-xs text-gray-500">
                      Imported modules ({selectedFile.imports.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFile.imports.length > 0 ? (
                        selectedFile.imports.map((item) => (
                          <span
                            key={item}
                            className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-gray-300"
                          >
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">
                          No imports found
                        </span>
                      )}
                    </div>
                  </div>
                  
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
  {/* Files this file depends on */}
  <div>
    <p className="mb-2 text-xs font-medium text-gray-400">
      Depends On ({selectedFileDependencies.imports.length})
    </p>

    <div className="space-y-2">
      {selectedFileDependencies.imports.length > 0 ? (
        selectedFileDependencies.imports.map((file) => (
          <button
            type="button"
            key={file.path}
            onClick={() => {
              selectFile(file.path);
              document
                .getElementById("selected-file-details")
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            className="block w-full min-w-0 whitespace-normal break-words rounded-lg border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-2 text-left text-xs leading-5 text-emerald-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.08]"
          >
            {file.path}
          </button>
        ))
      ) : (
        <p className="text-xs text-gray-500">
          No local dependencies found.
        </p>
      )}
    </div>
  </div>

  {/* Files that depend on this file */}
  <div>
    <p className="mb-2 text-xs font-medium text-gray-400">
      Used By ({selectedFileDependencies.usedBy.length})
    </p>

    <div className="space-y-2">
      {selectedFileDependencies.usedBy.length > 0 ? (
        selectedFileDependencies.usedBy.map((file) => (
          <button
            type="button"
            key={file.path}
            onClick={() => {
              selectFile(file.path);
              document
                .getElementById("selected-file-details")
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
           className="block w-full min-w-0 whitespace-normal break-words rounded-lg border border-sky-400/10 bg-sky-400/[0.04] px-3 py-2 text-left text-xs leading-5 text-sky-200 transition hover:border-sky-400/40 hover:bg-sky-400/[0.08]"
          >
            {file.path}
          </button>
        ))
      ) : (
        <p className="text-xs text-gray-500">
          No files depend on this file.
        </p>
      )}
    </div>
  </div>
</div>

                </div>
              )}
            </section>

            <section
              id="codebases"
              className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]"
            >
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111419]">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Recent codebases
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Your project workspace
                    </p>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-white">
                    View all <ArrowRight size={14} />
                  </button>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {filteredProjects.map((project) => (
                    
<button
  type="button"
  key={project.path}
  onClick={() => {
    setScanPath(project.path);
    setScanError("");
    document
      .getElementById("scanner")
      ?.scrollIntoView({ behavior: "smooth" });
  }}
  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
>

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                          <Code2 size={19} className={project.color} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-200">
                            {project.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {project.path}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
  Last scanned: {project.lastScanned}
</p>

<p className="mt-1 text-xs text-gray-500">
  {project.analyzedFiles} files · {project.dependencyCount} dependencies
</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-gray-300">
                            {project.language}
                          </p>
                          <p className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-gray-500">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${project.dot}`}
                            />
                            {project.status}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-600" />
                      </div>
                    </button>
                  ))}
                  {filteredProjects.length === 0 && (
                    <p className="px-5 py-8 text-center text-sm text-gray-500">
                      No codebases match your search.
                    </p>
                  )}
                </div>
                <div className="border-t border-white/[0.07] p-4">
                  <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.13] px-4 py-3 text-sm text-gray-400 transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.04] hover:text-emerald-300">
                    <Plus size={16} />
                    Add a codebase
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111419]">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Project structure
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Current application files
                    </p>
                  </div>
                  <Files size={17} className="text-gray-500" />
                </div>
                <div className="space-y-1 p-3">
                  <div className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-gray-400">
                    <ChevronDown size={14} />
                    <Boxes size={15} className="text-amber-300" />
                    client/src
                  </div>
                  {workspaceFiles.slice(0, 2).map((file) => (
                    <div
                      key={file.name}
                      className="ml-5 flex items-center gap-3 rounded-md px-2 py-2.5 transition hover:bg-white/[0.04]"
                    >
                      <FileCode2 size={15} className={file.color} />
                      <span className="text-xs text-gray-300">{file.name}</span>
                      <span className="ml-auto text-[10px] text-gray-600">
                        {file.type}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-gray-400">
                    <ChevronDown size={14} />
                    <Boxes size={15} className="text-amber-300" />
                    server/src
                  </div>
                  {workspaceFiles.slice(2).map((file) => (
                    <div
                      key={file.name}
                      className="ml-5 flex items-center gap-3 rounded-md px-2 py-2.5 transition hover:bg-white/[0.04]"
                    >
                      <FileCode2 size={15} className={file.color} />
                      <span className="text-xs text-gray-300">{file.name}</span>
                      <span className="ml-auto text-[10px] text-gray-600">
                        {file.type}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mx-4 mb-4 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <Zap size={15} className="text-amber-300" />
                    <p className="text-xs font-medium text-gray-200">
                      Next step
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Explore file relationships and use the graph filter to
                    focus on connected modules.
                  </p>
                </div>
              </div>
            </section>

            
<section className="rounded-xl border border-white/[0.08] bg-[#111419] p-5">
  <div className="flex items-center gap-2">
    <GitFork size={17} className="text-amber-300" />
    <h2 className="text-sm font-semibold text-white">
      Dependency Hotspots
    </h2>
  </div>

  <p className="mt-1 text-xs text-gray-500">
    Files that other files depend on most frequently.
  </p>

  {!scanResult ? (
    <p className="mt-4 text-sm text-gray-500">
      Scan a codebase to discover dependency hotspots.
    </p>
  ) : dependencyHotspots.length === 0 ? (
    <p className="mt-4 text-sm text-gray-500">
      No dependency hotspots found.
    </p>
  ) : (
    <div className="mt-4 space-y-2">
      {dependencyHotspots.map((file, index) => (
        <button
          key={file.path}
          type="button"
          onClick={() => {
            setSelectedFilePath(file.path);
            document
              .getElementById("selected-file-details")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-white/[0.07] p-3 text-left transition hover:border-amber-400/30 hover:bg-white/[0.03]"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-400/10 text-xs font-semibold text-amber-300">
            {index + 1}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block break-all text-sm text-gray-200">
              {file.path}
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              {file.dependentCount} dependent file(s)
            </span>
          </span>

          <ChevronRight size={16} className="shrink-0 text-gray-500" />
        </button>
      ))}
    </div>
  )}
</section>


<section
  id="orphan-files"
  className="rounded-2xl border border-white/10 bg-white/5 p-5"
>
  <div className="mb-4 flex items-center gap-3">
    <FileWarning className="h-5 w-5 text-amber-400" />
    <div>
      <h2 className="text-lg font-semibold">Unreferenced Files</h2>
      <p className="text-sm text-gray-400">
        Files not imported by another scanned file.
      </p>
    </div>
    <span className="ml-auto rounded-lg bg-white/10 px-3 py-1 text-sm">
      {orphanFiles.length}
    </span>
  </div>

  {!scanResult ? (
    <p className="text-sm text-gray-400">
      Scan a project to identify unreferenced files.
    </p>
  ) : orphanFiles.length === 0 ? (
    <p className="text-sm text-gray-400">
      No unreferenced files found.
    </p>
  ) : (
    <div className="space-y-2">
      {orphanFiles.slice(0, 10).map((file) => (
        <button
          key={file.path}
          type="button"
          onClick={() => {
            selectFile(file.path);
            document
              .getElementById("selected-file-details")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:bg-white/10"
        >
          <FileWarning className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="min-w-0 flex-1 break-all text-sm">
            {file.path}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      ))}
      {orphanFiles.length > 10 && (
        <p className="text-sm text-gray-400">
          Showing 10 of {orphanFiles.length} files.
        </p>
      )}
    </div>
  )}

  <p className="mt-4 text-xs text-gray-500">
    Note: Entry points, routes, and dynamically loaded files may
    appear here. These files are not necessarily unused.
  </p>
</section>
 
 
<section className="rounded-xl border border-white/[0.08] bg-[#111419] p-5">
  <div className="flex items-center gap-2">
    <ShieldAlert size={18} className="text-rose-300" />
    <h2 className="text-sm font-semibold text-white">
      File Risk Analysis
    </h2>
  </div>

  <p className="mt-1 text-xs text-gray-500">
    Files ranked by circular dependencies, dependency count, and
    unreferenced status.
  </p>

  {!scanResult ? (
    <p className="mt-4 text-sm text-gray-500">
      Scan a codebase to calculate file risk scores.
    </p>
  ) : fileRiskScores.length === 0 ? (
    <p className="mt-4 text-sm text-gray-500">
      No files available for risk analysis.
    </p>
  ) : (
    <div className="mt-4 space-y-3">
      {fileRiskScores.map((file) => {
        const riskLevel =
          file.riskScore >= 50
            ? "High"
            : file.riskScore >= 25
              ? "Medium"
              : file.riskScore > 0
                ? "Low"
                : "Minimal";

        const riskColor =
          file.riskScore >= 50
            ? "text-rose-300"
            : file.riskScore >= 25
              ? "text-amber-300"
              : file.riskScore > 0
                ? "text-sky-300"
                : "text-emerald-300";

        return (
          <button
            key={file.path}
            type="button"
            onClick={() => {
              selectFile(file.path);
              document
                .getElementById("selected-file-details")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full rounded-lg border border-white/[0.07] p-3 text-left transition hover:bg-white/[0.03]"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={16}
                className={`mt-0.5 shrink-0 ${riskColor}`}
              />

              <div className="min-w-0 flex-1">
                <p className="break-all text-sm text-gray-200">
                  {file.path}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {riskLevel} risk · {file.dependentCount} dependent file(s)
                </p>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${
                      file.riskScore >= 50
                        ? "bg-rose-400"
                        : file.riskScore >= 25
                          ? "bg-amber-400"
                          : file.riskScore > 0
                            ? "bg-sky-400"
                            : "bg-emerald-400"
                    }`}
                    style={{ width: `${file.riskScore}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {file.hasCircularDependency && (
                    <span className="rounded bg-rose-400/10 px-2 py-1 text-xs text-rose-300">
                      Circular dependency
                    </span>
                  )}

                  {file.dependentCount >= 3 && (
                    <span className="rounded bg-amber-400/10 px-2 py-1 text-xs text-amber-300">
                      Highly depended on
                    </span>
                  )}

                  {file.isUnreferenced && (
                    <span className="rounded bg-sky-400/10 px-2 py-1 text-xs text-sky-300">
                      Unreferenced
                    </span>
                  )}

                  {(file.hasCircularDependency ||
  file.dependentCount >= 3 ||
  file.isUnreferenced) && (
  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
    <p className="text-xs font-semibold text-gray-200">
      Recommended action
    </p>

    <ul className="mt-2 space-y-1 text-xs text-gray-400">
      {file.hasCircularDependency && (
        <li>
          • Review the circular import chain and consider extracting
          shared logic into a separate module.
        </li>
      )}

      {file.dependentCount >= 3 && (
        <li>
          • Review dependent files and run relevant tests before
          modifying this module.
        </li>
      )}

      {file.isUnreferenced && (
        <li>
          • Verify entry points, routes, and dynamic imports before
          considering this file unused.
        </li>
      )}
    </ul>
  </div>
)}

                  {file.riskScore === 0 && (
                    <span className="text-xs text-emerald-300">
                      No configured risk signals
                    </span>
                  )}
                </div>
              </div>

              <span className={`shrink-0 text-sm font-semibold ${riskColor}`}>
                {file.riskScore}/100
              </span>
            </div>
          </button>
        );
      })}
    </div>
  )}

  <p className="mt-4 text-xs text-gray-500">
    Heuristic score, not a probability of bugs. Unreferenced files may
    be valid entry points or dynamically loaded modules.
  </p>
</section>


            <section id="code-insights" className="rounded-xl border border-white/[0.08] bg-[#111419] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-emerald-300" />
                <h2 className="text-sm font-semibold text-white">Code insights</h2>
              </div>
              {!scanResult ? (
  <p className="mt-2 text-sm text-gray-500">
    Scan a codebase to analyze its dependency structure and detect circular
    dependencies.
  </p>
) : (
  <div className="mt-4 space-y-4">
    <div
      className={`rounded-lg border p-4 ${
        scanResult.circularDependencyCount > 0
          ? "border-red-400/20 bg-red-400/[0.04]"
          : "border-emerald-400/20 bg-emerald-400/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2">
        {scanResult.circularDependencyCount > 0 ? (
          <XCircle size={18} className="text-red-400" />
        ) : (
          <CheckCircle2 size={18} className="text-emerald-300" />
        )}

        <h3 className="text-sm font-medium text-white">
          {scanResult.circularDependencyCount > 0
            ? "Circular dependencies detected"
            : "No circular dependencies detected"}
        </h3>
      </div>

      <p className="mt-2 text-xs leading-5 text-gray-400">
        {scanResult.circularDependencyCount > 0
          ? `The scanner found ${scanResult.circularDependencyCount} dependency cycle(s). Review the file relationships below.`
          : `Analyzed ${scanResult.analyzedFiles} source files and found no circular dependency cycles.`}
      </p>
    </div>

    {scanResult.circularDependencies.length > 0 && (
      <div className="space-y-3">
        {scanResult.circularDependencies.map((cycle, index) => (
          <div
            key={`${index}-${cycle.join("-")}`}
            className="rounded-lg border border-red-400/15 bg-white/[0.02] p-4"
          >
            <p className="mb-3 text-xs font-medium text-red-300">
              Cycle {index + 1}
            </p>

            <div className="space-y-2">
              {cycle.map((filePath, fileIndex) => (
                <div key={`${fileIndex}-${filePath}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const matchingFile = scanResult.sourceFiles.find(
                        (file) => file.path === filePath,
                      );

                      if (matchingFile) {
                        setSelectedFilePath(matchingFile.path);

                        document
                          .getElementById("selected-file-details")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="w-full break-all rounded-md border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-left text-xs text-gray-300 transition hover:border-red-400/30 hover:text-white"
                  >
                    {filePath}
                  </button>

                  {fileIndex < cycle.length - 1 && (
                    <div className="py-1 pl-3 text-xs text-red-400">
                      ↓ depends on
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
            </section>

            <footer className="flex flex-col gap-2 border-t border-white/[0.07] pt-5 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <p>Codebase X-Ray · Code intelligence workspace</p>
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    apiStatus === "connected"
                      ? "bg-emerald-400"
                      : apiStatus === "error"
                        ? "bg-red-400"
                        : "bg-amber-400"
                  }`}
                />
                API{" "}
                {apiStatus === "connected"
                  ? "online"
                  : apiStatus === "error"
                    ? "offline"
                    : "connecting"}
                <span className="mx-1 text-gray-700">·</span>
                <span>Local development</span>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
