'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface ProjectFile {
  id: string;
  path: string;
  content: string;
  version: number;
  updatedAt: string;
}

interface Usage {
  used: number;
  limit: number;
  remaining: number;
}

interface ChatInterfaceProps {
  projectId: string;
  messages: Message[];
  files: ProjectFile[];
  onNewMessage: (message: Message) => void;
  onFilesUpdated: (files: ProjectFile[]) => void;
  usage: Usage;
}

export function ChatInterface({
  projectId,
  messages,
  files,
  onNewMessage,
  onFilesUpdated,
  usage,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);
    setStreamingContent('');

    // Add user message immediately
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    onNewMessage(userMsg);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          prompt: userMessage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to generate');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let accumulatedContent = '';
      let updatedFiles: ProjectFile[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'token') {
                accumulatedContent += data.content;
                setStreamingContent(accumulatedContent);
              } else if (data.type === 'complete') {
                // Handle completion
                const assistantMsg: Message = {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content: accumulatedContent,
                  createdAt: new Date().toISOString(),
                };
                onNewMessage(assistantMsg);
                setStreamingContent('');

                // Update files if any were changed
                if (data.files && data.files.length > 0) {
                  // Fetch updated files
                  const filesResponse = await fetch(
                    `/api/projects/${projectId}/files`
                  );
                  if (filesResponse.ok) {
                    const filesData = await filesResponse.json();
                    onFilesUpdated(filesData.files || []);
                  }
                }
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate');
      setStreamingContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canGenerate = usage.remaining === -1 || usage.remaining > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-4">
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Start Building
            </h2>
            <p className="text-gray-400 max-w-md">
              Describe what you want to build. The AI will generate code, create
              files, and help you iterate until you&apos;re happy.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Create a todo app',
                'Build a landing page',
                'Make a REST API',
                'Add authentication',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 rounded-full bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              createdAt: new Date().toISOString(),
            }}
            isStreaming
          />
        )}

        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400/70 text-xs hover:underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        {!canGenerate && (
          <div className="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-400 text-sm">
              You&apos;ve used all your generations this month.{' '}
              <a href="/billing" className="underline hover:no-underline">
                Upgrade your plan
              </a>{' '}
              for more.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              canGenerate
                ? 'Describe what you want to build...'
                : 'Generation limit reached'
            }
            disabled={isLoading || !canGenerate}
            className="min-h-[48px] max-h-[200px] resize-none"
            rows={1}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading || !canGenerate}
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>
            {files.length} file{files.length !== 1 ? 's' : ''} in project
          </span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-blue-600'
            : 'bg-gradient-to-br from-blue-500 to-purple-600'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Sparkles className="h-4 w-4 text-white" />
        )}
      </div>

      <div
        className={cn(
          'flex-1 rounded-2xl px-4 py-3 max-w-[80%]',
          isUser ? 'bg-blue-600/20 ml-auto' : 'bg-gray-800'
        )}
      >
        <div className="prose prose-invert prose-sm max-w-none">
          <MessageContent content={message.content} />
        </div>
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering for code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\S+)?\n?([\s\S]*?)```/);
          if (match) {
            const [, lang, code] = match;
            return (
              <pre
                key={i}
                className="bg-gray-900 rounded-lg p-3 overflow-x-auto text-sm my-2"
              >
                {lang && (
                  <div className="text-xs text-gray-500 mb-2">{lang}</div>
                )}
                <code className="text-gray-300">{code.trim()}</code>
              </pre>
            );
          }
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </>
  );
}
