/**
 * Module12 云端同步工具
 * 处理作品和文档的云端同步
 */

// 本地类型定义（与组件中保持一致）
export interface Book {
  id: string;
  title: string;
  summary?: string;
  category: string;
  visibility: "public" | "private";
  status: "ongoing" | "completed";
  cover?: string;
  createdAt: number;
  updatedAt: number;
  documents: Document[];
  activeFileId?: string | null;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface SyncResult {
  success: boolean;
  book?: any;
  syncedAt?: string;
  error?: string;
}

export interface CloudBook {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  visibility: string;
  status: string;
  cover: string | null;
  documents: CloudDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface CloudDocument {
  id: string;
  name: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 同步作品到云端
 */
export async function syncBookToCloud(
  book: Book,
  documents: Document[]
): Promise<SyncResult> {
  try {
    const response = await fetch("/api/module12/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: book.id,
        title: book.title,
        summary: book.summary,
        category: book.category,
        visibility: book.visibility,
        status: book.status,
        cover: book.cover,
        documents: documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          content: doc.content,
          order: doc.order,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "同步失败");
    }

    const data = await response.json();

    // 更新本地同步时间戳
    localStorage.setItem(
      `module12_sync_${book.id}`,
      JSON.stringify({
        syncedAt: data.syncedAt,
        version: Date.now(),
      })
    );

    return {
      success: true,
      book: data.book,
      syncedAt: data.syncedAt,
    };
  } catch (error) {
    console.error("同步到云端失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "同步失败",
    };
  }
}

/**
 * 从云端获取作品列表
 */
export async function fetchCloudBooks(): Promise<CloudBook[]> {
  try {
    const response = await fetch("/api/module12/sync");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "获取失败");
    }

    return await response.json();
  } catch (error) {
    console.error("获取云端作品失败:", error);
    return [];
  }
}

/**
 * 从云端获取单个作品
 */
export async function fetchCloudBook(bookId: string): Promise<CloudBook | null> {
  try {
    const response = await fetch(`/api/module12/sync?bookId=${bookId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "获取失败");
    }

    return await response.json();
  } catch (error) {
    console.error("获取云端作品失败:", error);
    return null;
  }
}

/**
 * 删除云端作品
 */
export async function deleteCloudBook(bookId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/module12/sync?bookId=${bookId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "删除失败");
    }

    // 清除本地同步记录
    localStorage.removeItem(`module12_sync_${bookId}`);

    return true;
  } catch (error) {
    console.error("删除云端作品失败:", error);
    return false;
  }
}

/**
 * 获取同步历史
 */
export async function fetchSyncHistory(bookId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/module12/sync/history?bookId=${bookId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "获取失败");
    }

    return await response.json();
  } catch (error) {
    console.error("获取同步历史失败:", error);
    return [];
  }
}

/**
 * 检查作品是否需要同步
 */
export function needsSync(bookId: string, localUpdatedAt: number): boolean {
  const syncData = localStorage.getItem(`module12_sync_${bookId}`);

  if (!syncData) {
    return true; // 从未同步过
  }

  try {
    const { syncedAt } = JSON.parse(syncData);
    const syncedTime = new Date(syncedAt).getTime();
    return localUpdatedAt > syncedTime;
  } catch {
    return true;
  }
}

/**
 * 自动同步所有本地作品
 */
export async function autoSyncAll(
  getAllBooks: () => { book: Book; documents: Document[] }[]
): Promise<{ success: number; failed: number }> {
  const books = getAllBooks();
  let success = 0;
  let failed = 0;

  for (const { book, documents } of books) {
    const result = await syncBookToCloud(book, documents);
    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 从云端恢复作品到本地
 */
export function restoreBookToLocal(cloudBook: CloudBook): {
  book: Book;
  documents: Document[];
} {
  const book: Book = {
    id: cloudBook.id,
    title: cloudBook.title,
    summary: cloudBook.summary || undefined,
    category: cloudBook.category,
    visibility: cloudBook.visibility as "public" | "private",
    status: cloudBook.status as "ongoing" | "completed",
    cover: cloudBook.cover || undefined,
    createdAt: new Date(cloudBook.createdAt).getTime(),
    updatedAt: new Date(cloudBook.updatedAt).getTime(),
  };

  const documents: Document[] = cloudBook.documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    content: doc.content,
    order: doc.order,
    createdAt: new Date(doc.createdAt).getTime(),
    updatedAt: new Date(doc.updatedAt).getTime(),
  }));

  return { book, documents };
}
