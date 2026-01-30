import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const { username, password, inviteCode } = await request.json();
    const adminUsernames = (process.env.ADMIN_USERNAMES || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const adminInviteCode = process.env.ADMIN_INVITE_CODE || '';

    if (!username || !password || !inviteCode) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (adminUsernames.includes(username)) {
      if (!adminInviteCode || inviteCode !== adminInviteCode) {
        return NextResponse.json({ error: 'Admin registration not allowed' }, { status: 403 });
      }
    }

    // Universal Invite Code Logic
    const isUniversalCode = false;
    let codeRecord = null;

    if (!isUniversalCode) {
        // Verify Invite Code from DB
        codeRecord = await prisma.invitationCode.findUnique({
        where: { code: inviteCode },
        });

        if (!codeRecord) {
        return NextResponse.json({ error: 'Invalid invitation code' }, { status: 400 });
        }

        if (codeRecord.isUsed) {
        return NextResponse.json({ error: 'Invitation code already used' }, { status: 400 });
        }
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    if (isUniversalCode) {
        // Simple creation for universal code
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            }
        });
        return NextResponse.json({ message: 'User created successfully', userId: user.id });
    } else {
        // Transaction for one-time code
        const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const newUser = await tx.user.create({
            data: {
            username,
            password: hashedPassword,
            },
        });

        if (codeRecord) {
            await tx.invitationCode.update({
                where: { id: codeRecord.id },
                data: {
                isUsed: true,
                usedById: newUser.id,
                },
            });
        }

        return newUser;
        });
        return NextResponse.json({ message: 'User created successfully', userId: user.id });
    }

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
