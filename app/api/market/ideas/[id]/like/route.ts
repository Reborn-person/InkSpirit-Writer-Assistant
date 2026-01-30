import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idea = await prisma.marketIdea.findUnique({
      where: { id: params.id }
    });

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const updatedIdea = await prisma.marketIdea.update({
      where: { id: params.id },
      data: { likeCount: idea.likeCount + 1 }
    });

    return NextResponse.json({ data: updatedIdea });
  } catch (error) {
    console.error('Market idea like error:', error);
    return NextResponse.json({ error: 'Failed to like idea' }, { status: 500 });
  }
}
