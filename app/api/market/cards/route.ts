import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
  }
  return trimmed
    .split(/[,，]/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    const cards = await prisma.marketCard.findMany({
      where: {
        OR: [
          { title: { contains: search } },
          { example: { contains: search } },
          { analysis: { contains: search } },
          { tags: { contains: search } },
          { uploaderName: { contains: search } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const parsedCards = cards.map(card => ({
      ...card,
      tags: parseTags(card.tags)
    }));

    return NextResponse.json({ data: parsedCards });
  } catch (error) {
    console.error('Market fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

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
    const { title, type, example, analysis, tags } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const newCard = await prisma.marketCard.create({
      data: {
        title,
        type,
        example: example || '',
        analysis: analysis || '',
        tags: JSON.stringify(parseTags(tags)),
        uploaderName: user.username,
        uploaderId: user.id
      }
    });

    return NextResponse.json({ data: {
      ...newCard,
      tags: parseTags(newCard.tags)
    } });
  } catch (error) {
    console.error('Market create error:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
