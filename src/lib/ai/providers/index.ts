import { AIProvider, AIProviderType } from '../types';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';

export function getProvider(
  providerType: AIProviderType,
  options?: {
    apiKey?: string;
    model?: string;
  }
): AIProvider {
  switch (providerType) {
    case 'CLAUDE':
      return new ClaudeProvider(options?.apiKey, options?.model);
    case 'OPENAI':
      return new OpenAIProvider(options?.apiKey, options?.model);
    default:
      throw new Error(`Unknown provider: ${providerType}`);
  }
}

export function getDefaultProvider(): AIProviderType {
  // Prefer Claude if API key is available, otherwise OpenAI
  if (process.env.ANTHROPIC_API_KEY) {
    return 'CLAUDE';
  }
  if (process.env.OPENAI_API_KEY) {
    return 'OPENAI';
  }
  return 'CLAUDE'; // Default
}

export function isProviderAvailable(providerType: AIProviderType): boolean {
  switch (providerType) {
    case 'CLAUDE':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'OPENAI':
      return !!process.env.OPENAI_API_KEY;
    default:
      return false;
  }
}

export function getAvailableProviders(): AIProviderType[] {
  const providers: AIProviderType[] = [];
  if (process.env.ANTHROPIC_API_KEY) providers.push('CLAUDE');
  if (process.env.OPENAI_API_KEY) providers.push('OPENAI');
  return providers;
}

export { ClaudeProvider } from './claude';
export { OpenAIProvider } from './openai';
