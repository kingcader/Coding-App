import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ projectId: string; path: string[] }>;
}

// Helper to verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  return project;
}

// GET /api/projects/[projectId]/files/[...path] - Get file content
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, path } = await params;
    const filePath = path.join('/');

    // Verify ownership
    const project = await verifyProjectOwnership(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const file = await prisma.projectFile.findUnique({
      where: {
        projectId_path: { projectId, path: filePath },
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId]/files/[...path] - Update file content
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, path } = await params;
    const filePath = path.join('/');

    // Verify ownership
    const project = await verifyProjectOwnership(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    const existingFile = await prisma.projectFile.findUnique({
      where: {
        projectId_path: { projectId, path: filePath },
      },
    });

    if (!existingFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Create version backup
    await prisma.fileVersion.create({
      data: {
        fileId: existingFile.id,
        content: existingFile.content,
        version: existingFile.version,
      },
    });

    // Update file
    const file = await prisma.projectFile.update({
      where: { id: existingFile.id },
      data: {
        content: content || '',
        size: Buffer.byteLength(content || '', 'utf8'),
        version: existingFile.version + 1,
      },
    });

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/files/[...path] - Delete a file
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, path } = await params;
    const filePath = path.join('/');

    // Verify ownership
    const project = await verifyProjectOwnership(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const file = await prisma.projectFile.findUnique({
      where: {
        projectId_path: { projectId, path: filePath },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete file and all its versions (cascade)
    await prisma.projectFile.delete({
      where: { id: file.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
