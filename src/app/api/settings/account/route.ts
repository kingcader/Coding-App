import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user and all related data (cascade delete handles most)
    // Order matters for some relations
    await prisma.$transaction(async (tx) => {
      // Delete all user's projects (files, generations, messages cascade)
      await tx.project.deleteMany({
        where: { userId: session.user.id },
      });

      // Delete subscription
      await tx.subscription.deleteMany({
        where: { userId: session.user.id },
      });

      // Delete usage records
      await tx.usageRecord.deleteMany({
        where: { userId: session.user.id },
      });

      // Delete sessions
      await tx.session.deleteMany({
        where: { userId: session.user.id },
      });

      // Delete accounts (OAuth connections)
      await tx.account.deleteMany({
        where: { userId: session.user.id },
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: session.user.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
