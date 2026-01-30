import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 1. 获取 token
  const token = request.cookies.get('token')?.value;
  
  // 2. 定义公开路由（不需要登录即可访问）
  const publicPaths = [
    '/login', 
    '/api/auth/login', 
    '/api/auth/register',
    '/_not-found',
    '/_global-error',
    '/_next', 
    '/favicon.ico'
  ];
  
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

  // 3. 如果是公开路由，直接放行
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 4. 如果没有 token，重定向到登录页
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 5. 有 token，放行
  return NextResponse.next();
}

// 匹配所有路由，排除静态资源
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|_not-found|_global-error).*)'],
};
