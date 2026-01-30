import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const count = await prisma.invitationCode.count();
    if (count === 0) {
      return NextResponse.json({ message: 'No default invite code will be created.' });
    }
    return NextResponse.json({ message: 'Already initialized.' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
