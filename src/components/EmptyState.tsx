import { Link } from 'react-router-dom';
import '@/styles/listing.css';

interface Props {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaTo?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export default function EmptyState({ title, body, ctaLabel, ctaTo, onAction, actionLabel }: Props) {
  return (
    <div className="empty">
      <svg viewBox="0 0 120 120" className="empty__art" aria-hidden>
        <circle cx="60" cy="60" r="52" fill="var(--bg-muted)" />
        <path
          d="M38 46h44l-4 44H42Z"
          fill="none"
          stroke="var(--c-ink-400)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M50 52v-8a10 10 0 0 1 20 0v8"
          fill="none"
          stroke="var(--c-ink-400)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <h2 className="empty__title">{title}</h2>
      <p className="empty__body">{body}</p>
      <div className="empty__actions">
        {actionLabel && onAction && (
          <button type="button" className="btn btn--outline btn--sm" onClick={onAction}>
            {actionLabel}
          </button>
        )}
        {ctaLabel && ctaTo && (
          <Link to={ctaTo} className="btn btn--primary btn--sm">
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
