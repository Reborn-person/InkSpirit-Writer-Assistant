const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  
  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      console.log(`用户 "${username}" 已存在，正在更新密码...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { username },
        data: { 
          password: hashedPassword,
          level: 'PROMAX' // 设置为最高权限
        },
      });
      console.log(`✅ 用户 "${username}" 密码已更新！`);
    } else {
      // 创建新用户
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          level: 'PROMAX', // 设置为最高权限
        },
      });
      console.log(`✅ 管理员账户创建成功！`);
      console.log(`   用户名: ${username}`);
      console.log(`   密码: ${password}`);
      console.log(`   权限: PROMAX`);
      console.log(`   ID: ${user.id}`);
    }
  } catch (error) {
    console.error('创建失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
