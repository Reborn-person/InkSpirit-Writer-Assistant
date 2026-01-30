import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { consistencyService } from '@/lib/consistency';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req: NextRequest) {
    try {
        // 身份验证
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token || !JWT_SECRET) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        try {
            jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return NextResponse.json({ error: '登录失效' }, { status: 401 });
        }

        // 解析请求参数
        const body = await req.json();
        const { scope, characterIds, chapterRange, skipCache } = body;

        // 执行一致性检查
        const report = await consistencyService.runCheck({
            scope,
            characterIds,
            chapterRange,
            skipCache
        });

        return NextResponse.json(report);

    } catch (error: any) {
        console.error('一致性检查错误:', error);
        return NextResponse.json(
            { error: error.message || '检查失败' },
            { status: 500 }
        );
    }
}

// GET 获取缓存的报告
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token || !JWT_SECRET) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        try {
            jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return NextResponse.json({ error: '登录失效' }, { status: 401 });
        }

        const cachedReport = await consistencyService.getCachedReport();

        if (!cachedReport) {
            return NextResponse.json({ error: '无缓存报告' }, { status: 404 });
        }

        return NextResponse.json(cachedReport);

    } catch (error: any) {
        console.error('获取缓存报告错误:', error);
        return NextResponse.json(
            { error: error.message || '获取失败' },
            { status: 500 }
        );
    }
}
