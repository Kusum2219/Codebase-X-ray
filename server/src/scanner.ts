
export type ScannedFile = {
  path: string;
  extension: string;
  imports: string[];
  localDependencies: string[];
  skipped?: string;
};

export function extractImports(content: string): string[] {
  const imports = new Set<string>();

  const patterns = [
    /\bimport\s+(?:[\s\S]*?\s+from\s*)?["']([^"']+)["']/g,
    /\bexport\s+[\s\S]*?\s+from\s*["']([^"']+)["']/g,
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

export function findCircularDependencies(
  files: ScannedFile[],
): string[][] {
  const filePaths = new Set(files.map((file) => file.path));
  const graph = new Map<string, string[]>();

  for (const file of files) {
    graph.set(
      file.path,
      [...new Set(file.localDependencies)].filter((dep) =>
        filePaths.has(dep),
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
            [...cycle.slice(index), ...cycle.slice(0, index)].join(" -> "),
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
