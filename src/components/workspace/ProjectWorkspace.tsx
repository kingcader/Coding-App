'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from './ChatInterface';
import { FileExplorer } from './FileExplorer';
import { FileViewer } from './FileViewer';

interface Project {
  id: string;
  name: string;
  description: string | null;
  framework: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectFile {
  id: string;
  path: string;
  content: string;
  version: number;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface Generation {
  id: string;
  prompt: string;
  status: string;
  filesChanged: any[];
  createdAt: string;
}

interface Usage {
  used: number;
  limit: number;
  remaining: number;
}

interface ProjectWorkspaceProps {
  project: Project;
  files: ProjectFile[];
  messages: Message[];
  generations: Generation[];
  usage: Usage;
}

export function ProjectWorkspace({
  project,
  files: initialFiles,
  messages: initialMessages,
  generations,
  usage,
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [messages, setMessages] = useState(initialMessages);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [showFilePanel, setShowFilePanel] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileSelect = useCallback((file: ProjectFile) => {
    setSelectedFile(file);
  }, []);

  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const handleFilesUpdated = useCallback((updatedFiles: ProjectFile[]) => {
    setFiles(updatedFiles);
    // Refresh the selected file if it was updated
    if (selectedFile) {
      const updated = updatedFiles.find((f) => f.id === selectedFile.id);
      if (updated) {
        setSelectedFile(updated);
      }
    }
  }, [selectedFile]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/export`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export project');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem-1.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-white">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-gray-400">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Usage Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 text-sm">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-gray-300">
              {usage.remaining === -1 ? '∞' : usage.remaining} generations left
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || files.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>

          <Link href={`/projects/${project.id}/settings`}>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* File Panel */}
        {showFilePanel && (
          <div className="w-64 flex-shrink-0 flex flex-col bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-800">
              <span className="font-medium text-sm text-gray-300">Files</span>
              <button
                onClick={() => setShowFilePanel(false)}
                className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <FileExplorer
                files={files}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
              />
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          {!showFilePanel && (
            <button
              onClick={() => setShowFilePanel(true)}
              className="absolute left-4 top-20 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white z-10"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <ChatInterface
            projectId={project.id}
            messages={messages}
            files={files}
            onNewMessage={handleNewMessage}
            onFilesUpdated={handleFilesUpdated}
            usage={usage}
          />
        </div>

        {/* File Viewer */}
        {selectedFile && (
          <div className="w-1/2 flex-shrink-0 flex flex-col bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <FileViewer
              file={selectedFile}
              onClose={() => setSelectedFile(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
