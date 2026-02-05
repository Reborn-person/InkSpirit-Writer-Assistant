'use client';

import { useState, useEffect } from 'react';
import { X, Cloud, Upload, Download, LogOut, Loader2 } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

interface CloudSyncModalProps {
  onClose: () => void;
}

export default function CloudSyncModal({ onClose }: CloudSyncModalProps) {
  const [view, setView] = useState<'login' | 'register' | 'sync'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState<string | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Check login status on mount
  useEffect(() => {
    // We can check if cookie exists or just try to fetch backup status
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        const storedUser = StorageManager.get(STORAGE_KEYS.USER_NAME) || '';
        setUser(storedUser);
        if (data.updatedAt) {
            setLastBackupTime(new Date(data.updatedAt).toLocaleString());
        }
        setView('sync');
      } else if (res.status === 401) {
        setView('login');
      }
    } catch (e) {
      // ignore
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('注册成功，请登录');
      setView('login');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      StorageManager.set(STORAGE_KEYS.USER_NAME, data.username || username);
      setUser(data.username);
      setView('sync');
      checkStatus(); // Refresh backup info
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      const data = StorageManager.exportProject();
      if (!data) throw new Error('No data to export');

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      setMsg('备份上传成功！');
      checkStatus();
    } catch (e: any) {
      setMsg('上传失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!confirm('警告：云端数据将覆盖本地所有数据！建议先本地导出备份。确定继续吗？')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/backup');
      const json = await res.json();
      
      if (!json.data) throw new Error('云端无数据');
      
      const success = StorageManager.importProject(json.data);
      if (success) {
          setMsg('数据恢复成功！请刷新页面。');
          setTimeout(() => window.location.reload(), 1500);
      } else {
          throw new Error('导入失败，数据格式可能损坏');
      }
    } catch (e: any) {
      setMsg('恢复失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
      // Just clear cookie? Need an API to clear cookie.
      // For now just reload page or clear local state, but cookie persists.
      // I'll assume cookie is cleared if I implement /api/auth/logout, but I didn't.
      // I'll add a simple logout via clearing state and maybe a dummy request.
      // Actually, since I can't clear httpOnly cookie from client, I MUST have an API.
      // I'll implement logout API quickly.
      await fetch('/api/auth/logout', { method: 'POST' });
      StorageManager.remove(STORAGE_KEYS.USER_NAME);
      setView('login');
      setUser(null);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2 text-daiqing font-bold">
            <Cloud className="w-5 h-5" />
            <span>云端同步</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {view === 'sync' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">当前用户: {user}</span>
                <button onClick={handleLogout} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                    <LogOut className="w-3 h-3" /> 退出
                </button>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                <p className="font-bold mb-1">上次备份时间：</p>
                <p>{lastBackupTime || '暂无云端备份'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                    onClick={handleUpload}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-daiqing hover:bg-daiqing/5 transition-all group"
                >
                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-daiqing transition-colors" />
                    <span className="font-medium text-gray-600 group-hover:text-daiqing">上传本地数据</span>
                    <span className="text-xs text-gray-400">覆盖云端</span>
                </button>

                <button 
                    onClick={handleDownload}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-cinnabar hover:bg-cinnabar/5 transition-all group"
                >
                    <Download className="w-8 h-8 text-gray-400 group-hover:text-cinnabar transition-colors" />
                    <span className="font-medium text-gray-600 group-hover:text-cinnabar">下载云端数据</span>
                    <span className="text-xs text-gray-400">覆盖本地</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center text-gray-800 mb-6">
                  {view === 'login' ? '登录账号' : '注册账号'}
              </h2>
              
              <div className="space-y-3">
                <input 
                    type="text" 
                    placeholder="用户名" 
                    className="w-full p-3 rounded-lg border border-gray-200 focus:border-daiqing focus:ring-1 focus:ring-daiqing outline-none transition-all"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <input 
                    type="password" 
                    placeholder="密码" 
                    className="w-full p-3 rounded-lg border border-gray-200 focus:border-daiqing focus:ring-1 focus:ring-daiqing outline-none transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                {view === 'register' && (
                    <input 
                        type="text" 
                        placeholder="邀请码 (必填)" 
                        className="w-full p-3 rounded-lg border border-gray-200 focus:border-daiqing focus:ring-1 focus:ring-daiqing outline-none transition-all"
                        value={inviteCode}
                        onChange={e => setInviteCode(e.target.value)}
                    />
                )}
              </div>

              <button 
                onClick={view === 'login' ? handleLogin : handleRegister}
                disabled={loading}
                className="w-full py-3 bg-daiqing hover:bg-daiqing/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {view === 'login' ? '登录' : '注册'}
              </button>

              <div className="text-center text-sm text-gray-500 mt-4">
                  {view === 'login' ? (
                      <>没有账号？ <button onClick={() => setView('register')} className="text-daiqing hover:underline">使用邀请码注册</button></>
                  ) : (
                      <>已有账号？ <button onClick={() => setView('login')} className="text-daiqing hover:underline">直接登录</button></>
                  )}
              </div>
            </div>
          )}

          {msg && (
              <div className={`mt-4 p-3 rounded-lg text-sm text-center ${msg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {msg}
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
