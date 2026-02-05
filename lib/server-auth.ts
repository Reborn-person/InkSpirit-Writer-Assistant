import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET;

export async function getUserFromSession() {
    if (!JWT_SECRET) return null;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; tokenVersion?: number };
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, tokenVersion: true }
        });
        
        if (!user || (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion)) {
            return null;
        }
        return user;
    } catch {
        return null;
    }
}
