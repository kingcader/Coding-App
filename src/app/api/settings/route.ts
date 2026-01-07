import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Simple encryption for API keys (in production, use proper encryption)
function encryptKey(key: string): string {
  // Base64 encode with a simple prefix - in production use proper encryption
  return `enc:${Buffer.from(key).toString('base64')}`;
}

function decryptKey(encrypted: string): string {
  if (!encrypted.startsWith('enc:')) return encrypted;
  return Buffer.from(encrypted.slice(4), 'base64').toString('utf8');
}

function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  const decrypted = decryptKey(key);
  // Show first 7 chars and mask the rest
  if (decrypted.length <= 10) return '••••••••';
  return decrypted.slice(0, 7) + '••••••••••••••••';
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        preferredProvider: true,
        claudeApiKey: true,
        openaiApiKey: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      image: user.image,
      preferredProvider: user.preferredProvider,
      // Return masked keys - never return actual keys
      claudeApiKey: user.claudeApiKey ? maskApiKey(user.claudeApiKey) : null,
      openaiApiKey: user.openaiApiKey ? maskApiKey(user.openaiApiKey) : null,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, preferredProvider, claudeApiKey, openaiApiKey } = body;

    // Build update object
    const updateData: Record<string, any> = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (preferredProvider !== undefined) {
      if (!['CLAUDE', 'OPENAI'].includes(preferredProvider)) {
        return NextResponse.json(
          { error: 'Invalid provider' },
          { status: 400 }
        );
      }
      updateData.preferredProvider = preferredProvider;
    }

    // Handle API key updates
    if (claudeApiKey !== undefined) {
      if (claudeApiKey === null) {
        updateData.claudeApiKey = null;
      } else if (claudeApiKey && !claudeApiKey.startsWith('sk-ant-')) {
        return NextResponse.json(
          { error: 'Invalid Claude API key format' },
          { status: 400 }
        );
      } else if (claudeApiKey) {
        updateData.claudeApiKey = encryptKey(claudeApiKey);
      }
    }

    if (openaiApiKey !== undefined) {
      if (openaiApiKey === null) {
        updateData.openaiApiKey = null;
      } else if (openaiApiKey && !openaiApiKey.startsWith('sk-')) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key format' },
          { status: 400 }
        );
      } else if (openaiApiKey) {
        updateData.openaiApiKey = encryptKey(openaiApiKey);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
