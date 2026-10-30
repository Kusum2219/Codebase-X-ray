
export interface TestCoverageResult {
  sourceFileCount: number;
  testedFileCount: number;
  untestedFileCount: number;
  testedFiles: string[];
  untestedFiles: string[];
  testFiles: string[];
}

const testPattern = /\.(test|spec)\.[cm]?[jt]sx?$/i;

function getSourceKey(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/\/__tests__\//g, "/")
    .replace(/\.(test|spec)(?=\.[^.]+$)/i, "");
}

export function analyzeTestCoverage(
  files: string[],
): TestCoverageResult {
  const testFiles = files.filter((file) => testPattern.test(file));

 const sourceFiles = files.filter(
  (file) => !testPattern.test(file) && !isConfigFile(file),
);

  const testKeys = new Set(testFiles.map(getSourceKey));

  const testedFiles: string[] = [];
  const untestedFiles: string[] = [];

  for (const sourceFile of sourceFiles) {
    const sourceKey = getSourceKey(sourceFile);

    if (testKeys.has(sourceKey)) {
      testedFiles.push(sourceFile);
    } else {
      untestedFiles.push(sourceFile);
    }
  }

  return {
    sourceFileCount: sourceFiles.length,
    testedFileCount: testedFiles.length,
    untestedFileCount: untestedFiles.length,
    testedFiles,
    untestedFiles,
    testFiles,
  };
}
function isConfigFile(file: string): boolean {
  return /(^|\/)(eslint|vite|vitest|postcss|tailwind|next|prettier)\.config\.[cm]?[jt]sx?$/i.test(file);
}