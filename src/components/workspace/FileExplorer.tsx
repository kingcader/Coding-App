'use client';

import { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn, getFileExtension } from '@/lib/utils';

interface ProjectFile {
  id: string;
  path: string;
  content: string;
  version: number;
  updatedAt: string;
}

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onFileSelect: (file: ProjectFile) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: ProjectFile;
}

function buildFileTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const pathMap: Record<string, TreeNode> = {};

  // Sort files by path
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!pathMap[currentPath]) {
        const node: TreeNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          ...(isFile ? { file } : { children: [] }),
        };

        pathMap[currentPath] = node;

        if (parentPath && pathMap[parentPath]) {
          pathMap[parentPath].children!.push(node);
        } else if (!parentPath) {
          root.push(node);
        }
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortTree = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({
        ...node,
        children: node.children ? sortTree(node.children) : undefined,
      }));
  };

  return sortTree(root);
}

function getFileIcon(filename: string) {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return FileCode;
    case 'json':
      return FileJson;
    case 'md':
    case 'txt':
      return FileText;
    default:
      return File;
  }
}

export function FileExplorer({
  files,
  selectedFile,
  onFileSelect,
}: FileExplorerProps) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['src', 'app', 'components'])
  );

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Folder className="h-8 w-8 text-gray-600 mb-2" />
        <p className="text-sm text-gray-500">No files yet</p>
        <p className="text-xs text-gray-600 mt-1">
          Start chatting to generate code
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          depth={0}
        />
      ))}
    </div>
  );
}

function TreeItem({
  node,
  expandedFolders,
  onToggleFolder,
  selectedFile,
  onFileSelect,
  depth,
}: {
  node: TreeNode;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  selectedFile: ProjectFile | null;
  onFileSelect: (file: ProjectFile) => void;
  depth: number;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.file && selectedFile?.id === node.file.id;

  if (node.type === 'folder') {
    const FolderIcon = isExpanded ? FolderOpen : Folder;
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.path)}
          className={cn(
            'w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors',
            'focus:outline-none focus:ring-1 focus:ring-blue-500'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <ChevronIcon className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
          <FolderIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const FileIcon = getFileIcon(node.name);

  return (
    <button
      onClick={() => node.file && onFileSelect(node.file)}
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors',
        'focus:outline-none focus:ring-1 focus:ring-blue-500',
        isSelected
          ? 'bg-blue-600/20 text-blue-300'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      )}
      style={{ paddingLeft: `${depth * 12 + 28}px` }}
    >
      <FileIcon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
