import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { UserLevel } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET() {
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
      select: { 
        id: true, 
        username: true, 
        level: true, 
        membershipExpiresAt: true, 
        tokenVersion: true,
        quota: {
            select: {
                dailyTokensUsed: true,
                dailyTokenLimit: true,
                totalTokensUsed: true
            }
        }
      }
    });

    if (!user || typeof decoded.tokenVersion !== 'number' || user.tokenVersion !== decoded.tokenVersion) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('token');
      if (process.env.NODE_ENV === 'production') {
        response.cookies.set('token', '', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 0,
          path: '/',
          domain: '.inkspirit.top',
        });
      }
      return response;
    }

    const now = new Date();
    const downgradeLevel = (level: UserLevel): UserLevel => {
      if (level === 'PROMAX') return 'MAX';
      if (level === 'MAX') return 'PRO_PLUS';
      if (level === 'PRO_PLUS') return 'PRO';
      return 'PRO';
    };

    if (user.membershipExpiresAt && now.getTime() > user.membershipExpiresAt.getTime() && user.level !== 'PRO') {
      const nextLevel = downgradeLevel(user.level as UserLevel);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { level: nextLevel, membershipExpiresAt: null }
      });
      return NextResponse.json({
        data: {
          id: updated.id,
          username: updated.username,
          level: updated.level,
          membershipExpiresAt: updated.membershipExpiresAt,
          quota: user.quota
        }
      });
    }

    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
