import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { Prisma, UserLevel } from '@prisma/client';

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
      // This happens if token is old or format changed, but user ID is valid
      const adminUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { username: true }
      });
      if (!adminUser || !ADMIN_USERNAMES.includes(adminUser.username)) {
          return null;
      }
      // If we are here, DB user is admin, allow access
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

export async function GET() {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      level: true,
      membershipExpiresAt: true,
      createdAt: true,
      quota: {
        select: {
          dailyTokensUsed: true,
          dailyTokenLimit: true,
          totalTokensUsed: true
        }
      },
      invitationCode: {
        select: {
          code: true
        }
      },
      _count: {
        select: {
          backups: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    data: users.map((user) => ({
      id: user.id,
      username: user.username,
      level: user.level,
      membershipExpiresAt: user.membershipExpiresAt,
      quota: user.quota || { dailyTokensUsed: 0, dailyTokenLimit: 0, totalTokensUsed: 0 },
      createdAt: user.createdAt,
      inviteCode: user.invitationCode?.code || null,
      backupCount: user._count.backups
    }))
  });
}

export async function PUT(request: Request) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, level, username, membershipDuration, quota } = await request.json();
  const allowedLevels: UserLevel[] = ['PRO', 'PRO_PLUS', 'MAX', 'PROMAX'];

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const data: any = {};

  if (typeof level !== 'undefined') {
    if (!allowedLevels.includes(level)) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }
    data.level = level as UserLevel;
    if (level === 'PRO') {
      data.membershipExpiresAt = null;
    }
  }

  if (typeof username !== 'undefined') {
    const nextUsername = String(username || '').trim();
    if (!nextUsername) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    if (ADMIN_USERNAMES.includes(nextUsername)) {
      return NextResponse.json({ error: 'Reserved username' }, { status: 400 });
    }
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });
    if (current?.username && ADMIN_USERNAMES.includes(current.username)) {
      return NextResponse.json({ error: 'Admin username cannot be changed' }, { status: 403 });
    }
    if (current?.username && current.username !== nextUsername) {
      data.tokenVersion = { increment: 1 };
    }
    data.username = nextUsername;
  }

  if (typeof membershipDuration !== 'undefined') {
    const now = new Date();
    const d = String(membershipDuration);
    
    let baseDate = now;
    if (d !== 'clear') {
       const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { membershipExpiresAt: true }
       });
       if (currentUser?.membershipExpiresAt && currentUser.membershipExpiresAt > now) {
          baseDate = currentUser.membershipExpiresAt;
       }
    }

    if (d === 'clear') {
      data.membershipExpiresAt = null;
    } else if (d === 'month') {
      data.membershipExpiresAt = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, baseDate.getDate());
    } else if (d === 'quarter') {
      data.membershipExpiresAt = new Date(baseDate.getFullYear(), baseDate.getMonth() + 3, baseDate.getDate());
    } else if (d === 'year') {
      data.membershipExpiresAt = new Date(baseDate.getFullYear() + 1, baseDate.getMonth(), baseDate.getDate());
    } else if (d === 'millionYears') {
      data.membershipExpiresAt = new Date('9999-12-31T00:00:00.000Z');
    } else {
      return NextResponse.json({ error: 'Invalid membershipDuration' }, { status: 400 });
    }
  }

  // Handle quota updates
  if (quota && typeof quota === 'object') {
      const quotaUpdate: any = {};
      if (typeof quota.dailyTokensUsed === 'number') quotaUpdate.dailyTokensUsed = quota.dailyTokensUsed;
      if (typeof quota.dailyTokenLimit === 'number') quotaUpdate.dailyTokenLimit = quota.dailyTokenLimit;
      if (typeof quota.totalTokensUsed === 'number') quotaUpdate.totalTokensUsed = quota.totalTokensUsed;
      
      if (Object.keys(quotaUpdate).length > 0) {
          await prisma.userQuota.upsert({
              where: { userId },
              create: { 
                  userId,
                  ...quotaUpdate 
              },
              update: quotaUpdate
          });
      }
  }

  if (Object.keys(data).length === 0 && !quota) {
    // Return early if nothing to update
  }

  try {
    // Return full updated user
    // Perform update if there are fields to update
    let updated;
    if (Object.keys(data).length > 0) {
        updated = await prisma.user.update({
            where: { id: userId },
            data,
            include: { 
                quota: {
                    select: {
                        dailyTokensUsed: true,
                        dailyTokenLimit: true,
                        totalTokensUsed: true
                    }
                }
            }
        });
    } else {
        // Just fetch
        updated = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                quota: {
                    select: {
                        dailyTokensUsed: true,
                        dailyTokenLimit: true,
                        totalTokensUsed: true
                    }
                }
            }
        });
    }

    if (!updated) return NextResponse.json({ error: 'Failed to fetch updated user' }, { status: 500 });

    return NextResponse.json({
      data: {
        id: updated.id,
        username: updated.username,
        level: updated.level,
        membershipExpiresAt: updated.membershipExpiresAt,
        quota: updated.quota || { dailyTokensUsed: 0, dailyTokenLimit: 0, totalTokensUsed: 0 }
      }
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  if (userId === admin.userId) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 403 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true }
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (ADMIN_USERNAMES.includes(target.username)) {
    return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.projectBackup.deleteMany({ where: { userId } });
      await tx.userSettings.deleteMany({ where: { userId } });
      await tx.marketPrompt.updateMany({
        where: { uploaderId: userId },
        data: { uploaderId: null }
      });
      await tx.invitationCode.updateMany({
        where: { usedById: userId },
        data: { usedById: null }
      });
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ data: { id: target.id, username: target.username } });
  } catch {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
