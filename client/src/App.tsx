
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
  sourceFiles: ScannedFile[];
};

const recentProjects = [
  {
    name: "Codebase X-Ray",
    path: "codebase-x-ray",
    language: "TypeScript",
    status: "Ready to scan",
    color: "text-blue-400",
    dot: "bg-blue-400",
  },
  {
    name: "LocalFix",
    path: "local-services-marketplace",
    language: "TypeScript",
    status: "Not scanned",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  {
    name: "Heart Disease Prediction",
    path: "heart-disease",
    language: "Python",
    status: "Not scanned",
    color: "text-violet-400",
    dot: "bg-violet-400",
  },
];

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
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  </div>
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
                  value="—"
                  subtitle="Available after analysis"
                  icon={Activity}
                />
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
                  <div>
                    <p className="mb-2 text-xs text-gray-500">
                      Local dependencies (
                      {selectedFile.localDependencies.length})
                    </p>
                    <div className="space-y-2">
                      {selectedFile.localDependencies.length > 0 ? (
                        selectedFile.localDependencies.map((item) => (
                          <div
                            key={item}
                            className="rounded-lg border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-2 text-xs text-emerald-200"
                          >
                            {item}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">
                          No local dependencies found
                        </span>
                      )}
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
                    <div
                      key={project.name}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/[0.025]"
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
                    </div>
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

            <section id="code-insights" className="rounded-xl border border-white/[0.08] bg-[#111419] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-emerald-300" />
                <h2 className="text-sm font-semibold text-white">Code insights</h2>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Automated code-quality insights will appear here as analysis
                capabilities are added.
              </p>
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
