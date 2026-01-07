import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import JSZip from 'jszip';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/[projectId]/export - Export project as ZIP
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Get project with files
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      include: {
        files: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create ZIP file
    const zip = new JSZip();

    // Add all project files
    for (const file of project.files) {
      zip.file(file.path, file.content);
    }

    // Generate README if not exists
    if (!project.files.some(f => f.path.toLowerCase() === 'readme.md')) {
      const readme = generateReadme(project);
      zip.file('README.md', readme);
    }

    // Generate package.json if not exists and project looks like JS/TS
    const hasJsFiles = project.files.some(f =>
      f.path.endsWith('.js') ||
      f.path.endsWith('.ts') ||
      f.path.endsWith('.jsx') ||
      f.path.endsWith('.tsx')
    );

    if (hasJsFiles && !project.files.some(f => f.path === 'package.json')) {
      const packageJson = generatePackageJson(project);
      zip.file('package.json', packageJson);
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    // Track usage
    await prisma.usageRecord.create({
      data: {
        userId: session.user.id,
        projectId,
        type: 'EXPORT',
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      },
    });

    // Return ZIP file
    const fileName = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting project:', error);
    return NextResponse.json(
      { error: 'Failed to export project' },
      { status: 500 }
    );
  }
}

function generateReadme(project: { name: string; description: string | null; framework: string | null }): string {
  const framework = project.framework || 'Unknown';

  return `# ${project.name}

${project.description || 'A project generated with AI App Builder.'}

## Framework

This project uses: **${framework}**

## Getting Started

### Prerequisites

- Node.js 18+ (for JavaScript/TypeScript projects)
- npm or yarn

### Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open your browser and navigate to the appropriate URL (usually http://localhost:3000 or http://localhost:5173)

## Project Structure

This project was generated using AI App Builder. The structure follows standard conventions for ${framework} projects.

## License

This project is for personal use.

---

Generated with [AI App Builder](https://ai-app-builder.com) on ${new Date().toISOString().split('T')[0]}
`;
}

function generatePackageJson(project: { name: string; description: string | null; framework: string | null }): string {
  const name = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const framework = project.framework?.toLowerCase() || 'unknown';

  // Base package.json
  const pkg: Record<string, unknown> = {
    name,
    version: '1.0.0',
    description: project.description || `${project.name} - Generated with AI App Builder`,
    private: true,
    scripts: {},
    dependencies: {},
    devDependencies: {},
  };

  // Add framework-specific configurations
  if (framework.includes('next')) {
    pkg.scripts = {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    };
    pkg.dependencies = {
      next: '^14.0.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    };
    pkg.devDependencies = {
      typescript: '^5.0.0',
      '@types/node': '^20.0.0',
      '@types/react': '^18.0.0',
    };
  } else if (framework.includes('react') || framework.includes('vite')) {
    pkg.scripts = {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    };
    pkg.dependencies = {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    };
    pkg.devDependencies = {
      vite: '^5.0.0',
      '@vitejs/plugin-react': '^4.0.0',
      typescript: '^5.0.0',
    };
  } else if (framework.includes('express') || framework.includes('node')) {
    pkg.scripts = {
      start: 'node index.js',
      dev: 'nodemon index.js',
    };
    pkg.dependencies = {
      express: '^4.18.0',
    };
    pkg.devDependencies = {
      nodemon: '^3.0.0',
    };
  } else {
    pkg.scripts = {
      start: 'node index.js',
    };
  }

  return JSON.stringify(pkg, null, 2);
}
