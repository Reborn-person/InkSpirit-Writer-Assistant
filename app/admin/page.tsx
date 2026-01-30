'use client';

import { useEffect, useState } from 'react';
import { Shield, Users, KeyRound, RefreshCw, Plus, Edit2, Check, X, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

type UserLevel = 'PRO' | 'PRO_PLUS' | 'MAX' | 'PROMAX';

type AdminUser = {
  id: string;
  username: string;
  level: UserLevel;
  membershipExpiresAt?: string | null;
  createdAt: string;
  inviteCode: string | null;
  backupCount: number;
};

type InviteCode = {
  id: string;
  code: string;
  isUsed: boolean;
  createdAt: string;
  usedBy: string | null;
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(1);
  const [prefix, setPrefix] = useState('INV');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingMembershipUserId, setUpdatingMembershipUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const levelOptions = [
    { value: 'PRO', label: 'PRO' },
    { value: 'PRO_PLUS', label: 'PRO+' },
    { value: 'MAX', label: 'MAX' },
    { value: 'PROMAX', label: 'PROMAX' }
  ];

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, codesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/invitation-codes')
      ]);

      if (!usersRes.ok || !codesRes.ok) {
        const err = await (usersRes.ok ? codesRes.json() : usersRes.json());
        throw new Error(err.error || '无权限访问');
      }

      const usersJson = await usersRes.json();
      const codesJson = await codesRes.json();
      setUsers(usersJson.data || []);
      setCodes(codesJson.data || []);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/invitation-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, prefix })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '创建失败');
      }
      setMessage(`已生成 ${data.data?.length || 0} 个邀请码`);
      await loadAll();
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleLevelChange = async (userId: string, level: UserLevel) => {
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, level })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '更新失败');
      }
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, level } : user))
      );
      setMessage('用户等级已更新');
    } catch (err: any) {
      setError(err.message || '更新失败');
    }
  };

  const startEditUsername = (user: AdminUser) => {
    setMessage('');
    setError('');
    setEditingUserId(user.id);
    setEditingUsername(user.username);
  };

  const cancelEditUsername = () => {
    setEditingUserId(null);
    setEditingUsername('');
  };

  const handleUsernameSave = async (userId: string) => {
    const next = editingUsername.trim();
    if (!next) {
      setError('用户名不能为空');
      return;
    }

    setMessage('');
    setError('');
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username: next })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '更新失败');
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, username: data?.data?.username || next } : u))
      );
      setMessage('用户名已更新');
      cancelEditUsername();
    } catch (err: any) {
      setError(err.message || '更新失败');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`确定要删除用户「${user.username}」吗？\n\n将删除：该用户的备份、云端设置等数据。\n提示词上传记录会保留但解除账号关联。\n此操作不可恢复。`)) {
      return;
    }

    setMessage('');
    setError('');
    setDeletingUserId(user.id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (editingUserId === user.id) {
        cancelEditUsername();
      }
      setMessage('账号已删除');
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = (value: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('zh-CN');
  };

  const formatExpiryDate = (value?: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('zh-CN');
  };

  const usedCount = codes.filter((code) => code.isUsed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-paper/30 text-ink">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-daiqing/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-daiqing" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">后台管理</h1>
            <p className="text-sm text-ink/60">用户与邀请码管理</p>
          </div>
          <button
            onClick={loadAll}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded-lg border border-ink/10 hover:bg-paper/60 text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="p-4 rounded-lg bg-green-50 text-green-700 text-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-ink/10 bg-white/80">
            <div className="flex items-center gap-2 text-sm text-ink/60">
              <Users className="w-4 h-4" />
              用户数
            </div>
            <div className="text-2xl font-semibold mt-2">{users.length}</div>
          </div>
          <div className="p-4 rounded-xl border border-ink/10 bg-white/80">
            <div className="flex items-center gap-2 text-sm text-ink/60">
              <KeyRound className="w-4 h-4" />
              邀请码总数
            </div>
            <div className="text-2xl font-semibold mt-2">{codes.length}</div>
          </div>
          <div className="p-4 rounded-xl border border-ink/10 bg-white/80">
            <div className="flex items-center gap-2 text-sm text-ink/60">
              <KeyRound className="w-4 h-4" />
              已使用
            </div>
            <div className="text-2xl font-semibold mt-2">{usedCount}</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-ink/10 bg-white/80 space-y-4">
          <div className="flex items-center gap-2 font-medium">
            <Plus className="w-4 h-4" />
            新建邀请码
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-ink/10 bg-white/70 text-sm"
              placeholder="数量(1-50)"
            />
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="px-3 py-2 rounded-lg border border-ink/10 bg-white/70 text-sm"
              placeholder="前缀"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-daiqing text-white text-sm hover:bg-daiqing/90 disabled:opacity-60"
            >
              {creating ? '生成中...' : '生成邀请码'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border border-ink/10 bg-white/80">
            <h2 className="text-base font-semibold mb-3">用户列表</h2>
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="p-3 rounded-lg border border-ink/10 text-sm bg-white">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {editingUserId === user.id ? (
                        <span className="flex items-center gap-2">
                          <input
                            value={editingUsername}
                            onChange={(e) => setEditingUsername(e.target.value)}
                            className="px-2 py-1 rounded border border-ink/10 bg-white text-xs w-40"
                          />
                          <button
                            onClick={() => handleUsernameSave(user.id)}
                            disabled={updatingUserId === user.id}
                            className="p-1 rounded border border-ink/10 hover:bg-paper/60 disabled:opacity-60"
                            title="保存"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditUsername}
                            disabled={updatingUserId === user.id}
                            className="p-1 rounded border border-ink/10 hover:bg-paper/60 disabled:opacity-60"
                            title="取消"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span>{user.username}</span>
                          <button
                            onClick={() => startEditUsername(user)}
                            className="p-1 rounded border border-ink/10 hover:bg-paper/60"
                            title="修改用户名"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </span>
                      )}
                    </span>
                    <span className="text-ink/50">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-ink/60 flex flex-wrap gap-4 items-center">
                    <span>邀请码：{user.inviteCode || '-'}</span>
                    <span>备份数：{user.backupCount}</span>
                    <span>到期：{formatExpiryDate(user.membershipExpiresAt || null)}</span>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      disabled={deletingUserId === user.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-ink/10 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                      title="删除账号"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </button>
                    <span className="flex items-center gap-2">
                      等级
                      <select
                        value={user.level}
                        onChange={(e) => handleLevelChange(user.id, e.target.value as UserLevel)}
                        className="px-2 py-1 rounded border border-ink/10 bg-white text-xs"
                      >
                        {levelOptions.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </span>
                    <span className="flex items-center gap-2">
                      期限
                      <select
                        defaultValue=""
                        onChange={async (e) => {
                          const v = e.target.value;
                          if (!v) return;
                          setMessage('');
                          setError('');
                          setUpdatingMembershipUserId(user.id);
                          try {
                            const res = await fetch('/api/admin/users', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: user.id, membershipDuration: v })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || '更新失败');
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.id === user.id
                                  ? { ...u, membershipExpiresAt: data?.data?.membershipExpiresAt || u.membershipExpiresAt }
                                  : u
                              )
                            );
                            setMessage('会员期限已更新');
                          } catch (err: any) {
                            setError(err.message || '更新失败');
                          } finally {
                            setUpdatingMembershipUserId(null);
                            e.target.value = '';
                          }
                        }}
                        disabled={updatingMembershipUserId === user.id}
                        className="px-2 py-1 rounded border border-ink/10 bg-white text-xs disabled:opacity-60"
                      >
                        <option value="">设置</option>
                        <option value="month">一个月</option>
                        <option value="quarter">一个季度</option>
                        <option value="year">一年</option>
                        <option value="millionYears">一百万年</option>
                        <option value="clear">清除</option>
                      </select>
                    </span>
                  </div>
                </div>
              ))}
              {!loading && users.length === 0 && (
                <div className="text-sm text-ink/50">暂无用户数据</div>
              )}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-ink/10 bg-white/80">
            <h2 className="text-base font-semibold mb-3">邀请码列表</h2>
            <div className="space-y-2">
              {codes.map((code) => (
                <div key={code.id} className="p-3 rounded-lg border border-ink/10 text-sm bg-white">
                  <div className="flex justify-between">
                    <span className="font-medium">{code.code}</span>
                    <span className="text-ink/50">{formatDate(code.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-ink/60 flex flex-wrap gap-4">
                    <span>状态：{code.isUsed ? '已使用' : '未使用'}</span>
                    <span>使用者：{code.usedBy || '-'}</span>
                  </div>
                </div>
              ))}
              {!loading && codes.length === 0 && (
                <div className="text-sm text-ink/50">暂无邀请码</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
