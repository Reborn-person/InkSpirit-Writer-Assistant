import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/server-auth';

export async function POST(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, title, content, summary, novelId, status, order } = await req.json();

    if (!id || !novelId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check ownership
    const novel = await prisma.novel.findUnique({
        where: { id: novelId },
        select: { userId: true }
    });

    if (novel && novel.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const chapter = await prisma.chapter.upsert({
        where: { id },
        update: { 
            title, 
            content, 
            summary, 
            status, 
            updatedAt: new Date() 
        },
        create: {
            id,
            title,
            content: content || '',
            summary,
            novelId,
            status: status || 'draft',
            order: order || 0
        }
    });
    
    return NextResponse.json({ data: chapter });
  } catch (e) {
    console.error('Failed to save chapter:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
