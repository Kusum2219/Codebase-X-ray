
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

function resolveLocalImport(
  importerPath: string,
  importPath: string,
  sourceFileSet: Set<string>,
): string[] {
  // This resolver handles relative imports only.
  // Package imports and unresolved aliases are intentionally excluded.
  if (!importPath.startsWith(".")) {
    return [];
  }

  const base = normalizePath(
    path.posix.normalize(
      path.posix.join(path.posix.dirname(importerPath), importPath),
    ),
  );

  const candidates = new Set<string>();
  
  const explicitExtension = path.posix.extname(base);

  const extensionlessBase = explicitExtension
    ? base.slice(0, -explicitExtension.length)
    : base;

  const sourceEquivalentExtensions: Record<string, string[]> = {
    ".js": [".ts", ".tsx", ".js", ".jsx"],
    ".jsx": [".tsx", ".jsx", ".ts", ".js"],
    ".mjs": [".mjs", ".js", ".ts"],
    ".cjs": [".cjs", ".js", ".ts"],
  };


  // Exact path, including imports that specify an extension.
  candidates.add(base);
  
  for (const extension of sourceEquivalentExtensions[explicitExtension] ?? []) {
    candidates.add(extensionlessBase + extension);
  }


  // Extension resolution for imports such as "./utils".
  if (!path.posix.extname(base)) {
    for (const extension of sourceExtensions) {
      candidates.add(base + extension);
    }
  }

  // Directory entry points such as "./components".
  for (const extension of sourceExtensions) {
    candidates.add(path.posix.join(base, `index${extension}`));
  }

  return [...candidates].filter((candidate) =>
    sourceFileSet.has(candidate),
  );
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
    .filter((file) => extensionSet.has(path.posix.extname(file)))
    .slice(0, 2000)
    .map(normalizePath);

  const sourceFileSet = new Set(sourceFiles);

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
            resolveLocalImport(file, item, sourceFileSet),
          ),
        ),
      ];

      return {
        path: file,
        extension: path.posix.extname(file),
        imports,
        localDependencies,
      };
    }),
  );

  const dependencyCount = files.reduce(
    (total, file) => total + file.localDependencies.length,
    0,
  );

  const circularDependencies = findCircularDependencies(files);

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
    const resolvedDirectory = path.resolve(directory);
    await access(resolvedDirectory);

    const result = await scanDirectory(resolvedDirectory);

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
