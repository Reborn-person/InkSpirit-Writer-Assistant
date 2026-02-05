import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/server-auth';

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, title } = await req.json();
    
    if (!id || !title) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const novel = await prisma.novel.upsert({
      where: { id },
      update: { title, updatedAt: new Date() },
      create: {
        id,
        title,
        userId: user.id,
      }
    });
    
    return NextResponse.json({ data: novel });
  } catch (e) {
    console.error('Failed to save novel:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
