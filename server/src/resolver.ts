
import path from "node:path";

const sourceExtensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function resolveLocalImport(
  importerPath: string,
  importPath: string,
  sourceFileSet: Set<string>,
): string[] {
  if (!importPath.startsWith(".")) {
    return [];
  }

  const base = normalizePath(
    path.posix.normalize(
      path.posix.join(path.posix.dirname(importerPath), importPath),
    ),
  );

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

  const candidates: string[] = [];

  if (explicitExtension) {
    candidates.push(
      ...(sourceEquivalentExtensions[explicitExtension] ?? []).map(
        (extension) => extensionlessBase + extension,
      ),
    );
    candidates.push(base);
  } else {
    for (const extension of sourceExtensions) {
      candidates.push(base + extension);
    }
  }

  for (const extension of sourceExtensions) {
    candidates.push(path.posix.join(base, `index${extension}`));
  }

  const uniqueCandidates = [...new Set(candidates)];

  const resolved = uniqueCandidates.find((candidate) =>
    sourceFileSet.has(candidate),
  );

  return resolved ? [resolved] : [];
}
