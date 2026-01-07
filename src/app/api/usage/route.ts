import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current billing period (start of current month to end of current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get subscription to know the limit
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    const limit = subscription?.monthlyGenerationsLimit || 5;

    // Count usage for current period
    const usageCount = await prisma.usageRecord.count({
      where: {
        userId: session.user.id,
        type: 'GENERATION',
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const remaining = limit === -1 ? -1 : Math.max(0, limit - usageCount);

    return NextResponse.json({
      used: usageCount,
      limit,
      remaining,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
