import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const card = await prisma.marketCard.update({
      where: { id },
      data: {
        likeCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json({ data: card });
  } catch (error) {
    console.error('Market like error:', error);
    return NextResponse.json({ error: 'Failed to like card' }, { status: 500 });
  }
}
