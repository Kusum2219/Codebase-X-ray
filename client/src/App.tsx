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

  const [branches, setBranches] = useState<string[]>([]);
const [currentBranch, setCurrentBranch] = useState("");
const [newBranchName, setNewBranchName] = useState("");
const [branchLoading, setBranchLoading] = useState(false);
const [branchMessage, setBranchMessage] = useState("");
const [branchError, setBranchError] = useState("");
const [selectedCommit, setSelectedCommit] = useState("");
const [commitDiff, setCommitDiff] = useState("");
const [commitDiffLoading, setCommitDiffLoading] = useState(false);
const [commitDiffError, setCommitDiffError] = useState("");
const [selectedGitFiles, setSelectedGitFiles] = useState<string[]>([]);
const [commitMessage, setCommitMessage] = useState("");

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

    setCommitFiles(response.data.data.files);
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
