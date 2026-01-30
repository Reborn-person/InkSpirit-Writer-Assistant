import { type ReactNode } from 'react';
import { Heart } from 'lucide-react';
import styles from './FlipCard.module.css';

type FlipCardProps = {
  accent?: string;
  badge: string;
  title: string;
  cardNo?: string;
  subtitle?: string;
  tags?: string[];
  frontTitle?: string;
  frontMeta?: string;
  frontBody?: string;
  frontFooter?: string;
  backTitle?: string;
  backBody?: string;
  backFooter?: string;
  isLiked?: boolean;
  onLike?: () => void;
  action?: {
    title: string;
    icon: ReactNode;
    onClick: () => void;
  };
  secondaryAction?: {
    title: string;
    icon: ReactNode;
    onClick: () => void;
  };
  extraAction?: {
    title: string;
    icon: ReactNode;
    onClick: () => void;
  };
};

export function FlipCard({
  accent,
  badge,
  title,
  cardNo,
  subtitle,
  tags,
  frontTitle,
  frontMeta,
  frontBody,
  frontFooter,
  backTitle,
  backBody,
  backFooter,
  isLiked,
  onLike,
  action,
  secondaryAction,
  extraAction
}: FlipCardProps) {
  const normalizedType = (badge || '').trim();

  const typeColor = (type: string): { accent: string; frame: string } => {
    const t = type.toLowerCase();
    if (/(世界观|设定|规则|法则)/.test(type)) return { accent: '#2563eb', frame: '#1d4ed8' };
    if (/(情节|剧情|桥段|事件|冲突)/.test(type)) return { accent: '#f59e0b', frame: '#b45309' };
    if (/(场景|环境|地点|空间|氛围)/.test(type)) return { accent: '#14b8a6', frame: '#0f766e' };
    if (/(核心词汇|关键词|词汇)/.test(type)) return { accent: '#eab308', frame: '#a16207' };
    if (/(句式卡|句式|句法)/.test(type)) return { accent: '#06b6d4', frame: '#0891b2' };
    if (/(修辞手法|修辞|比喻|拟人|排比|反复|对偶)/.test(type)) return { accent: '#22c55e', frame: '#15803d' };
    if (/(感官描写|感官|视觉|听觉|触觉|嗅觉|味觉|动觉)/.test(type)) return { accent: '#ec4899', frame: '#be185d' };
    if (/(spell|magic|咒语|法术|技巧|技法|方法|策略)/.test(t)) return { accent: '#3fae55', frame: '#2f8a43' };
    if (/(trap|陷阱|雷区|禁忌|误区|反例)/.test(t)) return { accent: '#8b4bd6', frame: '#6f37b3' };
    if (/(ritual|仪式)/.test(t)) return { accent: '#3b82f6', frame: '#2563eb' };
    if (/(fusion|融合)/.test(t)) return { accent: '#b45309', frame: '#92400e' };
    if (/(synchro|同调)/.test(t)) return { accent: '#e5e7eb', frame: '#9ca3af' };
    if (/(xyz|超量)/.test(t)) return { accent: '#111827', frame: '#374151' };
    if (/(link|连接)/.test(t)) return { accent: '#1d4ed8', frame: '#1e40af' };
    return { accent: '#f59e0b', frame: '#b45309' };
  };

  const colors = accent ? { accent, frame: accent } : typeColor(normalizedType);

  const formatCardNo = (raw?: string) => {
    if (!raw) return '';
    const compact = String(raw).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!compact) return '';
    const tail = compact.slice(-8);
    return `NO.${tail}`;
  };

  const displayNo = formatCardNo(cardNo);

  return (
    <div
      className={styles.card}
      style={
        ({
          ['--accent' as any]: colors.accent,
          ['--frame' as any]: colors.frame,
        } as any)
      }
    >
      <div className={styles.content}>
        <div className={styles.back}>
          <div className={styles.backContent}>
            <div className={styles.headerRow}>
              <div className={styles.badge} title={badge}>
                {badge}
              </div>
              {displayNo && <div className={styles.cardNo}>{displayNo}</div>}
            </div>
            <div className={styles.backTitle} title={backTitle || title}>
              {backTitle || title}
            </div>
            {backBody && (
              <div className={styles.backText}>
                <div className={styles.sectionLabel}>原文</div>
                <div className={styles.sectionBody} title={backBody}>
                  {backBody}
                </div>
              </div>
            )}
            {backFooter && <div className={styles.backFooter}>{backFooter}</div>}
            {tags && tags.length > 0 && (
              <div className={styles.tagRow}>
                {tags.slice(0, 4).map((t) => (
                  <span key={t} className={styles.tag} title={t}>
                    #{t}
                  </span>
                ))}
                {tags.length > 4 && <span className={styles.tag}>+{tags.length - 4}</span>}
              </div>
            )}
          </div>
        </div>

        <div className={styles.front}>
          <div className={styles.frontContent}>
            <div className={styles.headerRow}>
              <div className={styles.badge} title={badge}>
                {badge}
              </div>
              <div className={styles.headerActions}>
                {displayNo && <div className={styles.cardNo}>{displayNo}</div>}
                {onLike && (
                  <button
                    type="button"
                    className={`${styles.action} ${isLiked ? styles.liked : ''}`}
                    title={isLiked ? "取消收藏" : "收藏"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onLike();
                    }}
                    style={isLiked ? { background: '#ff4d4f', borderColor: '#ff4d4f' } : undefined}
                  >
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                  </button>
                )}
                {extraAction && (
                  <button
                    type="button"
                    className={styles.action}
                    title={extraAction.title}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      extraAction.onClick();
                    }}
                  >
                    {extraAction.icon}
                  </button>
                )}
                {secondaryAction && (
                  <button
                    type="button"
                    className={styles.action}
                    title={secondaryAction.title}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      secondaryAction.onClick();
                    }}
                  >
                    {secondaryAction.icon}
                  </button>
                )}
                {action && (
                  <button
                    type="button"
                    className={styles.action}
                    title={action.title}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    {action.icon}
                  </button>
                )}
              </div>
            </div>

            <div className={styles.description}>
              <div className={styles.title}>
                <div className={styles.titleText} title={frontTitle || title}>
                  {frontTitle || title}
                </div>
                {frontMeta && <div className={styles.meta}>{frontMeta}</div>}
              </div>
              {frontBody && (
                <div className={styles.body}>
                  <div className={styles.sectionLabel}>效果</div>
                  <div className={styles.sectionBody} title={frontBody}>
                    {frontBody}
                  </div>
                </div>
              )}
              {frontFooter && <div className={styles.footer}>{frontFooter}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
