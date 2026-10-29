import * as ts from "typescript";
export type ScannedFile = {
  path: string;
  extension: string;
  imports: string[];
  localDependencies: string[];
  skipped?: string;
};

export function extractImports(content: string): string[] {
  const sourceFile = ts.createSourceFile(
    "scanned-file.tsx",
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const imports = new Set<string>();

  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      imports.add(node.moduleSpecifier.text);
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      imports.add(node.moduleSpecifier.text);
    }

    if (ts.isCallExpression(node)) {
      const firstArgument = node.arguments[0];

      if (
        firstArgument &&
        ts.isStringLiteralLike(firstArgument)
      ) {
        if (
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          imports.add(firstArgument.text);
        } else if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require"
        ) {
          imports.add(firstArgument.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

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
