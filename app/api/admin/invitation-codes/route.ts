import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAMES = (process.env.ADMIN_USERNAMES || '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

async function getAdminUser() {
  if (!JWT_SECRET) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; tokenVersion?: number };
    if (!ADMIN_USERNAMES.includes(decoded.username)) {
      // Allow fallback if decoded.username is not in list but user in DB is
      const adminUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { username: true }
      });
      if (!adminUser || !ADMIN_USERNAMES.includes(adminUser.username)) {
          return null;
      }
      return decoded;
    }
    
    if (typeof decoded.tokenVersion !== 'number') return null;
    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { username: true, tokenVersion: true }
    });
    if (!adminUser) return null;
    if (adminUser.username !== decoded.username) return null;
    if (adminUser.tokenVersion !== decoded.tokenVersion) return null;
    return decoded;
  } catch {
    return null;
  }
}

function generateCode(prefix: string) {
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${random}`;
}

export async function GET() {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const codes = await prisma.invitationCode.findMany({
    select: {
      id: true,
      code: true,
      isUsed: true,
      createdAt: true,
      usedBy: {
        select: {
          username: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    data: codes.map((code) => ({
      id: code.id,
      code: code.code,
      isUsed: code.isUsed,
      createdAt: code.createdAt,
      usedBy: code.usedBy?.username || null
    }))
  });
}

export async function POST(request: Request) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { count = 1, prefix = 'INV' } = await request.json();
  const safeCount = Math.min(Math.max(Number(count) || 1, 1), 50);
  const safePrefix = String(prefix || 'INV').trim().toUpperCase();

  const created: string[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    let attempts = 0;
    while (attempts < 5) {
      const code = generateCode(safePrefix);
      try {
        await prisma.invitationCode.create({ data: { code } });
        created.push(code);
        break;
      } catch {
        attempts += 1;
      }
    }
  }

  return NextResponse.json({ data: created });
}
