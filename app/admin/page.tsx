'use client';

import { useEffect, useState } from 'react';
import { Shield, Users, KeyRound, RefreshCw, Plus, Edit2, Check, X, Trash2, Eye, EyeOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

type UserLevel = 'PRO' | 'PRO_PLUS' | 'MAX' | 'PROMAX';

type AdminUser = {
  id: string;
  username: string;
  level: UserLevel;
  membershipExpiresAt?: string | null;
  quota: {
    dailyTokensUsed: number;
    dailyTokenLimit: number;
    totalTokensUsed: number;
  };
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
  const [updatingQuotaUserId, setUpdatingQuotaUserId] = useState<string | null>(null);
  const [updatingMembershipUserId, setUpdatingMembershipUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
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
        let errMessage = '无权限访问';
        try {
            const errText = await (usersRes.ok ? codesRes.text() : usersRes.text());
            try {
                const errJson = JSON.parse(errText);
                errMessage = errJson.error || errJson.message || errMessage;
            } catch {
                errMessage = errText || errMessage;
            }
        } catch {}
        throw new Error(errMessage);
      }

      const usersJson = await usersRes.json();
      const codesJson = await codesRes.json();
      setUsers(usersJson.data || []);
      setCodes(codesJson.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // Load System Providers
    fetch('/api/admin/system-settings').then(res => {
      if (res.ok) return res.json();
      return {};
    }).then(data => {
      if (data.providers) {
        setProviders(data.providers);
      } else {
        // Init default if empty
        setProviders([{
          id: 'siliconflow',
          name: '硅基流动 (SiliconFlow)',
          baseUrl: 'https://api.siliconflow.cn/v1',
          apiKey: '',
          enabled: true,
          priceRatio: 1.0
        }]);
      }
    }).catch(() => {});
  }, []);

  const handleSaveProviders = async () => {
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers })
      });
      if (!res.ok) throw new Error('保存失败');
      setMessage('系统 API 配置已更新。');
    } catch (err: any) {
      setError(err.message || '保存失败');
    }
  };

  const updateProvider = (index: number, field: string, value: any) => {
    const newProviders = [...providers];
    newProviders[index] = { ...newProviders[index], [field]: value };
    setProviders(newProviders);
  };

  const addProvider = () => {
    setProviders([...providers, {
      id: 'custom',
      name: '自定义服务商',
      baseUrl: '',
      apiKey: '',
      enabled: true,
      priceRatio: 1.0
    }]);
  };

  const removeProvider = (index: number) => {
    if (confirm('确定删除此服务商配置吗？')) {
        const newProviders = [...providers];
        newProviders.splice(index, 1);
        setProviders(newProviders);
    }
  };

  const toggleKeyVisibility = (index: number) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(index)) {
      newVisible.delete(index);
    } else {
      newVisible.add(index);
    }
    setVisibleKeys(newVisible);
  };

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

  const handleQuotaUpdate = async (userId: string, field: 'dailyTokenLimit' | 'dailyTokensUsed', value: number) => {
    setUpdatingQuotaUserId(userId);
    try {
        const res = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId, 
                quota: { [field]: value }
            })
        });
        const data = await res.json();
        if (res.ok) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, quota: { ...u.quota, ...data?.data?.quota } } : u));
        } else {
            throw new Error(data.error || '更新失败');
        }
    } catch (e) {
        alert('更新配额失败');
    } finally {
        setUpdatingQuotaUserId(null);
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
              <Check className="w-4 h-4" />
              已使用
            </div>
            <div className="text-2xl font-semibold mt-2">{usedCount}</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-ink/10 bg-white/80 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-ink/60" />
              系统 API 池配置 (多服务商支持)
            </h2>
            <button 
              onClick={addProvider}
              className="text-xs bg-paper/50 hover:bg-paper px-2 py-1 rounded border border-ink/10 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 添加服务商
            </button>
          </div>
          
          <div className="space-y-3">
            {providers.map((p, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-2 items-center p-3 bg-paper/20 rounded-lg border border-ink/5">
                <div className="flex gap-2 items-center w-full md:w-auto">
                    <input 
                      value={p.name} 
                      onChange={e => updateProvider(idx, 'name', e.target.value)}
                      className="px-2 py-1.5 rounded border border-ink/10 text-xs bg-white w-24 md:w-32"
                      placeholder="名称"
                    />
                    <label className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full cursor-pointer transition-colors ${p.enabled ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                      <input 
                        type="checkbox" 
                        checked={p.enabled} 
                        onChange={e => updateProvider(idx, 'enabled', e.target.checked)}
                        className="hidden"
                      />
                      <span className={`w-2 h-2 rounded-full ${p.enabled ? 'bg-green-500' : 'bg-red-400'}`}></span>
                      {p.enabled ? '已启用' : '已禁用'}
                    </label>
                </div>

                <div className="flex-1 flex gap-2 w-full md:w-auto items-center">
                    <span className="text-xs text-ink/40 shrink-0">→</span>
                    <select 
                      value={p.id} 
                      onChange={e => updateProvider(idx, 'id', e.target.value)}
                      className="px-2 py-1.5 rounded border border-ink/10 text-xs bg-white w-28 shrink-0"
                    >
                      <option value="siliconflow">硅基流动</option>
                      <option value="openai">OpenAI</option>
                      <option value="vectorengine">向量引擎</option>
                      <option value="alibaba">阿里百炼</option>
                      <option value="iflow">心流 API</option>
                      <option value="custom">自定义</option>
                    </select>
                    
                    <span className="text-xs text-ink/40 shrink-0">→</span>
                    
                    <div className="flex-1 relative">
                        <input 
                          type={visibleKeys.has(idx) ? "text" : "password"}
                          value={p.apiKey} 
                          onChange={e => updateProvider(idx, 'apiKey', e.target.value)}
                          className="w-full px-2 py-1.5 pr-8 rounded border border-ink/10 text-xs bg-white font-mono"
                          placeholder="sk-..."
                        />
                        <button 
                            onClick={() => toggleKeyVisibility(idx)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60"
                        >
                            {visibleKeys.has(idx) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <input 
                          value={p.baseUrl} 
                          onChange={e => updateProvider(idx, 'baseUrl', e.target.value)}
                          className="hidden md:block px-2 py-1.5 rounded border border-ink/10 text-xs bg-white w-48 font-mono text-ink/50"
                          placeholder="Base URL"
                        />
                    </div>
                    
                    <div className="flex items-center gap-1" title="价格倍率: 100 Token * 倍率 = 实际扣除额度">
                        <span className="text-xs text-ink/40">×</span>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          value={p.priceRatio || 1} 
                          onChange={e => updateProvider(idx, 'priceRatio', parseFloat(e.target.value))}
                          className="px-1 py-1.5 rounded border border-ink/10 text-xs bg-white w-14 text-center"
                          placeholder="倍率"
                        />
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <button 
                      onClick={() => removeProvider(idx)}
                      className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded text-xs border border-red-100 bg-white"
                    >
                      删除
                    </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleSaveProviders} 
              className="px-4 py-2 bg-daiqing text-white rounded-lg text-sm hover:bg-daiqing/90"
            >
              保存所有配置
            </button>
          </div>
          <p className="text-xs text-ink/40 mt-2">
            * 系统会根据用户选择的模型自动匹配启用的服务商。若无匹配则使用默认(列表第一个)。
          </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <div className="p-5 rounded-xl border border-ink/10 bg-white/80 overflow-x-auto">
            <h2 className="text-base font-semibold mb-3">用户列表</h2>
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-ink/60 border-b border-ink/10">
                <tr>
                  <th className="py-2 px-3 font-medium">名称</th>
                  <th className="py-2 px-3 font-medium">等级</th>
                  <th className="py-2 px-3 font-medium">额度 (已用/上限)</th>
                  <th className="py-2 px-3 font-medium">期限</th>
                  <th className="py-2 px-3 font-medium">信息</th>
                  <th className="py-2 px-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-paper/30 transition-colors">
                    <td className="py-3 px-3 align-top">
                        {editingUserId === user.id ? (
                            <div className="flex items-center gap-1">
                                <input
                                    value={editingUsername}
                                    onChange={(e) => setEditingUsername(e.target.value)}
                                    className="px-2 py-1 rounded border border-ink/10 bg-white text-xs w-24"
                                />
                                <button onClick={() => handleUsernameSave(user.id)} className="text-green-600"><Check className="w-3 h-3"/></button>
                                <button onClick={cancelEditUsername} className="text-red-500"><X className="w-3 h-3"/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 font-medium">
                                {user.username}
                                <button onClick={() => startEditUsername(user)} className="text-ink/40 hover:text-daiqing"><Edit2 className="w-3 h-3"/></button>
                            </div>
                        )}
                        <div className="text-[10px] text-ink/40 mt-1">{formatDate(user.createdAt)}</div>
                    </td>
                    <td className="py-3 px-3 align-top">
                        <select
                            value={user.level}
                            onChange={(e) => handleLevelChange(user.id, e.target.value as UserLevel)}
                            className="px-2 py-1 rounded border border-ink/10 bg-white text-xs"
                        >
                            {levelOptions.map((level) => (
                                <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                        </select>
                    </td>
                    <td className="py-3 px-3 align-top">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1 text-xs">
                                <input 
                                    type="number"
                                    className="w-16 px-1 py-0.5 rounded border border-ink/10 bg-white text-right font-mono"
                                    defaultValue={user.quota?.dailyTokensUsed || 0}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val !== user.quota?.dailyTokensUsed) {
                                            handleQuotaUpdate(user.id, 'dailyTokensUsed', val);
                                        }
                                    }}
                                    disabled={updatingQuotaUserId === user.id}
                                    title="今日已用 Token"
                                />
                                <span className="text-ink/40">/</span>
                                <input 
                                    type="number"
                                    className="w-20 px-1 py-0.5 rounded border border-ink/10 bg-white font-mono"
                                    defaultValue={user.quota?.dailyTokenLimit || 0}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val !== user.quota?.dailyTokenLimit) {
                                            handleQuotaUpdate(user.id, 'dailyTokenLimit', val);
                                        }
                                    }}
                                    disabled={updatingQuotaUserId === user.id}
                                    title="今日额度上限 (-1 为无限)"
                                />
                            </div>
                            
                            {/* Quota Progress Bar */}
                            <div className="w-full h-1.5 bg-paper/50 rounded-full overflow-hidden border border-ink/5">
                                {user.level === 'PROMAX' || user.quota?.dailyTokenLimit === -1 ? (
                                     <div className="h-full w-full bg-gradient-to-r from-purple-400 to-daiqing animate-pulse"></div>
                                 ) : (
                                    <div 
                                        className={`h-full transition-all duration-500 ${
                                            (user.quota?.dailyTokensUsed / user.quota?.dailyTokenLimit) > 0.9 ? 'bg-red-500' : 
                                            (user.quota?.dailyTokensUsed / user.quota?.dailyTokenLimit) > 0.7 ? 'bg-orange-400' : 'bg-green-500'
                                        }`}
                                        style={{ 
                                            width: `${Math.min(((user.quota?.dailyTokensUsed || 0) / (user.quota?.dailyTokenLimit || 1)) * 100, 100)}%` 
                                        }}
                                    ></div>
                                )}
                            </div>
                            
                            <div className="flex justify-between text-[10px] text-ink/40">
                                <span>{user.level === 'PROMAX' || user.quota?.dailyTokenLimit === -1 ? '无限额度' : `${Math.round(Math.min(((user.quota?.dailyTokensUsed || 0) / (user.quota?.dailyTokenLimit || 1)) * 100, 100))}%`}</span>
                                <span>总: {user.quota?.totalTokensUsed?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs">{formatExpiryDate(user.membershipExpiresAt || null)}</span>
                            <select
                                defaultValue=""
                                onChange={async (e) => {
                                    const v = e.target.value;
                                    if (!v) return;
                                    setUpdatingMembershipUserId(user.id);
                                    try {
                                        const res = await fetch('/api/admin/users', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ userId: user.id, membershipDuration: v })
                                        });
                                        const data = await res.json();
                                        if (res.ok) {
                                            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, membershipExpiresAt: data?.data?.membershipExpiresAt } : u));
                                            setMessage('期限已更新');
                                        }
                                    } catch {}
                                    e.target.value = '';
                                    setUpdatingMembershipUserId(null);
                                }}
                                disabled={updatingMembershipUserId === user.id}
                                className="px-1 py-0.5 rounded border border-ink/10 bg-white text-[10px] w-20"
                            >
                                <option value="">续期...</option>
                                <option value="month">1个月</option>
                                <option value="quarter">1季度</option>
                                <option value="year">1年</option>
                                <option value="millionYears">永久</option>
                                <option value="clear">清除</option>
                            </select>
                        </div>
                    </td>
                    <td className="py-3 px-3 align-top text-xs text-ink/60 space-y-1">
                        <div>邀请码: {user.inviteCode || '-'}</div>
                        <div>备份数: {user.backupCount}</div>
                    </td>
                    <td className="py-3 px-3 align-top text-right">
                        <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingUserId === user.id}
                            className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs border border-red-100"
                        >
                            删除
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && users.length === 0 && <div className="text-center py-10 text-ink/40 text-sm">暂无用户数据</div>}
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
