import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { ProjectBackup } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;
const MAX_BACKUP_BYTES = Number(process.env.MAX_BACKUP_BYTES || 104857600);
const MAX_BACKUP_VERSIONS = 3;

async function getUser() {
  if (!JWT_SECRET) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; tokenVersion?: number };
    if (typeof decoded.tokenVersion !== 'number') return null;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tokenVersion: true }
    });
    if (!user || user.tokenVersion !== decoded.tokenVersion) return null;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

  const userId = await getUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backups = await prisma.projectBackup.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: MAX_BACKUP_VERSIONS,
  });

  const latest = backups[0];

  if (!latest) {
    return NextResponse.json({ message: 'No backup found' });
  }

  return NextResponse.json({
    data: latest.data,
    updatedAt: latest.updatedAt,
    backups: (backups as ProjectBackup[]).map((b: ProjectBackup) => ({
      id: b.id,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      sizeBytes: Buffer.byteLength(b.data || '', 'utf8')
    }))
  });
}

export async function POST(request: Request) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

  const userId = await getUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data } = await request.json();

    if (typeof data !== 'string') {
      return NextResponse.json({ error: 'Invalid backup data' }, { status: 400 });
    }

    const sizeBytes = Buffer.byteLength(data, 'utf8');
    if (Number.isFinite(MAX_BACKUP_BYTES) && sizeBytes > MAX_BACKUP_BYTES) {
      return NextResponse.json(
        { error: `Backup too large (${sizeBytes} bytes). Max allowed is ${MAX_BACKUP_BYTES} bytes.` },
        { status: 413 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectBackup.create({
        data: {
          userId,
          data
        }
      });

      const backups = await tx.projectBackup.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
        skip: MAX_BACKUP_VERSIONS
      });

      if (backups.length > 0) {
        await tx.projectBackup.deleteMany({
          where: { id: { in: backups.map((b) => b.id) } }
        });
      }
    });

    return NextResponse.json({ message: 'Backup saved successfully' });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
