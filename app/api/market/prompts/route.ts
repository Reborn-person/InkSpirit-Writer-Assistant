import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    const prompts = await prisma.marketPrompt.findMany({
      where: {
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
          { uploaderName: { contains: search } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ data: prompts });
  } catch (error) {
    console.error('Market fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; tokenVersion?: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, tokenVersion: true }
    });
    
    if (!user || typeof decoded.tokenVersion !== 'number' || user.tokenVersion !== decoded.tokenVersion) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, categoryId } = body;

    if (!title || !content || !categoryId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const newPrompt = await prisma.marketPrompt.create({
      data: {
        title,
        content,
        categoryId,
        uploaderName: user.username,
        uploaderId: user.id
      }
    });

    return NextResponse.json({ data: newPrompt });
  } catch (error) {
    console.error('Market create error:', error);
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
  }
}
