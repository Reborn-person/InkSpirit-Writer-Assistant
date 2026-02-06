import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// 获取用户的所有Module12作品
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (bookId) {
      // 获取特定作品详情
      const book = await prisma.module12Book.findFirst({
        where: { id: bookId, userId: session.user.id },
        include: {
          documents: { orderBy: { order: "asc" } },
        },
      });

      if (!book) {
        return NextResponse.json({ error: "作品不存在" }, { status: 404 });
      }

      return NextResponse.json(book);
    }

    // 获取所有作品列表
    const books = await prisma.module12Book.findMany({
      where: { userId: session.user.id },
      include: {
        documents: {
          select: { id: true, name: true, order: true, updatedAt: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error("获取Module12作品失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 创建或更新作品
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, summary, category, visibility, status, cover, documents } = body;

    if (!id || !title) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 使用upsert创建或更新作品
    const book = await prisma.module12Book.upsert({
      where: { id },
      update: {
        title,
        summary: summary || null,
        category: category || "小说",
        visibility: visibility || "私密",
        status: status || "连载中",
        cover: cover || null,
      },
      create: {
        id,
        title,
        summary: summary || null,
        category: category || "小说",
        visibility: visibility || "私密",
        status: status || "连载中",
        cover: cover || null,
        userId: session.user.id,
      },
      include: { documents: true },
    });

    // 同步文档
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        await prisma.module12Document.upsert({
          where: { id: doc.id },
          update: {
            name: doc.name,
            content: doc.content || "",
            order: doc.order || 0,
          },
          create: {
            id: doc.id,
            name: doc.name,
            content: doc.content || "",
            order: doc.order || 0,
            bookId: book.id,
          },
        });
      }
    }

    // 记录同步历史
    await prisma.module12SyncHistory.create({
      data: {
        bookId: book.id,
        userId: session.user.id,
        action: "SYNC",
        deviceInfo: request.headers.get("user-agent") || "Unknown",
        ipAddress: request.headers.get("x-forwarded-for") || request.ip || "Unknown",
      },
    });

    // 返回更新后的完整数据
    const updatedBook = await prisma.module12Book.findUnique({
      where: { id: book.id },
      include: { documents: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({
      success: true,
      book: updatedBook,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("同步Module12作品失败:", error);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}

// 删除作品
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

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

    // 记录删除操作
    await prisma.module12SyncHistory.create({
      data: {
        bookId,
        userId: session.user.id,
        action: "DELETE",
        deviceInfo: request.headers.get("user-agent") || "Unknown",
        ipAddress: request.headers.get("x-forwarded-for") || request.ip || "Unknown",
      },
    });

    // 删除作品（级联删除文档）
    await prisma.module12Book.delete({
      where: { id: bookId },
    });

    return NextResponse.json({ success: true, message: "作品已删除" });
  } catch (error) {
    console.error("删除Module12作品失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
