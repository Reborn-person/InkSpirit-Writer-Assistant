import { prisma } from '@/lib/prisma';

export const QUOTA_LIMITS: Record<string, number> = {
  PRO: 100000,
  PRO_PLUS: 500000,
  MAX: 2000000,
  PROMAX: -1, 
};

export async function checkQuota(userId: string, userLevel: string) {
  if (userLevel === 'PROMAX') return { ok: true };

  const now = new Date();
  let quota = await prisma.userQuota.findUnique({ where: { userId } });

  if (!quota) {
    quota = await prisma.userQuota.create({
      data: {
        userId,
        dailyTokenLimit: QUOTA_LIMITS[userLevel] || 100000,
        lastResetDate: now,
      }
    });
  } else {
    // Check reset
    const lastReset = new Date(quota.lastResetDate);
    if (lastReset.getDate() !== now.getDate() || lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
        quota = await prisma.userQuota.update({
            where: { userId },
            data: {
                dailyTokensUsed: 0,
                dailyTokenLimit: QUOTA_LIMITS[userLevel] || 100000,
                lastResetDate: now,
            }
        });
    }
  }

  if (quota.dailyTokensUsed >= quota.dailyTokenLimit) {
      return { 
          ok: false, 
          message: `今日额度已用完 (${quota.dailyTokensUsed}/${quota.dailyTokenLimit})。请升级 PROMAX 获取无限额度。` 
      };
  }

  return { ok: true, quota };
}

export async function deductQuota(userId: string, userLevel: string, tokens: number) {
  if (userLevel === 'PROMAX' || tokens <= 0) return;
  
  await prisma.userQuota.update({
      where: { userId },
      data: { 
          dailyTokensUsed: { increment: tokens },
          totalTokensUsed: { increment: tokens }
      }
  });
}
