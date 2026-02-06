import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// 获取作品的同步历史
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!bookId) {
      return NextResponse.json({ error: "缺少作品ID" }, { status: 400 });
    }

    // 验证所有权
    const book = await prisma.module12Book.findFirst({
      where: { id: bookId, userId: session.user.id },
    });

    if (!book) {
      return NextResponse.json({ error: "作品不存在或无权限" }, { status: 404 });
    }

    const history = await prisma.module12SyncHistory.findMany({
      where: { bookId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("获取同步历史失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
