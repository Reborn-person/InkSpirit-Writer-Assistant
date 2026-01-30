import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rice-paper text-ink px-6">
      <div className="max-w-md w-full rounded-2xl border border-ink/10 bg-white/70 p-8 text-center">
        <div className="text-4xl font-bold tracking-tight">404</div>
        <div className="mt-2 text-sm text-ink/60">页面不存在或已被移动</div>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-daiqing px-4 py-2 text-sm text-white hover:bg-daiqing/90"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
