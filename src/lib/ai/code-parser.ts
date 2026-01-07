import { FileChange } from './types';

/**
 * Parse AI response to extract file changes
 * Expected format:
 * ```filepath:path/to/file.ext
 * file content
 * ```
 */
export function parseFileChanges(response: string): FileChange[] {
  const files: FileChange[] = [];

  // Match code blocks with filepath: prefix
  const codeBlockRegex = /```(?:filepath:)?([^\n`]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const pathPart = match[1].trim();
    const content = match[2];

    // Skip if no valid path
    if (!pathPart || pathPart.includes(' ') && !pathPart.startsWith('filepath:')) {
      continue;
    }

    // Extract the actual path
    let filePath = pathPart;
    if (filePath.startsWith('filepath:')) {
      filePath = filePath.substring(9).trim();
    }

    // Clean up common prefixes
    filePath = filePath
      .replace(/^(typescript|javascript|tsx|jsx|ts|js|json|html|css|python|go|rust)$/i, '')
      .trim();

    // Skip if path looks like a language name only
    if (!filePath || !filePath.includes('.') && !filePath.includes('/')) {
      continue;
    }

    // Validate path
    if (isValidFilePath(filePath)) {
      files.push({
        path: filePath,
        action: 'create', // Will be determined by comparing with existing files
        content: content.trim(),
      });
    }
  }

  // Also try to match simpler format: just language specifier but path in first line
  const simpleBlockRegex = /```(\w+)\n(\/\/\s*)?([^\n]+\.[a-z]+)\n([\s\S]*?)```/g;
  while ((match = simpleBlockRegex.exec(response)) !== null) {
    const possiblePath = match[3].trim();
    const content = match[4];

    // Check if we already have this path
    if (files.some(f => f.path === possiblePath)) continue;

    if (isValidFilePath(possiblePath)) {
      files.push({
        path: possiblePath,
        action: 'create',
        content: content.trim(),
      });
    }
  }

  return files;
}

/**
 * Validate a file path
 */
function isValidFilePath(path: string): boolean {
  // Must have an extension or be a known config file
  const hasExtension = /\.[a-z0-9]+$/i.test(path);
  const isConfigFile = /^(\.gitignore|\.env|\.env\.local|Dockerfile|Makefile|README)$/i.test(path);

  if (!hasExtension && !isConfigFile) return false;

  // No directory traversal
  if (path.includes('..')) return false;

  // No absolute paths
  if (path.startsWith('/') || /^[A-Z]:/i.test(path)) return false;

  // Reasonable length
  if (path.length > 200) return false;

  // Only allowed characters
  if (!/^[\w\-./]+$/.test(path)) return false;

  return true;
}

/**
 * Extract the explanation from the AI response (text after code blocks)
 */
export function extractExplanation(response: string): string {
  // Remove all code blocks
  let text = response.replace(/```[\s\S]*?```/g, '');

  // Clean up
  text = text
    .split('\n')
    .filter(line => line.trim())
    .join('\n')
    .trim();

  return text || 'Changes applied successfully.';
}

/**
 * Scan generated code for potential security issues
 */
export function scanForSecurityIssues(code: string): string[] {
  const issues: string[] = [];

  const patterns = [
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{10,}['"]/gi, name: 'API key' },
    { pattern: /secret\s*[:=]\s*['"][^'"]{10,}['"]/gi, name: 'Secret' },
    { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Password' },
    { pattern: /sk[-_](live|test)[-_][a-zA-Z0-9]+/g, name: 'Stripe key' },
    { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS access key' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub token' },
    { pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+={0,2}/g, name: 'Bearer token' },
  ];

  for (const { pattern, name } of patterns) {
    if (pattern.test(code)) {
      issues.push(`Potential ${name} detected in generated code`);
    }
  }

  return issues;
}

/**
 * Determine if a file change is a create or update based on existing files
 */
export function determineFileActions(
  changes: FileChange[],
  existingPaths: string[]
): FileChange[] {
  return changes.map(change => ({
    ...change,
    action: existingPaths.includes(change.path) ? 'update' : 'create',
  }));
}
