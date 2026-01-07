export type AIProviderType = 'CLAUDE' | 'OPENAI';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
}

export interface GenerationContext {
  projectId: string;
  projectName: string;
  framework?: string | null;
  existingFiles: {
    path: string;
    content: string;
  }[];
  conversationHistory: Message[];
  prompt: string;
}

export interface GenerationResult {
  success: boolean;
  response: string;
  files: FileChange[];
  explanation: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  error?: string;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (result: GenerationResult) => void;
  onError?: (error: Error) => void;
}

export interface AIProvider {
  name: AIProviderType;
  generate(context: GenerationContext): Promise<GenerationResult>;
  generateStream(
    context: GenerationContext,
    callbacks: StreamCallbacks
  ): Promise<void>;
}
