import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  
  if (!username || !password) {
    console.error('Usage: npx tsx scripts/create-admin.ts <username> <password>');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        password: hashedPassword,
        level: 'PROMAX',
        membershipExpiresAt: new Date('2099-12-31'),
      },
      create: {
        username,
        password: hashedPassword,
        level: 'PROMAX',
        membershipExpiresAt: new Date('2099-12-31'),
      },
    });

    console.log(`Admin user '${user.username}' created/updated successfully.`);
    console.log(`Password set to: ${password}`);
    
    // Check if username is in ADMIN_USERNAMES
    const envAdminUsernames = (process.env.ADMIN_USERNAMES || '').split(',').map(u => u.trim());
    if (!envAdminUsernames.includes(username)) {
        console.warn(`\nWARNING: '${username}' is NOT in ADMIN_USERNAMES env var.`);
        console.warn(`Please update your .env file:`);
        console.warn(`ADMIN_USERNAMES="${[...envAdminUsernames, username].filter(Boolean).join(',')}"`);
    }

  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
