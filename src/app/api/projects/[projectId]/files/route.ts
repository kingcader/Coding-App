import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// Helper to verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  return project;
}

// GET /api/projects/[projectId]/files - List all files in a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify ownership
    const project = await verifyProjectOwnership(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const files = await prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
      select: {
        id: true,
        path: true,
        mimeType: true,
        size: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform to tree structure
    const fileTree = buildFileTree(files);

    return NextResponse.json({ files, tree: fileTree });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/files - Create or update a file
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify ownership
    const project = await verifyProjectOwnership(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { path, content, mimeType } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Validate path (prevent directory traversal)
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Check if file exists
    const existingFile = await prisma.projectFile.findUnique({
      where: {
        projectId_path: { projectId, path },
      },
    });

    if (existingFile) {
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
          mimeType: mimeType || getMimeType(path),
          size: Buffer.byteLength(content || '', 'utf8'),
          version: existingFile.version + 1,
        },
      });

      return NextResponse.json(file);
    } else {
      // Create new file
      const file = await prisma.projectFile.create({
        data: {
          projectId,
          path,
          content: content || '',
          mimeType: mimeType || getMimeType(path),
          size: Buffer.byteLength(content || '', 'utf8'),
        },
      });

      return NextResponse.json(file, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating/updating file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}

// Helper to get MIME type from file extension
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    ts: 'text/typescript',
    tsx: 'text/typescript',
    js: 'text/javascript',
    jsx: 'text/javascript',
    json: 'application/json',
    html: 'text/html',
    css: 'text/css',
    scss: 'text/scss',
    md: 'text/markdown',
    py: 'text/x-python',
    go: 'text/x-go',
    rs: 'text/x-rust',
    java: 'text/x-java',
    rb: 'text/x-ruby',
    php: 'text/x-php',
    sql: 'text/x-sql',
    yml: 'text/yaml',
    yaml: 'text/yaml',
    xml: 'text/xml',
    svg: 'image/svg+xml',
    txt: 'text/plain',
  };
  return mimeTypes[ext || ''] || 'text/plain';
}

// Helper to build file tree structure
interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  id?: string;
}

function buildFileTree(files: { id: string; path: string }[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const pathMap: Record<string, FileTreeNode> = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!pathMap[currentPath]) {
        const node: FileTreeNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          ...(isFile ? { id: file.id } : { children: [] }),
        };

        pathMap[currentPath] = node;

        if (parentPath && pathMap[parentPath]) {
          pathMap[parentPath].children!.push(node);
        } else if (!parentPath) {
          root.push(node);
        }
      }
    }
  }

  // Sort folders first, then files, alphabetically
  const sortTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }));
  };

  return sortTree(root);
}
