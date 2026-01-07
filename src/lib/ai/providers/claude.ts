import type Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  GenerationContext,
  GenerationResult,
  StreamCallbacks,
} from '../types';
import { buildSystemPrompt, buildFileContext } from '../prompts';
import { parseFileChanges, extractExplanation, scanForSecurityIssues } from '../code-parser';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8192;

export class ClaudeProvider implements AIProvider {
  name = 'CLAUDE' as const;
  private _client: Anthropic | null = null;
  private apiKey?: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || DEFAULT_MODEL;
  }

  private async getClient(): Promise<Anthropic> {
    if (!this._client) {
      const key = this.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      // Dynamic import to avoid initialization at module load time
      const { default: AnthropicSDK } = await import('@anthropic-ai/sdk');
      this._client = new AnthropicSDK({ apiKey: key });
    }
    return this._client;
  }

  async generate(context: GenerationContext): Promise<GenerationResult> {
    try {
      const client = await this.getClient();
      const systemPrompt = buildSystemPrompt(context);
      const fileContext = buildFileContext(context.existingFiles);

      // Build messages array
      type MessageParam = { role: 'user' | 'assistant'; content: string };
      const messages: MessageParam[] = [];

      // Add conversation history
      for (const msg of context.conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
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

      const response = await client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      });

      // Extract response text
      const responseText = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('\n');

      // Parse file changes
      const files = parseFileChanges(responseText);

      // Scan for security issues
      const allCode = files.map(f => f.content || '').join('\n');
      const securityIssues = scanForSecurityIssues(allCode);

      // Extract explanation
      const explanation = extractExplanation(responseText);

      return {
        success: true,
        response: responseText,
        files,
        explanation: securityIssues.length > 0
          ? `${explanation}\n\nWarning: ${securityIssues.join(', ')}`
          : explanation,
        tokensUsed: {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: this.model,
      };
    } catch (error) {
      console.error('Claude generation error:', error);
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
      type MessageParam = { role: 'user' | 'assistant'; content: string };
      const messages: MessageParam[] = [];

      // Add conversation history
      for (const msg of context.conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
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
      let inputTokens = 0;
      let outputTokens = 0;

      const stream = await client.messages.stream({
        model: this.model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string };
          if (delta.text) {
            fullResponse += delta.text;
            callbacks.onToken?.(delta.text);
          }
        } else if (event.type === 'message_delta') {
          const msgEvent = event as { usage?: { output_tokens: number } };
          if (msgEvent.usage) {
            outputTokens = msgEvent.usage.output_tokens;
          }
        } else if (event.type === 'message_start') {
          const msgStartEvent = event as { message?: { usage?: { input_tokens: number } } };
          if (msgStartEvent.message?.usage) {
            inputTokens = msgStartEvent.message.usage.input_tokens;
          }
        }
      }

      // Parse final response
      const files = parseFileChanges(fullResponse);
      const explanation = extractExplanation(fullResponse);

      callbacks.onComplete?.({
        success: true,
        response: fullResponse,
        files,
        explanation,
        tokensUsed: {
          prompt: inputTokens,
          completion: outputTokens,
          total: inputTokens + outputTokens,
        },
        model: this.model,
      });
    } catch (error) {
      console.error('Claude streaming error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
