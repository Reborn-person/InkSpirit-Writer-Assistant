'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User, Lock, ArrowRight, BookOpen } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { username, password }
        : { username, password, inviteCode };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '操作失败');
      }

      if (isLogin) {
        StorageManager.set(STORAGE_KEYS.USER_NAME, data.username || username);
        router.push('/');
        router.refresh();
      } else {
        // Register success, switch to login
        setIsLogin(true);
        setError('注册成功，请登录');
        setPassword('');
        setInviteCode('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center p-4 font-serif">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{
                 backgroundImage: 'radial-gradient(circle at 10% 20%, #607476 1px, transparent 1px), radial-gradient(circle at 90% 80%, #607476 1px, transparent 1px)',
                 backgroundSize: '40px 40px'
             }}>
        </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-ink/10 overflow-hidden relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="bg-rice-texture p-8 text-center border-b border-ink/5">
            <div className="w-16 h-16 bg-daiqing/10 rounded-full flex items-center justify-center mx-auto mb-4 text-daiqing">
                <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-1">墨灵写作助手</h1>
            <p className="text-gray-500 text-sm">
                {isLogin ? '欢迎回来，请登录您的账号' : '创建新账号开启创作之旅'}
            </p>
        </div>

        {/* Form */}
        <div className="p-8 pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className={`p-3 rounded-lg text-sm text-center ${error.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">用户名</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            required
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-daiqing focus:ring-1 focus:ring-daiqing outline-none transition-all"
                            placeholder="请输入用户名"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">密码</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="password" 
                            required
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-daiqing focus:ring-1 focus:ring-daiqing outline-none transition-all"
                            placeholder="请输入密码"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {!isLogin && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">邀请码</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 font-bold text-xs border border-gray-400 rounded w-5 h-5">#</div>
                            <input 
                                type="text" 
                                required
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-daiqing focus:ring-1 focus:ring-daiqing outline-none transition-all"
                                placeholder="请输入邀请码"
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-daiqing hover:bg-[#4a5a5c] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-daiqing/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            {isLogin ? '登录' : '注册'}
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                    }}
                    className="text-sm text-gray-500 hover:text-daiqing transition-colors font-medium"
                >
                    {isLogin ? '还没有账号？ 使用邀请码注册' : '已有账号？ 直接登录'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
