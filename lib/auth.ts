// 认证模块统一入口
// 用于 Next.js API 路由和服务器组件

import { getUserFromSession } from './server-auth';

/**
 * 获取当前会话信息
 * 用于 API 路由中验证用户身份
 */
export async function auth() {
    const user = await getUserFromSession();
    if (!user) return null;
    
    return {
        user: {
            id: user.id,
        }
    };
}

/**
 * 验证用户是否已登录
 * 用于 API 路由中快速检查
 */
export async function requireAuth() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('未登录');
    }
    return session;
}
