
import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { FileCode2 } from "lucide-react";

export type GraphFile = {
  path: string;
  extension: string;
  imports: string[];
  localDependencies: string[];
  skipped?: string;
};

type FileNodeData = {
  file: GraphFile;
  selected: boolean;
  connected: boolean;
  onSelect: (path: string) => void;
};

function FileNode({ data }: NodeProps<Node<FileNodeData>>) {
  const { file, selected, connected, onSelect } = data;

  return (
    <div
      onClick={() => onSelect(file.path)}
      className={`min-w-[190px] max-w-[230px] cursor-pointer rounded-xl border p-3 shadow-lg transition ${
        selected
          ? "border-emerald-400 bg-[#163027] shadow-emerald-950/30"
          : connected
            ? "border-sky-400/70 bg-[#14232c] shadow-sky-950/30"
            : "border-white/10 bg-[#171a20] opacity-60 hover:border-emerald-400/50"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-[#111419] !bg-violet-300"
      />

      <div className="flex items-start gap-2">
        <FileCode2
          size={16}
          className="mt-0.5 shrink-0 text-emerald-300"
        />
        <div className="min-w-0">
          <p className="break-all text-xs font-semibold text-gray-100">
            {file.path.split("/").pop()}
          </p>
          <p className="mt-1 break-all text-[10px] text-gray-400">
            {file.path}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2 text-[10px] text-gray-400">
        <span>{file.imports.length} imports</span>
        <span>·</span>
        <span>{file.localDependencies.length} dependencies</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[#111419] !bg-emerald-300"
      />
    </div>
  );
}

const nodeTypes = {
  fileNode: FileNode,
};

type DependencyGraphProps = {
  files: GraphFile[];
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
};

export default function DependencyGraph({
  files,
  selectedFilePath,
  onSelectFile,
}: DependencyGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const columns = Math.max(1, Math.ceil(Math.sqrt(files.length)));

    // Find the selected file and its direct connections first.
    const connectedPaths = new Set<string>();

    if (selectedFilePath) {
      connectedPaths.add(selectedFilePath);

      const selectedFile = files.find(
        (file) => file.path === selectedFilePath,
      );

      selectedFile?.localDependencies.forEach((path) => {
        connectedPaths.add(path);
      });

      files.forEach((file) => {
        if (file.localDependencies.includes(selectedFilePath)) {
          connectedPaths.add(file.path);
        }
      });
    }

    const graphNodes: Node<FileNodeData>[] = files.map((file, index) => ({
      id: file.path,
      type: "fileNode",
      position: {
        x: (index % columns) * 290,
        y: Math.floor(index / columns) * 145,
      },
      data: {
        file,
        selected: file.path === selectedFilePath,
        connected: connectedPaths.has(file.path),
        onSelect: onSelectFile,
      },
    }));

    const filePaths = new Set(files.map((file) => file.path));
    const graphEdges: Edge[] = [];
    const seenEdges = new Set<string>();

    for (const file of files) {
      for (const dependency of file.localDependencies) {
        if (!filePaths.has(dependency)) continue;

        const edgeId = `${file.path}->${dependency}`;
        if (seenEdges.has(edgeId)) continue;
        seenEdges.add(edgeId);

        const isConnected =
          connectedPaths.has(file.path) &&
          connectedPaths.has(dependency);

        graphEdges.push({
          id: edgeId,
          source: file.path,
          target: dependency,
          type: "smoothstep",
          animated: isConnected && selectedFilePath !== null,
          style: {
            stroke: isConnected ? "#34d399" : "#374151",
            strokeWidth: isConnected ? 2.5 : 1,
            opacity: isConnected ? 1 : 0.3,
          },
        });
      }
    }

    return { nodes: graphNodes, edges: graphEdges };
  }, [files, selectedFilePath, onSelectFile]);

  if (files.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
        No source files found in this scan.
      </div>
    );
  }

  return (
    <div className="h-[460px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d1014]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        onNodeClick={(_, node) => onSelectFile(node.id)}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
