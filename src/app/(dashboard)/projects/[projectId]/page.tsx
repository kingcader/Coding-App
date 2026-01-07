import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectWorkspace } from '@/components/workspace/ProjectWorkspace';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { projectId } = await params;

  // Fetch project with related data
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
      status: { not: 'DELETED' },
    },
    include: {
      files: {
        orderBy: { path: 'asc' },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
      generations: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!project) {
    redirect('/projects');
  }

  // Get subscription info
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  // Get current usage
  const usageCount = await prisma.usageRecord.count({
    where: {
      userId: session.user.id,
      type: 'GENERATION',
      periodStart: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  const generationsLimit = subscription?.monthlyGenerationsLimit || 5;
  const generationsRemaining =
    generationsLimit === -1 ? -1 : Math.max(0, generationsLimit - usageCount);

  return (
    <ProjectWorkspace
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        framework: project.framework,
        status: project.status,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      }}
      files={project.files.map((f: typeof project.files[0]) => ({
        id: f.id,
        path: f.path,
        content: f.content,
        version: f.version,
        updatedAt: f.updatedAt.toISOString(),
      }))}
      messages={project.messages.map((m: typeof project.messages[0]) => ({
        id: m.id,
        role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }))}
      generations={project.generations.map((g: typeof project.generations[0]) => ({
        id: g.id,
        prompt: g.prompt,
        status: g.status,
        filesChanged: g.filesChanged as any[],
        createdAt: g.createdAt.toISOString(),
      }))}
      usage={{
        used: usageCount,
        limit: generationsLimit,
        remaining: generationsRemaining,
      }}
    />
  );
}
