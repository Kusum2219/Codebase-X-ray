
import express from "express";
import cors from "cors";
import fg from "fast-glob";
import path from "node:path";
import { access, readFile, stat } from "node:fs/promises";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Codebase X-Ray API is running",
  });
});

const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const ignoredFolders = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.next/**",
];

type ScannedFile = {
  path: string;
  extension: string;
  imports: string[];
  localDependencies: string[];
  skipped?: string;
};

function extractImports(content: string): string[] {
  const imports = new Set<string>();

  const patterns = [
    /\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) {
        imports.add(match[1]);
      }
    }
  }

  return [...imports];
}
function findCircularDependencies(
  files: ScannedFile[],
): string[][] {
  const filePaths = new Set(files.map((file) => file.path));

  const graph = new Map<string, string[]>();

  for (const file of files) {
    graph.set(
      file.path,
      file.localDependencies.filter((dependency) =>
        filePaths.has(dependency),
      ),
    );
  }

  const state = new Map<string, number>();
  const stack: string[] = [];
  const cycles = new Map<string, string[]>();

  function visit(filePath: string): void {
    state.set(filePath, 1);
    stack.push(filePath);

    for (const dependency of graph.get(filePath) ?? []) {
      const dependencyState = state.get(dependency) ?? 0;

      if (dependencyState === 0) {
        visit(dependency);
      } else if (dependencyState === 1) {
        const cycleStart = stack.indexOf(dependency);

        if (cycleStart !== -1) {
          const cycle = stack.slice(cycleStart);
          const rotations = cycle.map((_, index) =>
            [
              ...cycle.slice(index),
              ...cycle.slice(0, index),
            ].join(" -> "),
          );

          const key = rotations.sort()[0];

          if (key !== undefined) {
            cycles.set(key, [...cycle, dependency]);
          }
        }
      }
    }

    stack.pop();
    state.set(filePath, 2);
  }

  for (const filePath of graph.keys()) {
    if ((state.get(filePath) ?? 0) === 0) {
      visit(filePath);
    }
  }

  return [...cycles.values()];
}
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
    .filter((file) => sourceExtensions.has(path.extname(file)))
    .slice(0, 2000)
    .map((file) => file.replace(/\\/g, "/"));

  const sourceFileSet = new Set(sourceFiles);

  const files: ScannedFile[] = await Promise.all(
    sourceFiles.map(async (file): Promise<ScannedFile> => {
      const absolutePath = path.join(root, file);
      const fileInfo = await stat(absolutePath);

      if (fileInfo.size > 500_000) {
        return {
          path: file,
          extension: path.extname(file),
          imports: [],
          localDependencies: [],
          skipped: "File exceeds 500 KB",
        };
      }

      const content = await readFile(absolutePath, "utf8");
      const imports = extractImports(content);

      const localDependencies = imports
        .filter((item) => item.startsWith("."))
        .flatMap((item) => {
          const base = path.posix.normalize(
            path.posix.join(path.posix.dirname(file), item),
          );

          const candidates = [
            base,
            ...[...sourceExtensions].map((ext) => base + ext),
            ...[...sourceExtensions].map((ext) =>
              path.posix.join(base, "index" + ext),
            ),
          ];

          return candidates.filter((candidate) =>
            sourceFileSet.has(candidate),
          );
        });

      return {
        path: file,
        extension: path.extname(file),
        imports,
        localDependencies: [...new Set(localDependencies)],
      };
    }),
  );

  const dependencyCount = files.reduce(
    (total, file) =>
      total + file.localDependencies.length,
    0,
  );

  const circularDependencies =
    findCircularDependencies(files);

  return {
    root,
    totalFiles: paths.length,
    analyzedFiles: files.length,
    sourceFiles: files,
    dependencyCount,
    circularDependencies,
    circularDependencyCount: circularDependencies.length,
  };
}

app.post("/api/scan", async (req, res) => {
  const directory = req.body?.path;

  if (typeof directory !== "string" || !directory.trim()) {
    res.status(400).json({
      success: false,
      message: "Please provide a project folder path.",
    });
    return;
  }

  try {
    await access(path.resolve(directory));

    const result = await scanDirectory(directory);

    res.json({
      success: true,
      message: "Codebase scanned successfully",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to scan this directory";

    res.status(400).json({
      success: false,
      message,
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Codebase X-Ray API running at http://localhost:${PORT}`,
  );
});
