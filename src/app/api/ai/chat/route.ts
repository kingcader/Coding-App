import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProvider, getDefaultProvider, isProviderAvailable } from '@/lib/ai/providers';
import { AIProviderType, GenerationContext, Message } from '@/lib/ai/types';
import { determineFileActions } from '@/lib/ai/code-parser';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { projectId, prompt, provider: requestedProvider } = body;

    if (!projectId || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Project ID and prompt are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: {
        files: { select: { path: true, content: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
          select: { role: true, content: true },
        },
      },
    });

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check usage limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    const limit = subscription?.monthlyGenerationsLimit || 5;
    if (limit !== -1) {
      const usageCount = await prisma.usageRecord.count({
        where: {
          userId: session.user.id,
          type: 'GENERATION',
          periodStart: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      });

      if (usageCount >= limit) {
        return new Response(
          JSON.stringify({
            error: 'Generation limit reached',
            message: 'You have reached your monthly generation limit. Upgrade your plan for more.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine provider
    let providerType: AIProviderType = requestedProvider || getDefaultProvider();
    if (!isProviderAvailable(providerType)) {
      providerType = getDefaultProvider();
      if (!isProviderAvailable(providerType)) {
        return new Response(
          JSON.stringify({ error: 'No AI provider available. Please configure API keys.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const provider = getProvider(providerType);

    // Build context
    const context: GenerationContext = {
      projectId,
      projectName: project.name,
      framework: project.framework,
      existingFiles: project.files,
      conversationHistory: project.messages.map(m => ({
        role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      prompt,
    };

    // Save user message
    await prisma.message.create({
      data: {
        projectId,
        userId: session.user.id,
        role: 'USER',
        content: prompt,
      },
    });

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        projectId,
        prompt,
        response: '',
        provider: providerType,
        model: '',
        filesChanged: [] as Prisma.InputJsonValue,
        status: 'IN_PROGRESS',
      },
    });

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        let finalResult: any = null;

        try {
          await provider.generateStream(context, {
            onToken: (token) => {
              fullResponse += token;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`)
              );
            },
            onComplete: async (result) => {
              finalResult = result;

              // Determine file actions
              const existingPaths = project.files.map(f => f.path);
              const filesWithActions = determineFileActions(result.files, existingPaths);

              // Save files to database
              for (const file of filesWithActions) {
                if (file.action === 'delete') {
                  await prisma.projectFile.deleteMany({
                    where: { projectId, path: file.path },
                  });
                } else if (file.content) {
                  const existingFile = await prisma.projectFile.findUnique({
                    where: { projectId_path: { projectId, path: file.path } },
                  });

                  if (existingFile) {
                    // Create version backup
                    await prisma.fileVersion.create({
                      data: {
                        fileId: existingFile.id,
                        content: existingFile.content,
                        version: existingFile.version,
                        generationId: generation.id,
                      },
                    });

                    // Update file
                    await prisma.projectFile.update({
                      where: { id: existingFile.id },
                      data: {
                        content: file.content,
                        size: Buffer.byteLength(file.content, 'utf8'),
                        version: existingFile.version + 1,
                      },
                    });
                  } else {
                    // Create new file
                    await prisma.projectFile.create({
                      data: {
                        projectId,
                        path: file.path,
                        content: file.content,
                        size: Buffer.byteLength(file.content, 'utf8'),
                      },
                    });
                  }
                }
              }

              // Update generation record
              await prisma.generation.update({
                where: { id: generation.id },
                data: {
                  response: fullResponse,
                  model: result.model,
                  filesChanged: filesWithActions as unknown as Prisma.InputJsonValue,
                  status: 'COMPLETED',
                  promptTokens: result.tokensUsed.prompt,
                  completionTokens: result.tokensUsed.completion,
                  totalTokens: result.tokensUsed.total,
                  completedAt: new Date(),
                },
              });

              // Save assistant message
              await prisma.message.create({
                data: {
                  projectId,
                  userId: session.user.id,
                  role: 'ASSISTANT',
                  content: fullResponse,
                  generationId: generation.id,
                },
              });

              // Record usage
              await prisma.usageRecord.create({
                data: {
                  userId: session.user.id,
                  projectId,
                  type: 'GENERATION',
                  periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
                  metadata: {
                    provider: providerType,
                    model: result.model,
                    tokens: result.tokensUsed.total,
                  },
                },
              });

              // Update project timestamp
              await prisma.project.update({
                where: { id: projectId },
                data: { updatedAt: new Date() },
              });

              // Send completion event
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'complete',
                    files: filesWithActions,
                    explanation: result.explanation,
                    tokens: result.tokensUsed,
                    generationId: generation.id,
                  })}\n\n`
                )
              );

              controller.close();
            },
            onError: async (error) => {
              console.error('Generation error:', error);

              // Update generation as failed
              await prisma.generation.update({
                where: { id: generation.id },
                data: {
                  status: 'FAILED',
                  errorMessage: error.message,
                },
              });

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
                )
              );
              controller.close();
            },
          });
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
