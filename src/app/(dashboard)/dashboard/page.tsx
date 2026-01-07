import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  FolderKanban,
  Sparkles,
  Plus,
  ArrowRight,
  Zap,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Fetch user data with subscription and recent projects
  const [subscription, recentProjects, usageCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session?.user?.id },
    }),
    prisma.project.findMany({
      where: {
        userId: session?.user?.id,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: { generations: true, files: true },
        },
      },
    }),
    prisma.usageRecord.count({
      where: {
        userId: session?.user?.id,
        type: 'GENERATION',
        periodStart: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const projectCount = await prisma.project.count({
    where: { userId: session?.user?.id, status: 'ACTIVE' },
  });

  const tier = subscription?.tier || 'FREE';
  const generationsLimit = subscription?.monthlyGenerationsLimit || 5;
  const generationsUsed = usageCount;
  const generationsRemaining = Math.max(0, generationsLimit - generationsUsed);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {session?.user?.name?.split(' ')[0] || 'Builder'}
        </h1>
        <p className="text-gray-400 mt-1">
          Build apps with natural language. Describe what you want, get real code.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Active Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{projectCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              {tier === 'FREE'
                ? `${subscription?.maxProjectsLimit || 1} max on Free plan`
                : 'Unlimited projects'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Generations Used
            </CardTitle>
            <Sparkles className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {generationsUsed}{' '}
              <span className="text-sm font-normal text-gray-500">
                / {generationsLimit === -1 ? '∞' : generationsLimit}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {generationsRemaining > 0
                ? `${generationsRemaining} remaining this month`
                : 'Upgrade for more generations'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Current Plan
            </CardTitle>
            <Zap className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{tier}</div>
            <Link
              href="/billing"
              className="text-xs text-blue-400 hover:underline mt-1 inline-block"
            >
              {tier === 'FREE' ? 'Upgrade for more' : 'Manage subscription'}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/projects/new">
          <Card className="h-full hover:border-blue-600/50 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors">
                <Plus className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Create New Project
                </h3>
                <p className="text-sm text-gray-400">
                  Start building a new app with AI
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects">
          <Card className="h-full hover:border-gray-700 transition-colors cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 group-hover:bg-gray-700 transition-colors">
                <FolderKanban className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">View All Projects</h3>
                <p className="text-sm text-gray-400">
                  Continue working on existing projects
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Projects</h2>
          <Link
            href="/projects"
            className="text-sm text-blue-400 hover:underline"
          >
            View all
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No projects yet
              </h3>
              <p className="text-gray-400 mb-4 max-w-md">
                Create your first project and start building apps with natural
                language descriptions.
              </p>
              <Link href="/projects/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:border-gray-700 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800">
                      <FolderKanban className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>{project._count.files} files</span>
                        <span>{project._count.generations} generations</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatRelativeTime(project.updatedAt)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
