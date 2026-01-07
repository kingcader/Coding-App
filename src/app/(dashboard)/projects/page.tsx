import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Clock,
  Sparkles,
  FileCode,
  MoreVertical,
  Archive,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils';

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);

  const projects = await prisma.project.findMany({
    where: {
      userId: session?.user?.id,
      status: 'ACTIVE',
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          files: true,
          generations: true,
        },
      },
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session?.user?.id },
  });

  const maxProjects = subscription?.maxProjectsLimit || 1;
  const canCreateProject = maxProjects === -1 || projects.length < maxProjects;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
            {maxProjects !== -1 && ` of ${maxProjects} max`}
          </p>
        </div>
        <Link href="/projects/new">
          <Button disabled={!canCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Project Limit Warning */}
      {!canCreateProject && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-400 text-sm">
            You&apos;ve reached your project limit.{' '}
            <Link href="/billing" className="underline hover:no-underline">
              Upgrade your plan
            </Link>{' '}
            to create more projects.
          </p>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanban className="h-16 w-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No projects yet
            </h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Create your first project to start building apps with natural
              language. Describe what you want, and AI will generate the code.
            </p>
            <Link href="/projects/new">
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full hover:border-gray-700 transition-colors cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-colors">
                      <FolderKanban className="h-5 w-5 text-blue-400" />
                    </div>
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </h3>

                  {project.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <FileCode className="h-3.5 w-3.5" />
                      {project._count.files} files
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      {project._count.generations} generations
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-800 flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    Updated {formatRelativeTime(project.updatedAt)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
