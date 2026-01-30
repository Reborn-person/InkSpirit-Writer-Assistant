import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseTags(tagsStr: string): string[] {
  if (!tagsStr) return [];
  try {
    return JSON.parse(tagsStr);
  } catch {
    return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  }
}

export async function GET(request: Request) {
  try {
    await prisma.$connect();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const ideas = await prisma.marketIdea.findMany({
      where: {
        OR: [
          { title: { contains: search } },
          { hook: { contains: search } },
          { summary: { contains: search } },
          { tags: { contains: search } },
          { uploaderName: { contains: search } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    const parsedIdeas = ideas.map(idea => ({
      ...idea,
      tags: parseTags(idea.tags)
    }));

    return NextResponse.json({ data: parsedIdeas });
  } catch (error) {
    console.error('Market ideas fetch error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to fetch ideas', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    await prisma.$connect();
    
    const body = await request.json();
    const { title, hook, summary, tags, uploaderName, uploaderId } = body;

    if (!title || !hook || !summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : tags || '[]';

    const idea = await prisma.marketIdea.create({
      data: {
        title,
        hook,
        summary,
        tags: tagsStr,
        uploaderName: uploaderName || '匿名',
        uploaderId
      }
    });

    return NextResponse.json({ data: idea });
  } catch (error) {
    console.error('Market idea create error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Failed to create idea', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
