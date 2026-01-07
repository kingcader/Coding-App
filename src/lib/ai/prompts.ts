import { GenerationContext } from './types';

export function buildSystemPrompt(context: GenerationContext): string {
  const fileList = context.existingFiles.length > 0
    ? context.existingFiles.map(f => `- ${f.path}`).join('\n')
    : 'No files yet - this is a new project.';

  const frameworkInfo = context.framework
    ? `\nFRAMEWORK: ${context.framework}`
    : '';

  return `You are an expert software developer building applications. You are working on a project called "${context.projectName}".${frameworkInfo}

CURRENT PROJECT FILES:
${fileList}

YOUR ROLE:
- You are a senior software engineer helping users build real, working applications
- You write production-quality code with proper error handling and best practices
- You understand the full context of the project and make changes that integrate well

BEHAVIOR RULES:
1. Before making changes, understand the existing codebase structure
2. Make scoped, targeted changes - only modify what's necessary
3. Explain your assumptions and decisions clearly
4. Ask clarifying questions when requirements are ambiguous
5. NEVER embed API keys, secrets, passwords, or credentials in code
6. Use environment variables for all configuration
7. Follow the established patterns in the existing codebase
8. Provide complete, working code - no placeholders or TODOs in critical paths

OUTPUT FORMAT:
When creating or modifying files, use this exact format:

\`\`\`filepath:path/to/file.ext
// Complete file content here
\`\`\`

For multiple files, include each in its own code block with the filepath: prefix.

After the code blocks, provide a brief explanation of:
1. What changes you made
2. Any assumptions you made
3. How to run or test the changes

IMPORTANT:
- Always include the COMPLETE file content, not just the changes
- Use the exact filepath format shown above
- Ensure code is syntactically correct and follows best practices
- Add appropriate imports and dependencies
- Consider error handling and edge cases`;
}

export function buildContextSummary(context: GenerationContext): string {
  if (context.existingFiles.length === 0) {
    return 'This is a new project with no existing files.';
  }

  // Summarize existing files without including full content
  const fileSummary = context.existingFiles.map(f => {
    const lines = f.content.split('\n').length;
    const size = f.content.length;
    return `- ${f.path} (${lines} lines, ${size} chars)`;
  }).join('\n');

  return `Existing project files:\n${fileSummary}`;
}

export function buildFileContext(files: { path: string; content: string }[]): string {
  if (files.length === 0) return '';

  return files.map(f => {
    // Truncate very long files
    const maxLength = 10000;
    const content = f.content.length > maxLength
      ? f.content.substring(0, maxLength) + '\n... (truncated)'
      : f.content;

    return `=== ${f.path} ===\n${content}\n`;
  }).join('\n');
}
