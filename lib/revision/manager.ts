// 文章修订管理器

import { Revision, RevisionBatch, RevisionStatus, RevisionType, DiffSegment } from './types';

export class RevisionManager {
  private revisions: Map<string, Revision> = new Map();
  private batches: RevisionBatch[] = [];
  private content: string = '';

  constructor(initialContent: string = '') {
    this.content = initialContent;
  }

  // 设置初始内容
  setContent(content: string): void {
    this.content = content;
  }

  // 获取当前内容
  getContent(): string {
    return this.content;
  }

  // 添加修订建议
  addRevision(revision: Omit<Revision, 'id' | 'timestamp' | 'status'>): Revision {
    const newRevision: Revision = {
      ...revision,
      id: `rev_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
      status: 'suggested',
    };
    
    this.revisions.set(newRevision.id, newRevision);
    return newRevision;
  }

  // 批量添加修订
  addBatch(revisions: Omit<Revision, 'id' | 'timestamp' | 'status'>[], userPrompt: string): RevisionBatch {
    const batch: RevisionBatch = {
      id: `batch_${Date.now()}`,
      revisions: [],
      timestamp: Date.now(),
      userPrompt,
    };

    for (const rev of revisions) {
      const newRev = this.addRevision(rev);
      batch.revisions.push(newRev);
    }

    this.batches.push(batch);
    return batch;
  }

  // 接受修订
  acceptRevision(revisionId: string): boolean {
    const revision = this.revisions.get(revisionId);
    if (!revision || revision.status !== 'suggested') return false;

    revision.status = 'accepted';
    
    // 应用修改到内容
    this.applyRevision(revision);
    
    return true;
  }

  // 拒绝修订
  rejectRevision(revisionId: string): boolean {
    const revision = this.revisions.get(revisionId);
    if (!revision || revision.status !== 'suggested') return false;

    revision.status = 'rejected';
    return true;
  }

  // 修改修订（用户自定义修改）
  modifyRevision(revisionId: string, finalText: string): boolean {
    const revision = this.revisions.get(revisionId);
    if (!revision || revision.status !== 'suggested') return false;

    revision.status = 'modified';
    revision.finalText = finalText;
    
    // 应用修改到内容
    this.applyRevision({ ...revision, suggestedText: finalText });
    
    return true;
  }

  // 应用修订到内容
  private applyRevision(revision: Revision): void {
    const before = this.content.slice(0, revision.startIndex);
    const after = this.content.slice(revision.endIndex);
    const textToApply = revision.finalText || revision.suggestedText;
    
    this.content = before + textToApply + after;
    
    // 更新后续修订的位置
    const lengthDiff = textToApply.length - revision.originalText.length;
    this.updateSubsequentPositions(revision.id, lengthDiff);
  }

  // 更新后续修订的位置
  private updateSubsequentPositions(appliedRevisionId: string, lengthDiff: number): void {
    const appliedRev = this.revisions.get(appliedRevisionId);
    if (!appliedRev) return;

    for (const [id, rev] of this.revisions) {
      if (id !== appliedRevisionId && rev.status === 'suggested') {
        if (rev.startIndex > appliedRev.startIndex) {
          rev.startIndex += lengthDiff;
          rev.endIndex += lengthDiff;
        }
      }
    }
  }

  // 获取所有修订
  getAllRevisions(): Revision[] {
    return Array.from(this.revisions.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  // 获取待处理的修订
  getPendingRevisions(): Revision[] {
    return this.getAllRevisions().filter(r => r.status === 'suggested');
  }

  // 获取已接受的修订
  getAcceptedRevisions(): Revision[] {
    return this.getAllRevisions().filter(r => r.status === 'accepted' || r.status === 'modified');
  }

  // 获取特定批次的修订
  getBatchRevisions(batchId: string): Revision[] {
    const batch = this.batches.find(b => b.id === batchId);
    return batch?.revisions || [];
  }

  // 计算文本差异
  calculateDiff(original: string, modified: string): DiffSegment[] {
    const segments: DiffSegment[] = [];
    
    // 简单的行级差异计算
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    let i = 0, j = 0;
    
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i >= originalLines.length) {
        // 新增行
        segments.push({ type: 'added', text: modifiedLines[j] + '\n' });
        j++;
      } else if (j >= modifiedLines.length) {
        // 删除行
        segments.push({ type: 'deleted', text: originalLines[i] + '\n' });
        i++;
      } else if (originalLines[i] === modifiedLines[j]) {
        // 未改变
        segments.push({ type: 'unchanged', text: originalLines[i] + '\n' });
        i++;
        j++;
      } else {
        // 修改行
        segments.push({ type: 'deleted', text: originalLines[i] + '\n' });
        segments.push({ type: 'added', text: modifiedLines[j] + '\n' });
        i++;
        j++;
      }
    }
    
    return segments;
  }

  // 获取修订统计
  getStats() {
    const all = this.getAllRevisions();
    return {
      totalRevisions: all.length,
      accepted: all.filter(r => r.status === 'accepted').length,
      rejected: all.filter(r => r.status === 'rejected').length,
      modified: all.filter(r => r.status === 'modified').length,
      pending: all.filter(r => r.status === 'suggested').length,
      byType: all.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<RevisionType, number>),
    };
  }

  // 撤销所有待处理的修订
  clearPendingRevisions(): void {
    for (const [id, rev] of this.revisions) {
      if (rev.status === 'suggested') {
        this.revisions.delete(id);
      }
    }
  }

  // 导出修订历史
  exportHistory(): RevisionBatch[] {
    return this.batches.map(batch => ({
      ...batch,
      revisions: batch.revisions.map(r => ({ ...r })),
    }));
  }

  // 获取指定位置的修订
  getRevisionsAtPosition(index: number): Revision[] {
    return this.getAllRevisions().filter(
      r => r.startIndex <= index && r.endIndex >= index
    );
  }
}
