'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Copy, CreditCard, Crown } from 'lucide-react';

type UserLevel = 'PRO' | 'PRO_PLUS' | 'MAX' | 'PROMAX';
type BillingCycle = 'month' | 'quarter' | 'year';
type PlanId = 'PRO' | 'PRO_PLUS' | 'MAX';
type PurchaseMode = 'subscription' | 'token_pack';
type TokenPackId = 'PACK_100' | 'PACK_250' | 'PACK_500';

type MeData = {
  id: string;
  username: string;
  level: UserLevel;
  membershipExpiresAt: string | null;
  quota: {
    dailyTokensUsed: number;
    dailyTokenLimit: number;
    totalTokensUsed: number;
  } | null;
};

type MeResponse = { data: MeData } | { error: string };

const BILLING_CYCLES: Array<{ id: BillingCycle; label: string; months: number }> = [
  { id: 'month', label: '月付', months: 1 },
  { id: 'quarter', label: '季付', months: 3 },
  { id: 'year', label: '年付', months: 12 }
];

const PLANS: Array<{
  id: PlanId;
  name: string;
  priceMonthly: number;
  newbieFirstMonthPrice?: number;
  highlight?: boolean;
  tokenText: string;
  badge: string;
}> = [
  { id: 'PRO', name: 'PRO', priceMonthly: 19, newbieFirstMonthPrice: 9.9, tokenText: '100万 Token/月', badge: '入门' },
  { id: 'PRO_PLUS', name: 'PRO+', priceMonthly: 29, newbieFirstMonthPrice: 19.9, tokenText: '200万 Token/月', badge: '推荐', highlight: true },
  { id: 'MAX', name: 'MAX', priceMonthly: 59, newbieFirstMonthPrice: 39.9, tokenText: '500万 Token/月（≈无限）', badge: '功能定制' }
];

const TOKEN_PACKS: Array<{
  id: TokenPackId;
  name: string;
  tokenText: string;
  price: number;
  badge: string;
  highlight?: boolean;
}> = [
  { id: 'PACK_100', name: '100万 Token 包', tokenText: '100万 Token（一次性）', price: 10, badge: '入门' },
  { id: 'PACK_250', name: '250万 Token 包', tokenText: '250万 Token（一次性）', price: 20, badge: '推荐', highlight: true },
  { id: 'PACK_500', name: '500万 Token 包', tokenText: '500万 Token（一次性）', price: 30, badge: '大额' }
];

function formatYmd(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function CoffeePage() {
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>('subscription');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('month');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('PRO_PLUS');
  const [selectedTokenPackId, setSelectedTokenPackId] = useState<TokenPackId>('PACK_250');
  const [applyNewbieFirstMonth, setApplyNewbieFirstMonth] = useState(true);
  const [me, setMe] = useState<MeData | null>(null);
  const [meStatus, setMeStatus] = useState<'loading' | 'guest' | 'authed'>('loading');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          setMe(null);
          setMeStatus('guest');
          return;
        }
        const json = (await res.json()) as MeResponse;
        if ('data' in json && json.data) {
          setMe(json.data);
          setMeStatus('authed');
          return;
        }
        setMe(null);
        setMeStatus('guest');
      } catch {
        setMe(null);
        setMeStatus('guest');
      }
    };
    run();
  }, []);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[0];
  const selectedCycle = BILLING_CYCLES.find((c) => c.id === billingCycle) || BILLING_CYCLES[0];
  const selectedTokenPack = TOKEN_PACKS.find((p) => p.id === selectedTokenPackId) || TOKEN_PACKS[0];

  const effectiveMonthlyPrice =
    purchaseMode === 'subscription' && applyNewbieFirstMonth && billingCycle === 'month' && typeof selectedPlan.newbieFirstMonthPrice === 'number'
      ? selectedPlan.newbieFirstMonthPrice
      : selectedPlan.priceMonthly;

  const totalPrice =
    purchaseMode === 'subscription' ? effectiveMonthlyPrice * selectedCycle.months : selectedTokenPack.price;

  const orderNote = (() => {
    const usernamePart = me?.username ? `用户名：${me.username}` : '用户名：未登录';
    if (purchaseMode === 'token_pack') {
      return `${usernamePart}；类型：Token包；商品：${selectedTokenPack.name}；金额：${totalPrice}元`;
    }
    const promoPart = applyNewbieFirstMonth && billingCycle === 'month' ? '；新人首月优惠：是；赠送：MAX模式1个月' : '';
    return `${usernamePart}；类型：订阅；套餐：${selectedPlan.name}；周期：${selectedCycle.label}；金额：${totalPrice}元${promoPart}`;
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderNote);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      setCopyState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EC] p-4 font-serif relative">
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, #607476 1px, transparent 1px), radial-gradient(circle at 90% 80%, #607476 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10 py-10">
        <div className="bg-white rounded-2xl shadow-xl border border-ink/10 overflow-hidden">
          <div className="bg-rice-texture p-8 border-b border-ink/5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-daiqing/10 rounded-xl flex items-center justify-center text-daiqing">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-ink">会员订阅</h1>
                  <p className="text-sm text-gray-500 mt-1">选择套餐与付费周期，获得更高 Token 额度</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {meStatus === 'authed' && me ? (
                  <div className="text-xs text-gray-600 bg-white/70 border border-ink/10 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{me.username}</span>
                      <span className="text-gray-400">·</span>
                      <span>{me.level}</span>
                      {me.membershipExpiresAt ? (
                        <>
                          <span className="text-gray-400">·</span>
                          <span>到期 {formatYmd(me.membershipExpiresAt)}</span>
                        </>
                      ) : null}
                    </div>
                    {me.quota ? (
                      <div className="mt-1 text-[11px] text-gray-500">
                        今日已用 {me.quota.dailyTokensUsed}/{me.quota.dailyTokenLimit} · 总用量 {me.quota.totalTokensUsed}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-daiqing text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
                  >
                    去登录
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="flex flex-col items-center gap-3">
                <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-2xl p-1">
                  {([
                    { id: 'subscription', label: '订阅会员' },
                    { id: 'token_pack', label: 'Token 包' }
                  ] as const).map((m) => {
                    const active = m.id === purchaseMode;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPurchaseMode(m.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          active ? 'bg-white border border-ink/10 shadow-sm text-ink' : 'text-gray-500 hover:text-ink'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {purchaseMode === 'subscription' ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-2xl p-1">
                      {BILLING_CYCLES.map((c) => {
                        const active = c.id === billingCycle;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setBillingCycle(c.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                              active ? 'bg-white border border-ink/10 shadow-sm text-ink' : 'text-gray-500 hover:text-ink'
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setApplyNewbieFirstMonth((v) => !v)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                        applyNewbieFirstMonth ? 'bg-white border-daiqing/30 text-ink' : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                      title="新人首月优惠仅对月付生效，人工核验发放"
                    >
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          applyNewbieFirstMonth ? 'bg-daiqing border-daiqing text-white' : 'bg-white border-gray-300 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                      新人首月：{selectedPlan.newbieFirstMonthPrice ?? '—'} 元（送 MAX 模式 1 个月）
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {purchaseMode === 'subscription' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                {PLANS.map((plan) => {
                  const active = plan.id === selectedPlanId;
                  const showNewbie = applyNewbieFirstMonth && billingCycle === 'month' && typeof plan.newbieFirstMonthPrice === 'number';
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`text-left rounded-2xl border shadow-sm p-6 transition-all relative overflow-hidden ${
                        active
                          ? 'border-daiqing/40 ring-2 ring-daiqing/20 bg-[#FFFEFA]'
                          : 'border-ink/10 bg-white hover:border-daiqing/25 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="absolute inset-0 opacity-15 pointer-events-none bg-rice-texture" />
                      <div className="relative">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-ink">{plan.name}</span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                plan.highlight ? 'bg-daiqing text-white border-daiqing' : 'bg-white/70 text-gray-600 border-ink/10'
                              }`}
                            >
                              {plan.badge}
                            </span>
                            {showNewbie ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                                新人首月
                              </span>
                            ) : null}
                          </div>
                          {active ? <Check className="w-5 h-5 text-daiqing" /> : null}
                        </div>

                        <div className="mt-4 flex items-end gap-2">
                          <div className="flex items-end gap-1">
                            <span className="text-3xl font-extrabold text-ink">
                              {showNewbie ? plan.newbieFirstMonthPrice : plan.priceMonthly}
                            </span>
                            <span className="text-sm text-gray-500 pb-1">元/月</span>
                          </div>
                          {showNewbie ? (
                            <div className="pb-1 text-xs text-gray-400 line-through">{plan.priceMonthly} 元</div>
                          ) : null}
                        </div>

                        <div className="mt-4 text-sm text-gray-700 font-semibold">{plan.tokenText}</div>
                        <div className="mt-3 space-y-2 text-sm text-gray-600">
                          <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                            <span>付费周期可选：月付 / 季付 / 年付</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                            <span>新人首月（月付）：送 MAX 模式 1 个月</span>
                          </div>
                          {plan.id === 'MAX' ? (
                            <div className="flex items-start gap-2">
                              <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                              <span>支持功能定制（按需开通）</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                {TOKEN_PACKS.map((pack) => {
                  const active = pack.id === selectedTokenPackId;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => setSelectedTokenPackId(pack.id)}
                      className={`text-left rounded-2xl border shadow-sm p-6 transition-all relative overflow-hidden ${
                        active
                          ? 'border-daiqing/40 ring-2 ring-daiqing/20 bg-[#FFFEFA]'
                          : 'border-ink/10 bg-white hover:border-daiqing/25 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="absolute inset-0 opacity-15 pointer-events-none bg-rice-texture" />
                      <div className="relative">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-ink">{pack.name}</span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                pack.highlight ? 'bg-daiqing text-white border-daiqing' : 'bg-white/70 text-gray-600 border-ink/10'
                              }`}
                            >
                              {pack.badge}
                            </span>
                          </div>
                          {active ? <Check className="w-5 h-5 text-daiqing" /> : null}
                        </div>

                        <div className="mt-4 flex items-end gap-1">
                          <span className="text-3xl font-extrabold text-ink">{pack.price}</span>
                          <span className="text-sm text-gray-500 pb-1">元</span>
                        </div>

                        <div className="mt-4 text-sm text-gray-700 font-semibold">{pack.tokenText}</div>
                        <div className="mt-3 space-y-2 text-sm text-gray-600">
                          <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                            <span>一次性充值，适合临时补量</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                            <span>与订阅额度可叠加（人工处理）</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="rounded-2xl border border-ink/10 bg-gray-50 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <CreditCard className="w-4 h-4 text-ink/60" />
                  扫码支付
                </div>
                <div className="mt-4 flex items-center justify-center bg-white border border-ink/10 rounded-2xl p-4">
                  <img
                    src="/donate.png"
                    alt="支付二维码"
                    className="rounded-xl max-w-[95vw] max-h-[420px] w-auto h-auto object-contain"
                  />
                </div>

                <div className="mt-4 text-sm text-gray-700">
                  <div className="font-semibold text-ink">
                    {purchaseMode === 'subscription'
                      ? `本次选择：${selectedPlan.name} · ${selectedCycle.label} · 合计 ${totalPrice} 元`
                      : `本次选择：${selectedTokenPack.name} · 合计 ${totalPrice} 元`}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">支付时备注（建议复制粘贴）：</div>
                  <div className="mt-2 flex items-stretch gap-2">
                    <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 break-all">
                      {orderNote}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center justify-center gap-2 px-3 rounded-xl bg-daiqing text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
                    >
                      <Copy className="w-4 h-4" />
                      {copyState === 'copied' ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-white p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Check className="w-4 h-4 text-ink/60" />
                  套餐差异
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-gray-50 border border-ink/10 p-5">
                    <div className="text-xs text-gray-500">PRO</div>
                    <div className="mt-1 font-bold text-ink">100万 Token/月</div>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                        <span>MAX 专注模式：不支持</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                        <span>适合：轻度日更、短篇/中篇</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 border border-ink/10 p-5">
                    <div className="text-xs text-gray-500">PRO+</div>
                    <div className="mt-1 font-bold text-ink">200万 Token/月</div>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                        <span>MAX 专注模式：不支持</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                        <span>适合：中重度创作、更多迭代</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 border border-ink/10 p-5">
                    <div className="text-xs text-gray-500">MAX</div>
                    <div className="mt-1 font-bold text-ink">500万 Token/月（≈无限）</div>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                        <span>MAX 专注模式：支持</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                        <span>功能定制：支持（按需开通）</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-daiqing" />
                        <span>适合：高强度创作、长篇与批量</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-xs text-gray-500 leading-relaxed">
                  <div>说明：三档套餐主要差异在 Token 额度、MAX 专注模式与 MAX 功能定制。</div>
                  <div>付费周期（月/季/年）仅影响付费周期与合计金额展示；新人首月优惠仅对月付生效。</div>
                  <div>Token 包为一次性充值；订阅与 Token 包均按备注人工核验发放。</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
