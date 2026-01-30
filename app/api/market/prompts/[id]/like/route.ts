import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  try {
    const updated = await prisma.marketPrompt.update({
      where: { id },
      data: { likeCount: { increment: 1 } }
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to like prompt' }, { status: 500 });
  }
}
