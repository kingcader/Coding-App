'use client';

import { useState } from 'react';
import { X, Copy, Check, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getFileExtension, formatRelativeTime } from '@/lib/utils';

interface ProjectFile {
  id: string;
  path: string;
  content: string;
  version: number;
  updatedAt: string;
}

interface FileViewerProps {
  file: ProjectFile;
  onClose: () => void;
}

export function FileViewer({ file, onClose }: FileViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const lines = file.content.split('\n');
  const lineNumberWidth = String(lines.length).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-white truncate">
            {file.path}
          </span>
          <span className="text-xs text-gray-500">v{file.version}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-400" />
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Line Numbers */}
          <div className="flex-shrink-0 bg-gray-900/50 border-r border-gray-800 select-none">
            <pre className="p-4 text-right">
              {lines.map((_, i) => (
                <div
                  key={i}
                  className="text-xs text-gray-600 leading-5"
                  style={{ minWidth: `${lineNumberWidth + 1}ch` }}
                >
                  {i + 1}
                </div>
              ))}
            </pre>
          </div>

          {/* Code */}
          <div className="flex-1 overflow-x-auto">
            <pre className="p-4">
              <code className={cn('text-sm leading-5', getLanguageClass(file.path))}>
                {lines.map((line, i) => (
                  <div key={i} className="whitespace-pre">
                    {highlightLine(line, file.path) || ' '}
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 text-xs text-gray-500">
        <span>{lines.length} lines</span>
        <span>Updated {formatRelativeTime(file.updatedAt)}</span>
      </div>
    </div>
  );
}

function getLanguageClass(filename: string): string {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'language-typescript';
    case 'js':
    case 'jsx':
      return 'language-javascript';
    case 'json':
      return 'language-json';
    case 'html':
      return 'language-html';
    case 'css':
    case 'scss':
      return 'language-css';
    case 'py':
      return 'language-python';
    case 'md':
      return 'language-markdown';
    default:
      return 'language-plaintext';
  }
}

// Simple syntax highlighting
function highlightLine(line: string, filename: string): React.ReactNode {
  const ext = getFileExtension(filename);

  // Basic keyword highlighting for TypeScript/JavaScript
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
    return highlightJSLine(line);
  }

  // JSON highlighting
  if (ext === 'json') {
    return highlightJSONLine(line);
  }

  return line;
}

function highlightJSLine(line: string): React.ReactNode {
  const keywords =
    /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|implements|interface|type|async|await|try|catch|throw|new|this|super|static|public|private|protected|readonly|as|typeof|instanceof|in|of|default|null|undefined|true|false)\b/g;
  const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/g;
  const numbers = /\b(\d+\.?\d*)\b/g;

  let result = line;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  // Find all matches
  const matches: { index: number; length: number; type: string; text: string }[] = [];

  let match;
  while ((match = comments.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: 'comment', text: match[0] });
  }
  while ((match = strings.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: 'string', text: match[0] });
  }
  while ((match = keywords.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: 'keyword', text: match[0] });
  }
  while ((match = numbers.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: 'number', text: match[0] });
  }

  // Sort by index and remove overlapping
  matches.sort((a, b) => a.index - b.index);
  const filtered = matches.filter((m, i) => {
    if (i === 0) return true;
    const prev = matches[i - 1];
    return m.index >= prev.index + prev.length;
  });

  for (const m of filtered) {
    if (m.index > lastIndex) {
      elements.push(line.slice(lastIndex, m.index));
    }

    const className = {
      comment: 'text-gray-500 italic',
      string: 'text-green-400',
      keyword: 'text-purple-400',
      number: 'text-orange-400',
    }[m.type];

    elements.push(
      <span key={`${m.index}-${m.type}`} className={className}>
        {m.text}
      </span>
    );

    lastIndex = m.index + m.length;
  }

  if (lastIndex < line.length) {
    elements.push(line.slice(lastIndex));
  }

  return elements.length > 0 ? elements : line;
}

function highlightJSONLine(line: string): React.ReactNode {
  const strings = /(["'])(?:(?!\1)[^\\]|\\.)*\1/g;
  const numbers = /\b(\d+\.?\d*)\b/g;
  const keywords = /\b(true|false|null)\b/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  const matches: { index: number; length: number; type: string; text: string }[] = [];

  while ((match = strings.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: 'string', text: match[0] });
  }
  while ((match = numbers.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: 'number', text: match[0] });
  }
  while ((match = keywords.exec(line)) !== null) {
    matches.push({ index: match.index, length: match[0].length, type: 'keyword', text: match[0] });
  }

  matches.sort((a, b) => a.index - b.index);

  for (const m of matches) {
    if (m.index > lastIndex) {
      elements.push(line.slice(lastIndex, m.index));
    }

    const className = {
      string: 'text-green-400',
      number: 'text-orange-400',
      keyword: 'text-purple-400',
    }[m.type];

    elements.push(
      <span key={`${m.index}-${m.type}`} className={className}>
        {m.text}
      </span>
    );

    lastIndex = m.index + m.length;
  }

  if (lastIndex < line.length) {
    elements.push(line.slice(lastIndex));
  }

  return elements.length > 0 ? elements : line;
}
