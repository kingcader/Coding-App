import type OpenAI from 'openai';
import {
  AIProvider,
  GenerationContext,
  GenerationResult,
  StreamCallbacks,
} from '../types';
import { buildSystemPrompt, buildFileContext } from '../prompts';
import { parseFileChanges, extractExplanation, scanForSecurityIssues } from '../code-parser';

const DEFAULT_MODEL = 'gpt-4-turbo-preview';
const MAX_TOKENS = 8192;

export class OpenAIProvider implements AIProvider {
  name = 'OPENAI' as const;
  private _client: OpenAI | null = null;
  private apiKey?: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || DEFAULT_MODEL;
  }

  private async getClient(): Promise<OpenAI> {
    if (!this._client) {
      const key = this.apiKey || process.env.OPENAI_API_KEY;
      if (!key) {
        throw new Error('OPENAI_API_KEY is not configured');
      }
      // Dynamic import to avoid initialization at module load time
      const { default: OpenAISDK } = await import('openai');
      this._client = new OpenAISDK({ apiKey: key });
    }
    return this._client;
  }

  async generate(context: GenerationContext): Promise<GenerationResult> {
    try {
      const client = await this.getClient();
      const systemPrompt = buildSystemPrompt(context);
      const fileContext = buildFileContext(context.existingFiles);

      // Build messages array
      type MessageParam = { role: 'system' | 'user' | 'assistant'; content: string };
      const messages: MessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history
      for (const msg of context.conversationHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        });
      }

      // Add current prompt with file context
      let currentPrompt = context.prompt;
      if (fileContext && context.existingFiles.length > 0) {
        currentPrompt = `Here are the current project files for reference:\n\n${fileContext}\n\nUser request: ${context.prompt}`;
      }

      messages.push({
        role: 'user',
        content: currentPrompt,
      });

      const response = await client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
      });

      const responseText = response.choices[0]?.message?.content || '';

      // Parse file changes
      const files = parseFileChanges(responseText);

      // Scan for security issues
      const allCode = files.map(f => f.content || '').join('\n');
      const securityIssues = scanForSecurityIssues(allCode);

      // Extract explanation
      const explanation = extractExplanation(responseText);

      const usage = response.usage;

      return {
        success: true,
        response: responseText,
        files,
        explanation: securityIssues.length > 0
          ? `${explanation}\n\nWarning: ${securityIssues.join(', ')}`
          : explanation,
        tokensUsed: {
          prompt: usage?.prompt_tokens || 0,
          completion: usage?.completion_tokens || 0,
          total: usage?.total_tokens || 0,
        },
        model: this.model,
      };
    } catch (error) {
      console.error('OpenAI generation error:', error);
      return {
        success: false,
        response: '',
        files: [],
        explanation: '',
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        model: this.model,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async generateStream(
    context: GenerationContext,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const systemPrompt = buildSystemPrompt(context);
      const fileContext = buildFileContext(context.existingFiles);

      // Build messages array
      type MessageParam = { role: 'system' | 'user' | 'assistant'; content: string };
      const messages: MessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history
      for (const msg of context.conversationHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        });
      }

      // Add current prompt with file context
      let currentPrompt = context.prompt;
      if (fileContext && context.existingFiles.length > 0) {
        currentPrompt = `Here are the current project files for reference:\n\n${fileContext}\n\nUser request: ${context.prompt}`;
      }

      messages.push({
        role: 'user',
        content: currentPrompt,
      });

      let fullResponse = '';

      const stream = await client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          callbacks.onToken?.(content);
        }
      }

      // Parse final response
      const files = parseFileChanges(fullResponse);
      const explanation = extractExplanation(fullResponse);

      // Estimate tokens (OpenAI doesn't provide token counts in streaming)
      const estimatedPromptTokens = Math.ceil(
        messages.reduce((acc, m) => acc + (m.content?.toString().length || 0), 0) / 4
      );
      const estimatedCompletionTokens = Math.ceil(fullResponse.length / 4);

      callbacks.onComplete?.({
        success: true,
        response: fullResponse,
        files,
        explanation,
        tokensUsed: {
          prompt: estimatedPromptTokens,
          completion: estimatedCompletionTokens,
          total: estimatedPromptTokens + estimatedCompletionTokens,
        },
        model: this.model,
      });
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
