import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;

function getSecretKey() {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY || JWT_SECRET;
  if (!secret) return null;
  return createHash('sha256').update(secret).digest();
}

function encryptJson(value: unknown) {
  const key = getSecretKey();
  if (!key) throw new Error('SETTINGS_ENCRYPTION_KEY is missing');

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decryptJson(payload: string) {
  const key = getSecretKey();
  if (!key) throw new Error('SETTINGS_ENCRYPTION_KEY is missing');

  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid encrypted payload');

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

async function getUserId() {
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

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = await prisma.userSettings.findUnique({ where: { userId } });
  if (!row) {
    return NextResponse.json({ data: null });
  }

  try {
    const settings = decryptJson(row.dataEnc);
    return NextResponse.json({ data: settings });
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!JWT_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET is missing' }, { status: 500 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const settings = body?.settings;
  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
  }

  let dataEnc: string;
  try {
    dataEnc = encryptJson(settings);
  } catch {
    return NextResponse.json({ error: 'Server misconfigured: SETTINGS_ENCRYPTION_KEY is missing' }, { status: 500 });
  }

  const updated = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, dataEnc },
    update: { dataEnc }
  });

  return NextResponse.json({ data: { updatedAt: updated.updatedAt } });
}
